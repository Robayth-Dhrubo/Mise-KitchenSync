import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Square OAuth configuration
const SQUARE_CONFIG = {
    clientId: process.env.SQUARE_CLIENT_ID || '',
    clientSecret: process.env.SQUARE_CLIENT_SECRET || '',
    redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/integrations/square/callback',
    scopes: ['ITEMS_READ', 'MERCHANT_PROFILE_READ', 'INVENTORY_READ'],
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

    // Generate state for CSRF protection
    const state = crypto.randomUUID()

    // Store state in session/cookie for verification
    const response = NextResponse.redirect(
        `${SQUARE_CONFIG.baseUrl}/oauth2/authorize?` +
        `client_id=${SQUARE_CONFIG.clientId}&` +
        `scope=${SQUARE_CONFIG.scopes.join('+')}&` +
        `session=false&` +
        `state=${state}`
    )

    // Set state cookie for callback verification
    response.cookies.set('square_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
    })

    return response
}
