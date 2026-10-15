// Sites runs in Workers and cannot launch a desktop Chromium process.
// The original Node scraper is retained for the original deployment target.
// Fail explicitly rather than reporting made-up supplier prices.
export async function scrapePrice(_url: string, _selector: string, _browser?: unknown): Promise<{success: boolean; price?: number; error?: string; rawText?: string}> {
  return { success: false, error: 'Browser-based price scraping is unavailable on Sites. Enter the price from your supplier invoice.' }
}
export async function batchScrapeProducts(products: Array<{id: string; url: string; selector: string}>, _delayMs = 2000) {
  return new Map(products.map(product => [product.id, { success: false, error: 'Automatic browser-based price scraping is unavailable on Sites. Update supplier prices from your invoices.' }]))
}
export function isPriceSpike(oldPrice: number, newPrice: number, threshold = 50) {
  return oldPrice > 0 && Math.abs((newPrice - oldPrice) / oldPrice) * 100 > threshold
}
