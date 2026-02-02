import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SQUARE_CONFIG = {
    clientId: process.env.SQUARE_CLIENT_ID || '',
    clientSecret: process.env.SQUARE_CLIENT_SECRET || '',
    redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/integrations/square/callback',
    baseUrl: process.env.SQUARE_ENVIRONMENT === 'production'
        ? 'https://connect.squareup.com'
        : 'https://connect.squareupsandbox.com',
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

    // Check for errors from Square
    if (error) {
        console.error('Square OAuth error:', error)
        return NextResponse.redirect(new URL('/integrations?error=oauth_denied', request.url))
    }

    // Verify state
    const storedState = request.cookies.get('square_oauth_state')?.value
    if (!state || state !== storedState) {
        return NextResponse.redirect(new URL('/integrations?error=invalid_state', request.url))
    }

    if (!code) {
        return NextResponse.redirect(new URL('/integrations?error=no_code', request.url))
    }

    try {
        // Exchange code for access token
        const tokenResponse = await fetch(`${SQUARE_CONFIG.baseUrl}/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Square-Version': '2024-01-18',
            },
            body: JSON.stringify({
                client_id: SQUARE_CONFIG.clientId,
                client_secret: SQUARE_CONFIG.clientSecret,
                code,
                grant_type: 'authorization_code',
                redirect_uri: SQUARE_CONFIG.redirectUri,
            }),
        })

        const tokenData = await tokenResponse.json()

        if (!tokenResponse.ok) {
            console.error('Token exchange failed:', tokenData)
            return NextResponse.redirect(new URL('/integrations?error=token_failed', request.url))
        }

        // Store the connection in database
        const { error: dbError } = await supabase
            .from('integrations')
            .upsert({
                user_id: user.id,
                provider: 'square',
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                merchant_id: tokenData.merchant_id,
                expires_at: tokenData.expires_at,
                status: 'connected',
            }, { onConflict: 'user_id,provider' })

        if (dbError) {
            console.error('Failed to store connection:', dbError)
            return NextResponse.redirect(new URL('/integrations?error=storage_failed', request.url))
        }

        // Clear the state cookie
        const response = NextResponse.redirect(new URL('/integrations?success=square', request.url))
        response.cookies.delete('square_oauth_state')

        return response
    } catch (error) {
        console.error('Square callback error:', error)
        return NextResponse.redirect(new URL('/integrations?error=callback_failed', request.url))
    }
}
