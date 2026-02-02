import { chromium, type Browser, type Page } from 'playwright-core'

interface ScrapeResult {
    success: boolean
    price?: number
    error?: string
    rawText?: string
}

/**
 * Rate limiter - ensures we don't hammer vendor sites
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Clean price string to number
 * "$4.50 / ea" -> 4.50
 * "4,99 €" -> 4.99
 */
function cleanPriceString(raw: string): number | null {
    // Remove currency symbols and text, keep numbers and decimal
    const cleaned = raw
        .replace(/[^0-9.,]/g, '')
        .replace(',', '.') // European format
        .trim()

    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? null : parsed
}

/**
 * Scrape a single product page for its price
 */
export async function scrapePrice(
    url: string,
    selector: string,
    browser?: Browser
): Promise<ScrapeResult> {
    let ownBrowser = false
    let page: Page | null = null

    try {
        if (!browser) {
            // Launch headless browser
            browser = await chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            })
            ownBrowser = true
        }

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })

        page = await context.newPage()

        // Navigate with timeout
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        })

        // Wait for price element
        await page.waitForSelector(selector, { timeout: 10000 })

        // Extract price text
        const rawText = await page.$eval(selector, el => el.textContent || '')

        const price = cleanPriceString(rawText)

        if (price === null) {
            return {
                success: false,
                error: `Could not parse price from: "${rawText}"`,
                rawText
            }
        }

        return {
            success: true,
            price,
            rawText
        }

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown scraping error'
        }
    } finally {
        if (page) await page.close().catch(() => { })
        if (ownBrowser && browser) await browser.close().catch(() => { })
    }
}

/**
 * Batch scrape multiple products with rate limiting
 */
export async function batchScrapeProducts(
    products: Array<{
        id: string
        url: string
        selector: string
    }>,
    delayMs: number = 2000 // 2 second delay between requests
): Promise<Map<string, ScrapeResult>> {
    const results = new Map<string, ScrapeResult>()

    let browser: Browser | null = null

    try {
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })

        for (let i = 0; i < products.length; i++) {
            const product = products[i]

            console.log(`[Scraper] Processing ${i + 1}/${products.length}: ${product.url}`)

            const result = await scrapePrice(product.url, product.selector, browser)
            results.set(product.id, result)

            // Rate limit - don't hammer the site
            if (i < products.length - 1) {
                await delay(delayMs)
            }
        }

    } finally {
        if (browser) await browser.close().catch(() => { })
    }

    return results
}

/**
 * Check if price change is suspicious (>50%)
 */
export function isPriceSpike(
    oldPrice: number,
    newPrice: number,
    threshold: number = 50
): boolean {
    if (oldPrice <= 0) return false
    const changePct = Math.abs((newPrice - oldPrice) / oldPrice) * 100
    return changePct > threshold
}
