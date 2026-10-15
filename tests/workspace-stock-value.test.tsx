import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import KitchenWorkspace from '../src/components/workspace/workspace'
import { sampleWorkspace } from '../src/lib/workspace/domain'

afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, '', '/') })

describe('Inventory value for imported records', () => {
  it('shows an unavailable value when imported stock has not been counted', async () => {
    const state = sampleWorkspace('2026-10-10')
    state.sampleData = false
    state.ingredients = state.ingredients.map(item => ({ ...item, stock: null }))
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ revision: 1, state, updatedAt: '2026-10-10T12:00:00Z' })))
    render(<KitchenWorkspace displayName="Robayth" />)
    const stock = await screen.findByRole('button', { name: /^Stock value/ })
    expect(stock.querySelector('strong')?.textContent).toBe('—')
  })

  it('keeps a recorded zero visible even when no price exists for empty stock', async () => {
    const state = sampleWorkspace('2026-10-10')
    state.ingredients = state.ingredients.map(item => ({ ...item, stock: 0, price: null }))
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ revision: 1, state, updatedAt: '2026-10-10T12:00:00Z' })))
    render(<KitchenWorkspace displayName="Robayth" />)
    const stock = await screen.findByRole('button', { name: /^Stock value/ })
    expect(stock.querySelector('strong')?.textContent).toBe('$0.00')
  })
})
