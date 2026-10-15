import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import KitchenWorkspace from '../src/components/workspace/workspace'
import { sampleWorkspace } from '../src/lib/workspace/domain'

afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, '', '/') })
const snapshot = () => ({ revision: 1, updatedAt: '2026-10-09T12:00:00Z', state: sampleWorkspace('2026-10-09') })

describe('Kitchen workspace interaction', () => {
  it('loads persisted records and opens the recipe cost breakdown directly', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(snapshot())))
    render(<KitchenWorkspace displayName="Robayth" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Monte Cristo' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Monte Cristo' })).toBeTruthy()
    expect(screen.getByText('Batch ingredient')).toBeTruthy()
    expect(screen.getByText('Contribution excludes labour, overhead, and taxes. Suggested price uses your food cost target.')).toBeTruthy()
  })
  it('keeps a failed edit open and does not display unsaved prices as saved', async () => {
    const fetcher = vi.fn(async (_url: string, options?: RequestInit) => options?.method === 'PUT'
      ? Response.json({ error: 'Another tab saved changes. Reload your kitchen.' }, { status: 409 })
      : Response.json(snapshot()))
    vi.stubGlobal('fetch', fetcher)
    render(<KitchenWorkspace displayName="Robayth" />)
    await screen.findByRole('button', { name: 'Monte Cristo' })
    fireEvent.click(screen.getByRole('button', { name: /^Inventory/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Whole eggs' }))
    fireEvent.change(screen.getByLabelText('Price per full pack (CAD)'), { target: { value: '70' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Another tab saved changes. Reload your kitchen.')).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('$64.00')).toBeTruthy()
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
  })
  it('shows a load failure without enabling actions on an invented empty kitchen', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'Sign in to open your kitchen.' }, { status: 401 })))
    render(<KitchenWorkspace displayName="Robayth" />)
    expect(await screen.findByText('Sign in to open your kitchen.')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Add prep task' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })
})
