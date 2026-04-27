import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/cron/scrape-prices/route'
import { createClient } from '@/lib/supabase/server'
import { batchScrapeProducts } from '@/lib/scraper/price-scraper'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

vi.mock('@/lib/scraper/price-scraper', () => ({
  batchScrapeProducts: vi.fn(),
  isPriceSpike: vi.fn()
}))

vi.mock('@/lib/monitoring/sentry', () => ({
  captureException: vi.fn()
}))

describe('GET /api/cron/scrape-prices', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockResolvedValue({ error: null })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as any).mockResolvedValue(mockSupabase)
    process.env.CRON_SECRET = 'test-secret'
  })

  it('returns 401 if cron secret is missing or wrong', async () => {
    const request = new Request('http://localhost/api/cron/scrape-prices', {
      headers: { 'authorization': 'Bearer wrong' }
    })
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('processes batch size from env', async () => {
    process.env.SCRAPE_BATCH_SIZE = '10'
    mockSupabase.limit.mockResolvedValue({ data: [], error: null })
    
    const request = new Request('http://localhost/api/cron/scrape-prices', {
      headers: { 'authorization': 'Bearer test-secret' }
    })
    
    await GET(request)
    expect(mockSupabase.limit).toHaveBeenCalledWith(10)
  })

  it('passes request delay to scraper', async () => {
    process.env.SCRAPE_REQUEST_DELAY_MS = '500'
    const mockProducts = [{ id: '1', product_url: 'http://test.com', scraper_selector: '.p' }]
    mockSupabase.limit.mockResolvedValue({ data: mockProducts, error: null })
    ;(batchScrapeProducts as any).mockResolvedValue(new Map())

    const request = new Request('http://localhost/api/cron/scrape-prices', {
      headers: { 'authorization': 'Bearer test-secret' }
    })
    
    await GET(request)
    expect(batchScrapeProducts).toHaveBeenCalledWith(expect.any(Array), 500)
  })
})
