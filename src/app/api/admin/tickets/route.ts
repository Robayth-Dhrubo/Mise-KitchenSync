import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// GET - Fetch all tickets (Admin only)
export async function GET() {
    const cookieStore = await cookies()

    // 1. Check Auth (Admin Only)
    const supabase = createServerClient(
        'http://127.0.0.1:54321', // process.env.NEXT_PUBLIC_SUPABASE_URL!
        'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH', // process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } }
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: currentProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!['admin', 'chef', 'foh'].includes(currentProfile?.role || '')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Fetch Tickets with Service Role (to get join data easily)
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({ error: 'Config missing' }, { status: 500 })
    }

    const serviceClient = createClient(
        'http://127.0.0.1:54321', // process.env.NEXT_PUBLIC_SUPABASE_URL!
        'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz' // process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch tickets and JOIN with profiles to get creator names
    const { data, error } = await serviceClient
        .from('it_tickets')
        .select(`
            *,
            creator:created_by (email, role),
            assignee:assigned_to (email)
        `)
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ tickets: data })
}

// POST - Create a new ticket (Internal use or direct admin creation)
export async function POST(request: Request) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } }
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    // Anyone auth'd can create, but let's stick to using the RLS or client here.
    // Since we are in an admin route file, we might assume admin creation,
    // but typically creation happens from client. 
    // I'll add this just in case Admin adds a ticket manually.

    const { data, error } = await supabase
        .from('it_tickets')
        .insert({
            ...body,
            created_by: user.id
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ticket: data })
}

// PATCH - Update ticket (Status, Priority, Assignee)
export async function PATCH(request: Request) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } }
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: currentProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (currentProfile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { id, ...updates } = body

    const { error } = await supabase
        .from('it_tickets')
        .update(updates)
        .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
