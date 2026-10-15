import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
    if (['/product','/demo','/privacy','/terms','/help','/api/billing','/api/billing/webhook'].includes(request.nextUrl.pathname)) return NextResponse.next({ request })
    if (request.nextUrl.pathname === '/api/faberge' || request.nextUrl.pathname.startsWith('/api/faberge/')) return NextResponse.next({ request })
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
