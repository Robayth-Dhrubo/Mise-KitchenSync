import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TOAST_CONFIG = {
    clientId: process.env.TOAST_CLIENT_ID || '',
    clientSecret: process.env.TOAST_CLIENT_SECRET || '',
    redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/integrations/toast/callback',
    baseUrl: 'https://ws-api.toasttab.com',
}

export async function GET(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
        return NextResponse.redirect(new URL('/integrations?error=oauth_denied', request.url))
    }

    const storedState = request.cookies.get('toast_oauth_state')?.value
    if (!state || state !== storedState) {
        return NextResponse.redirect(new URL('/integrations?error=invalid_state', request.url))
    }

    if (!code) {
        return NextResponse.redirect(new URL('/integrations?error=no_code', request.url))
    }

    try {
        const tokenResponse = await fetch(`${TOAST_CONFIG.baseUrl}/authentication/v1/authentication/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientId: TOAST_CONFIG.clientId,
                clientSecret: TOAST_CONFIG.clientSecret,
                code,
                userAccessType: 'TOAST_MACHINE_CLIENT',
            }),
        })

        const tokenData = await tokenResponse.json()

        if (!tokenResponse.ok) {
            return NextResponse.redirect(new URL('/integrations?error=token_failed', request.url))
        }

        await supabase
            .from('integrations')
            .upsert({
                user_id: user.id,
                provider: 'toast',
                access_token: tokenData.accessToken,
                refresh_token: tokenData.refreshToken,
                expires_at: new Date(Date.now() + tokenData.expiresIn * 1000).toISOString(),
                status: 'connected',
            }, { onConflict: 'user_id,provider' })

        const response = NextResponse.redirect(new URL('/integrations?success=toast', request.url))
        response.cookies.delete('toast_oauth_state')

        return response
    } catch (error) {
        console.error('Toast callback error:', error)
        return NextResponse.redirect(new URL('/integrations?error=callback_failed', request.url))
    }
}
