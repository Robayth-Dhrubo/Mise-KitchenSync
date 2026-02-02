import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const QB_CONFIG = {
    clientId: process.env.QUICKBOOKS_CLIENT_ID || '',
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || '',
    redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/integrations/quickbooks/callback',
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
    const realmId = searchParams.get('realmId')
    const error = searchParams.get('error')

    if (error) {
        return NextResponse.redirect(new URL('/integrations?error=oauth_denied', request.url))
    }

    const storedState = request.cookies.get('quickbooks_oauth_state')?.value
    if (!state || state !== storedState) {
        return NextResponse.redirect(new URL('/integrations?error=invalid_state', request.url))
    }

    if (!code) {
        return NextResponse.redirect(new URL('/integrations?error=no_code', request.url))
    }

    try {
        const credentials = Buffer.from(`${QB_CONFIG.clientId}:${QB_CONFIG.clientSecret}`).toString('base64')

        const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`,
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: QB_CONFIG.redirectUri,
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
                provider: 'quickbooks',
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                merchant_id: realmId,
                expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
                status: 'connected',
            }, { onConflict: 'user_id,provider' })

        const response = NextResponse.redirect(new URL('/integrations?success=quickbooks', request.url))
        response.cookies.delete('quickbooks_oauth_state')

        return response
    } catch (error) {
        console.error('QuickBooks callback error:', error)
        return NextResponse.redirect(new URL('/integrations?error=callback_failed', request.url))
    }
}
