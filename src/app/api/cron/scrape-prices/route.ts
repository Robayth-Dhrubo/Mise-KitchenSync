import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { batchScrapeProducts, isPriceSpike } from '@/lib/scraper/price-scraper'
import { captureException } from '@/lib/monitoring/sentry'

/**
 * Nightly Price Scraping Cron Job
 * 
 * Called by Vercel Cron at 3 AM
 * GET /api/cron/scrape-prices
 * 
 * Required header: Authorization: Bearer CRON_SECRET
 */
export async function GET(request: Request) {
    try {
        // Verify cron secret (for Vercel Cron)
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET
        
        // Configuration
        const batchSize = parseInt(process.env.SCRAPE_BATCH_SIZE || '50')
        const requestDelay = parseInt(process.env.SCRAPE_REQUEST_DELAY_MS || '2000')

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createClient()

        // Get all products that need scraping
        const { data: products, error: fetchError } = await supabase
            .from('view_vendors_to_scrape')
            .select('*')
            .limit(batchSize) // Process configurable batch size

        if (fetchError) {
            captureException(fetchError)
            return NextResponse.json({ error: fetchError.message }, { status: 500 })
        }

        if (!products || products.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No products need scraping',
                processed: 0
            })
        }

        console.log(`[Cron] Starting price scrape for ${products.length} products`)

        // Batch scrape with rate limiting
        const scrapeResults = await batchScrapeProducts(
            products.map(p => ({
                id: p.id,
                url: p.product_url,
                selector: p.scraper_selector || '.price'
            })),
            requestDelay // Configurable delay between requests
        )

        // Process results
        let successCount = 0
        let errorCount = 0
        let spikeCount = 0

        for (const product of products) {
            const result = scrapeResults.get(product.id)

            if (!result) continue

            if (result.success && result.price !== undefined) {
                // Check for price spike
                if (product.current_price && isPriceSpike(product.current_price, result.price)) {
                    // Flag for review, don't auto-update
                    await supabase.rpc('update_scraped_price', {
                        p_vendor_product_id: product.id,
                        p_new_price: result.price
                    })
                    spikeCount++
                } else {
                    // Update price
                    await supabase.rpc('update_scraped_price', {
                        p_vendor_product_id: product.id,
                        p_new_price: result.price
                    })
                    successCount++
                }
            } else {
                // Mark as error
                await supabase.rpc('mark_scrape_error', {
                    p_vendor_product_id: product.id,
                    p_error_message: result.error || 'Unknown error'
                })
                errorCount++
            }
        }

        console.log(`[Cron] Scrape complete: ${successCount} success, ${errorCount} errors, ${spikeCount} price spikes`)

        return NextResponse.json({
            success: true,
            processed: products.length,
            results: {
                success: successCount,
                errors: errorCount,
                priceSpikes: spikeCount
            }
        })

    } catch (error) {
        captureException(error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
