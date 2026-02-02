'use server'

import { createClient } from '@/lib/supabase/server'
import { scrapePrice } from '@/lib/scraper/price-scraper'

export async function scrapeAndSaveProduct(
    ingredientId: string,
    vendorId: string,
    url: string,
    packSize: string
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        // 1. Scrape the price
        // Default selector is generic, specific configs can be added later
        const result = await scrapePrice(url, '.price') // Simple default, will need refinement per site

        if (!result.success || result.price === undefined) {
            return {
                success: false,
                error: result.error || 'Could not find price on page'
            }
        }

        // 2. Save to database
        const { error } = await supabase
            .from('vendor_products')
            .insert({
                user_id: user.id,
                ingredient_id: ingredientId,
                vendor_id: vendorId,
                vendor_price: result.price,
                product_url: url,
                last_scraped_at: new Date().toISOString(),
                scrape_status: 'success',
                pack_size: packSize,
                unit: 'unit' // Defaulting, user might need to adjust
            })

        if (error) throw error

        return { success: true, price: result.price }

    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
