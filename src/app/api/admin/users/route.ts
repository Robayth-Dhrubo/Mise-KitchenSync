import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// GET - Fetch all users with profiles
// GET - Fetch all users with profiles & auth status
export async function GET() {
    const cookieStore = await cookies()

    // 1. Check if user is admin using RLS/Middleware protection
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

    if (!['admin', 'chef', 'foh'].includes(currentProfile?.role || '')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Check for Service Role Key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({
            error: 'Database config missing. Please add SUPABASE_SERVICE_ROLE_KEY to .env.local'
        }, { status: 500 })
    }

    // 3. Use service role to get Auth Users (for email status) AND Profiles
    const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch Auth Users (gives us email_confirmed_at)
    const { data: { users: authUsers }, error: authError } = await serviceClient.auth.admin.listUsers({
        perPage: 1000
    })

    if (authError) {
        return NextResponse.json({ error: 'Auth Error: ' + authError.message }, { status: 500 })
    }

    // Fetch Profiles (gives us roles)
    const { data: profiles, error: dbError } = await serviceClient
        .from('profiles')
        .select('id, role, restaurant_name, created_at')

    if (dbError) {
        return NextResponse.json({ error: 'DB Error: ' + dbError.message }, { status: 500 })
    }

    // 4. Merge Data
    const combinedUsers = authUsers.map(authUser => {
        const profile = profiles?.find(p => p.id === authUser.id)
        return {
            id: authUser.id,
            email: authUser.email,
            email_confirmed_at: authUser.email_confirmed_at,
            last_sign_in_at: authUser.last_sign_in_at,
            role: profile?.role || 'foh', // Fallback role
            restaurant_name: profile?.restaurant_name,
            created_at: authUser.created_at
        }
    })

    // Sort by created most recent
    combinedUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({ users: combinedUsers })
}

// PATCH - Update user role OR confirm email
export async function PATCH(request: Request) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } }
        }
    )

    // Admin Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: currentProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (currentProfile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({ error: 'Missing Service Role Key' }, { status: 500 })
    }

    const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()
    const { userId, action, value } = body

    try {
        if (action === 'update_role') {
            // Update Role in DB
            const { error } = await serviceClient
                .from('profiles')
                .update({ role: value })
                .eq('id', userId)
            if (error) throw error

            return NextResponse.json({ success: true, message: 'Role updated' })
        }

        else if (action === 'confirm_email') {
            // Manually confirm email via Auth Admin
            const { error } = await serviceClient.auth.admin.updateUserById(
                userId,
                { email_confirm: true }
            )
            if (error) throw error

            return NextResponse.json({ success: true, message: 'User confirmed' })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
