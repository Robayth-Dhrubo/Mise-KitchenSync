import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { GuestMenu } from '@/components/guest/guest-menu'

export default async function GuestPage({ params }: { params: Promise<{ room: string }> }) {
    const supabase = await createClient()
    const { room } = await params

    // Fetch the first user to act as the "Hotel" for this demo
    // In a multi-tenant app, this would be determined by the URL or setup
    const { data: firstUser, error: userError } = await supabase.from('profiles').select('id').limit(1).single()

    if (userError || !firstUser) {
        console.error('Error fetching hotel profile:', userError)
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-3xl font-black text-white italic font-display mb-4">Vault Access Denied.</h1>
                <p className="text-neutral-500 max-w-sm mb-8">No active hospitality intelligence profile found in the cluster.</p>
            </div>
        )
    }

    const { data: recipes } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', firstUser.id)
        .order('menu_price', { ascending: false })

    return <GuestMenu recipes={recipes || []} room={room} hotelId={firstUser.id} />
}
