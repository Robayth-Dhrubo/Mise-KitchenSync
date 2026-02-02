import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// QuickBooks OAuth configuration
const QB_CONFIG = {
    clientId: process.env.QUICKBOOKS_CLIENT_ID || '',
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || '',
    redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/integrations/quickbooks/callback',
    scopes: 'com.intuit.quickbooks.accounting',
    baseUrl: process.env.QUICKBOOKS_ENVIRONMENT === 'production'
        ? 'https://appcenter.intuit.com'
        : 'https://appcenter.intuit.com',
}

export async function GET(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    const state = crypto.randomUUID()

    const response = NextResponse.redirect(
        `${QB_CONFIG.baseUrl}/connect/oauth2?` +
        `client_id=${QB_CONFIG.clientId}&` +
        `response_type=code&` +
        `scope=${QB_CONFIG.scopes}&` +
        `redirect_uri=${encodeURIComponent(QB_CONFIG.redirectUri)}&` +
        `state=${state}`
    )

    response.cookies.set('quickbooks_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600,
    })

    return response
}
