import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StockCounts } from '../src/components/workspace/stock-counts'
import { InventoryControl } from '../src/components/workspace/inventory-control'
import { StationPrep } from '../src/components/workspace/station-prep'
import { SalesUsage, VarianceReview } from '../src/components/workspace/inventory-review'
import { IngredientEditor } from '../src/components/workspace/editors'
import { demoWorkspace } from '../src/lib/workspace/demo'
import { demoInventoryHistory } from '../src/lib/workspace/inventory-demo'
import { countDraftKey } from '../src/lib/workspace/offline-counts'
import { newCountDraft } from '../src/lib/workspace/inventory-control'
import { kitchenDay, type Workspace } from '../src/lib/workspace/domain'

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true); vi.spyOn(window, 'confirm').mockReturnValue(true) })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); sessionStorage.clear() })
const props = () => ({ state: demoWorkspace(), revision: 1, scope: 'owner-one', demo: false, busy: false, onSnapshot: vi.fn(), onEvent: vi.fn(), help: vi.fn() })

describe('Physical-count device workflow', () => {
  it('keeps counts offline and syncs on reconnect with the same ID and account marker', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const p = props(), fetcher = vi.fn(async () => Response.json({ snapshot: { state: p.state, revision: 2, updatedAt: null }, duplicate: false }))
    vi.stubGlobal('fetch', fetcher)
    render(<StockCounts {...p}/>)
    fireEvent.click(screen.getByRole('button', { name: 'Start a stock count' }))
    fireEvent.change(screen.getByLabelText('Count quantity for Whole eggs'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Queue for reconnect' }))
    const queued = JSON.parse(localStorage.getItem(countDraftKey(p.scope))!)
    expect(queued.status).toBe('queued'); expect(queued.lines[0].quantity).toBe(0); expect(fetcher).not.toHaveBeenCalled()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    act(() => { window.dispatchEvent(new Event('online')) })
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    const [, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(options.headers).toMatchObject({ 'X-Mise-Account': 'owner-one' })
    expect(JSON.parse(String(options.body))).toMatchObject({ eventId: queued.eventId, lines: [{ ingredientId: 'sample-eggs', quantity: 0, unit: 'each' }] })
    await waitFor(() => expect(localStorage.getItem(countDraftKey(p.scope))).toBeNull())
    expect(p.onSnapshot).toHaveBeenCalledTimes(1)
  })
  it('keeps a timed-out queue and reuses its ID when the user retries', async () => {
    const p = props(), draft = newCountDraft(p.state, 1, p.scope); draft.lines[0].quantity = 10
    draft.status = 'queued'; localStorage.setItem(countDraftKey(p.scope), JSON.stringify(draft))
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce(Response.json({ snapshot: { state: p.state, revision: 2, updatedAt: null }, duplicate: true }))
    vi.stubGlobal('fetch', fetcher); render(<StockCounts {...p}/>)
    await screen.findByText('Connection lost')
    expect(JSON.parse(localStorage.getItem(countDraftKey(p.scope))!).eventId).toBe(draft.eventId)
    fireEvent.click(screen.getByRole('button', { name: 'Retry sync' }))
    await screen.findByText('This count was already applied. The latest kitchen is loaded.')
    expect(fetcher.mock.calls.map(call => JSON.parse(call[1].body).eventId)).toEqual([draft.eventId, draft.eventId])
  })
  it('preserves measurements through a conflict and requires review before rebasing', async () => {
    const p = props(), draft = newCountDraft(p.state, 1, p.scope); draft.lines[0].quantity = 12; draft.status = 'queued'
    localStorage.setItem(countDraftKey(p.scope), JSON.stringify(draft))
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'Stock changed on another device', snapshot: { state: p.state, revision: 4, updatedAt: null } }, { status: 409 })))
    render(<StockCounts {...p}/>)
    await screen.findByText('Stock changed on another device')
    expect((screen.getByRole('button', { name: 'Create reviewed count draft' }) as HTMLButtonElement).disabled).toBe(true)
    expect(JSON.parse(localStorage.getItem(countDraftKey(p.scope))!).lines[0].quantity).toBe(12)
    fireEvent.click(screen.getByRole('checkbox', { name: /I rechecked these counts/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Create reviewed count draft' }))
    const rebased = JSON.parse(localStorage.getItem(countDraftKey(p.scope))!)
    expect(rebased).toMatchObject({ revision: 4, status: 'draft' }); expect(rebased.eventId).not.toBe(draft.eventId)
    expect(rebased.lines[0].quantity).toBe(12)
  })
  it('does not display or sync another account’s device count', () => {
    const p = props(), draft = newCountDraft(p.state, 1, 'owner-two'); draft.lines[0].quantity = 5; draft.status = 'queued'
    localStorage.setItem(countDraftKey('owner-two'), JSON.stringify(draft))
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
    render(<StockCounts {...p}/>)
    expect(screen.getByRole('button', { name: 'Start a stock count' })).toBeTruthy(); expect(fetcher).not.toHaveBeenCalled()
  })
  it('returns a rejected historical count to editable draft without losing measurements', async () => {
    const p = props(), draft = newCountDraft(p.state, 1, p.scope); draft.lines[0].quantity = 9; draft.status = 'queued'
    localStorage.setItem(countDraftKey(p.scope), JSON.stringify(draft))
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'Later stock activity already follows this count date.' }, { status: 400 })))
    render(<StockCounts {...p}/>)
    await screen.findByText('Later stock activity already follows this count date.')
    expect((screen.getByLabelText('Count quantity for Whole eggs') as HTMLInputElement).disabled).toBe(false)
    expect(JSON.parse(localStorage.getItem(countDraftKey(p.scope))!)).toMatchObject({ status: 'draft', eventId: draft.eventId })
  })
  it('warns and keeps the open draft in memory when browser storage fails', () => {
    const p = props(); vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage disabled') })
    render(<StockCounts {...p}/>)
    fireEvent.click(screen.getByRole('button', { name: 'Start a stock count' }))
    fireEvent.change(screen.getByLabelText('Count quantity for Whole eggs'), { target: { value: '8' } })
    expect(screen.getByText(/Device storage is unavailable. Keep this page open/)).toBeTruthy()
    expect((screen.getByLabelText('Count quantity for Whole eggs') as HTMLInputElement).value).toBe('8')
    expect(screen.getByRole('button', { name: 'Export draft' })).toBeTruthy()
    const leaving = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(leaving); expect(leaving.defaultPrevented).toBe(true)
  })
})

describe('Prep, recipes and variance screens', () => {
  it('keeps the demo inventory tools separate and supports keyboard tab selection', async () => {
    const p = props(), fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
    render(<InventoryControl {...p} demo scope="demo" save={async () => true} openPrep={() => {}} openOrders={() => {}}/>)
    expect(screen.getAllByRole('tab')).toHaveLength(6)
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Stock counts' }), { key: 'End' })
    expect(screen.getByRole('tab', { name: 'Stock history' }).getAttribute('aria-selected')).toBe('true')
    expect(await screen.findByText('Illustrative closing count')).toBeTruthy()
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('can cancel changing stock tabs if a count exists only in memory', () => {
    const p = props(); vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage disabled') })
    render(<InventoryControl {...p} demo scope="demo" save={async () => true} openPrep={() => {}} openOrders={() => {}}/>)
    fireEvent.click(screen.getByRole('button', { name: 'Start a stock count' }))
    vi.mocked(window.confirm).mockReturnValue(false)
    fireEvent.click(screen.getByRole('tab', { name: 'Station prep' }))
    expect(screen.getByRole('tab', { name: 'Stock counts' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByLabelText('Count quantity for Whole eggs')).toBeTruthy()
  })
  it('drafts the station shortfall from a dated prepared-portion count', async () => {
    const state = demoWorkspace(), save = vi.fn(async (_next: Workspace) => true)
    render(<StationPrep state={state} busy={false} save={save} help={() => {}} openPrep={() => {}}/>)
    fireEvent.click(screen.getByRole('button', { name: 'Draft station prep' }))
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    const next = save.mock.calls[0][0]
    expect(next.prep.at(-1)).toMatchObject({ due: kitchenDay(), quantity: '18 portions · 18 full batches', stationTarget: { stationId: state.stockControl!.stations[0].id, recipeId: 'sample-monte' } })
    expect(next.ingredients).toEqual(state.ingredients)
  })
  it('shows a physical-count review without calling private APIs in the demo', async () => {
    const state = demoWorkspace(), fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
    render(<VarianceReview state={state} scope="demo" demo events={demoInventoryHistory(state)} help={() => {}}/>)
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /Calculate usage variance/ }))
    expect(await screen.findByRole('cell', { name: '$1.12' })).toBeTruthy(); expect(fetcher).not.toHaveBeenCalled()
  })
  it('blocks an old sales snapshot from deducting stock already covered by a count', () => {
    const p = props(); render(<SalesUsage {...p} events={demoInventoryHistory(p.state)}/>)
    expect((screen.getByRole('button', { name: 'Post reviewed sales usage' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/a physical count already includes part or all/)).toBeTruthy()
  })
  it('converts an entered purchase weight before saving the usable ingredient', async () => {
    const state = demoWorkspace(), save = vi.fn(async (_next: Workspace) => true)
    render(<IngredientEditor state={state} busy={false} save={save} close={() => {}} notify={() => {}}/>)
    fireEvent.change(screen.getByLabelText('Ingredient name'), { target: { value: 'Trimmed beef' } })
    fireEvent.change(screen.getByLabelText(/Purchase quantity unit/), { target: { value: 'lb' } })
    fireEvent.change(screen.getByLabelText(/Quantity in one pack/), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText(/Usable yield/), { target: { value: '70' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    expect(save.mock.calls[0][0].ingredients.at(-1)?.packQuantity).toBeCloseTo(4535.9237)
  })
})
