import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Fetch shifts for a date range
export async function GET(request: Request) {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get('start') || new Date().toISOString().split('T')[0]
    const endDate = searchParams.get('end') || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch shifts with user profile info
    const { data, error } = await supabase
        .from('shifts')
        .select(`
            *,
            user:user_id (id, email, role, restaurant_name)
        `)
        .gte('start_time', startDate)
        .lte('start_time', endDate + 'T23:59:59')
        .order('start_time', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ shifts: data })
}

// POST - Create a new shift
export async function POST(request: Request) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { user_id, start_time, end_time } = body

    // Get current user's role
    const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    // Get target user's role (the person being scheduled)
    const { data: targetProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user_id)
        .single()

    // Permission Check
    const isAdmin = currentProfile?.role === 'admin'
    const isChef = currentProfile?.role === 'chef'
    const targetIsKitchen = targetProfile?.role === 'chef'

    if (!isAdmin && !(isChef && targetIsKitchen)) {
        return NextResponse.json({ error: 'You can only schedule staff in your department' }, { status: 403 })
    }

    const { data, error } = await supabase
        .from('shifts')
        .insert({
            user_id,
            start_time,
            end_time,
            created_by: user.id
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ shift: data })
}

// DELETE - Remove a shift
export async function DELETE(request: Request) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const shiftId = searchParams.get('id')

    if (!shiftId) return NextResponse.json({ error: 'Shift ID required' }, { status: 400 })

    // Get current user's role for permission check
    const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    // Get the shift to check who it belongs to
    const { data: shift } = await supabase
        .from('shifts')
        .select('user_id')
        .eq('id', shiftId)
        .single()

    if (!shift) return NextResponse.json({ error: 'Shift not found' }, { status: 404 })

    // Get target user's role
    const { data: targetProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', shift.user_id)
        .single()

    const isAdmin = currentProfile?.role === 'admin'
    const isChef = currentProfile?.role === 'chef'
    const targetIsKitchen = targetProfile?.role === 'chef'

    if (!isAdmin && !(isChef && targetIsKitchen)) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', shiftId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
}
