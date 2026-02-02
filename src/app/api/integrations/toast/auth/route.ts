import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Toast OAuth configuration
const TOAST_CONFIG = {
    clientId: process.env.TOAST_CLIENT_ID || '',
    clientSecret: process.env.TOAST_CLIENT_SECRET || '',
    redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/integrations/toast/callback',
    scopes: ['menus:read', 'restaurants:read'],
    baseUrl: 'https://ws-api.toasttab.com',
}

export async function GET(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    const state = crypto.randomUUID()

    const response = NextResponse.redirect(
        `${TOAST_CONFIG.baseUrl}/usermgmt/v1/oauth/authorize?` +
        `client_id=${TOAST_CONFIG.clientId}&` +
        `response_type=code&` +
        `scope=${TOAST_CONFIG.scopes.join(' ')}&` +
        `redirect_uri=${encodeURIComponent(TOAST_CONFIG.redirectUri)}&` +
        `state=${state}`
    )

    response.cookies.set('toast_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600,
    })

    return response
}
