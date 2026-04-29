import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseConfig } from './config'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        supabaseConfig.url,
        supabaseConfig.anonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Authenticate user
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protected Routes Logic
    if (user) {
        // Fetch profile once for Role-Based Access Control
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        // 0. PENDING APPROVAL CHECK
        // If user is pending, they are LOCKED to the approval page
        if (profile?.role === 'pending') {
            if (request.nextUrl.pathname !== '/approval-pending') {
                const url = request.nextUrl.clone()
                url.pathname = '/approval-pending'
                return NextResponse.redirect(url)
            }
            return supabaseResponse // ALLOW access to approval page
        }

        // 1. Redirect logged-in users away from auth logic
        if (request.nextUrl.pathname === '/approval-pending') {
            const url = request.nextUrl.clone()
            url.pathname = '/' // Redirect valid users straight to the OS desktop entry
            return NextResponse.redirect(url)
        }

        // 2. ADMIN ROUTES - Only admin role can access
        if (request.nextUrl.pathname.startsWith('/admin')) {
            if (profile?.role !== 'admin') {
                const url = request.nextUrl.clone()
                url.pathname = '/dashboard'
                return NextResponse.redirect(url)
            }
        }

        // 3. CHEF ROUTES - Chef and Admin can access
        if (request.nextUrl.pathname.startsWith('/kitchen-manager') ||
            request.nextUrl.pathname.startsWith('/analytics') ||
            request.nextUrl.pathname.startsWith('/pantry') ||
            request.nextUrl.pathname.startsWith('/weekly-schedule') ||
            request.nextUrl.pathname.startsWith('/settings')) {

            // STRICT: Front of House (FOH) users are BANNED from chef/admin routes
            if (profile?.role === 'foh') {
                const url = request.nextUrl.clone()
                url.pathname = '/dashboard' // Redirect to dashboard
                return NextResponse.redirect(url)
            }
        }
    } else {
        // Not Logged In
        // Protect all authenticated routes
        const protectedPaths = ['/dashboard', '/pos', '/kitchen-manager', '/analytics', '/menu', '/settings', '/admin', '/inventory', '/weekly-schedule', '/service-desk', '/smart-order', '/finance', '/recipes', '/integrations']
        const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

        if (isProtected) {
            /* 
             * TEMPORARY BYPASS: Auth guard disabled to allow testing UI without database running
             */
             
            // const url = request.nextUrl.clone()
            // if (request.nextUrl.searchParams.get('os_iframe') === 'true') {
            //     url.pathname = '/os/session-expired'
            // } else {
            //     url.pathname = '/'
            // }
            // return NextResponse.redirect(url)
        }
    }

    // 4. LEGACY REDIRECTS - Smooth transition for old links
    const legacyMap: Record<string, string> = {
        '/front-desk': '/dashboard',
        '/procurement': '/inventory',
        '/reports': '/analytics',
        '/service-log': '/kitchen-manager',
        '/schedule': '/weekly-schedule',
    }

    const legacyPath = Object.keys(legacyMap).find(path => request.nextUrl.pathname.startsWith(path))
    if (legacyPath) {
        const url = request.nextUrl.clone()
        url.pathname = legacyMap[legacyPath]
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
