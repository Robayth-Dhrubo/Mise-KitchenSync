import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// POST - Bulk invite users
export async function POST(request: Request) {
    const cookieStore = await cookies()

    // Check if user is admin
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll() { },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (currentProfile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { emails, role = 'foh' } = body

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return NextResponse.json({ error: 'No emails provided' }, { status: 400 })
    }

    if (!['foh', 'chef', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Use service role client for admin operations
    const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    const results: { email: string; success: boolean; error?: string }[] = []

    for (const email of emails) {
        const trimmedEmail = email.trim().toLowerCase()
        if (!trimmedEmail || !trimmedEmail.includes('@')) {
            results.push({ email: trimmedEmail, success: false, error: 'Invalid email' })
            continue
        }

        try {
            // Create auth user with a temporary password (they'll reset it)
            const tempPassword = crypto.randomUUID()
            const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
                email: trimmedEmail,
                password: tempPassword,
                email_confirm: true, // Auto-confirm email
            })

            if (authError) {
                // User might already exist
                results.push({ email: trimmedEmail, success: false, error: authError.message })
                continue
            }

            // Create/update profile with role
            if (authData.user) {
                const { error: profileError } = await serviceClient
                    .from('profiles')
                    .upsert({
                        id: authData.user.id,
                        email: trimmedEmail,
                        role: role,
                    })

                if (profileError) {
                    results.push({ email: trimmedEmail, success: false, error: profileError.message })
                    continue
                }

                // Send password reset email so they can set their own password
                await serviceClient.auth.admin.generateLink({
                    type: 'recovery',
                    email: trimmedEmail,
                })

                results.push({ email: trimmedEmail, success: true })
            }
        } catch (err: any) {
            results.push({ email: trimmedEmail, success: false, error: err.message || 'Unknown error' })
        }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
        message: `Invited ${successCount} users. ${failCount} failed.`,
        results
    })
}
