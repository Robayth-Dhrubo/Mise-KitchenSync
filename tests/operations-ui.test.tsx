import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import KitchenWorkspace from '../src/components/workspace/workspace'
import { demoWorkspace } from '../src/lib/workspace/demo'
import { HelpCentre } from '../src/components/workspace/help-centre'
import { StaffPlanner } from '../src/components/workspace/staff-planner'
import { ServiceChecks } from '../src/components/workspace/service-checks'
import { emptyOperations, weekStart } from '../src/lib/workspace/operations'
import { kitchenDay, type Workspace } from '../src/lib/workspace/domain'

beforeEach(() => { sessionStorage.clear(); vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); vi.spyOn(window, 'confirm').mockReturnValue(true) })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); window.history.replaceState({}, '', '/'); sessionStorage.clear() })

describe('New workflows in the isolated demo', () => {
  it('imports, reviews and saves sales without calling the private API', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
    window.history.replaceState({}, '', '/demo?view=performance')
    render(<KitchenWorkspace displayName="Demo guest" mode="demo"/>)
    await screen.findByRole('heading', { name: 'See what earns its place.' })
    fireEvent.click(screen.getByRole('button', { name: 'Import sales report' }))
    const dialog = within(screen.getByRole('dialog'))
    fireEvent.change(dialog.getByLabelText(/Report source/), { target: { value: 'Test till export' } })
    fireEvent.change(dialog.getByLabelText(/Or paste CSV contents/), { target: { value: 'item,quantity,net_sales_cad\nMonte Cristo,10,240' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Review import' }))
    expect(await screen.findByText('Review before saving')).toBeTruthy()
    expect(sessionStorage.getItem('mise-product-demo-v1')).toBeNull()
    expect(screen.getByLabelText('Recipe for Monte Cristo')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Save sales report' }))
    await waitFor(() => expect(JSON.parse(sessionStorage.getItem('mise-product-demo-v1')!).operations.salesReports).toHaveLength(2))
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('warns before discarding changed recipe links when navigating away', async () => {
    window.history.replaceState({}, '', '/demo?view=performance')
    render(<KitchenWorkspace displayName="Demo guest" mode="demo"/>)
    fireEvent.change(await screen.findByLabelText('Recipe for Monte Cristo'), { target: { value: '' } })
    vi.mocked(window.confirm).mockReturnValue(false)
    fireEvent.click(screen.getByRole('button', { name: /^Inventory/ }))
    expect(screen.getByRole('heading', { name: 'See what earns its place.' })).toBeTruthy()
    expect(window.confirm).toHaveBeenCalledWith('Leave this page and discard its unsaved changes?')
  })
  it('tests a price at unchanged volume without saving or altering the menu', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
    window.history.replaceState({}, '', '/demo?view=performance')
    render(<KitchenWorkspace displayName="Demo guest" mode="demo"/>)
    fireEvent.change(await screen.findByLabelText('Sold item'), { target: { value: 'demo-sale-monte' } })
    fireEvent.change(screen.getByLabelText('Test selling price (CAD)'), { target: { value: '26' } })
    expect(screen.getByText('Estimated contribution change').parentElement?.textContent).toContain('$240.00')
    expect(sessionStorage.getItem('mise-product-demo-v1')).toBeNull()
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('opens contextual help and keyboard page search', async () => {
    render(<KitchenWorkspace displayName="Demo guest" mode="demo"/>)
    await screen.findByRole('heading', { name: 'Your kitchen, in sync.' })
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const find = within(screen.getByRole('dialog'))
    fireEvent.change(find.getByLabelText('Find pages and guides'), { target: { value: 'Staff planner' } })
    fireEvent.click(find.getByRole('button', { name: /Staff planner/ }))
    await screen.findByRole('heading', { name: 'Put the right people on the plan.' })
    fireEvent.click(screen.getByRole('button', { name: 'Help with Staff planner' }))
    expect(within(screen.getByRole('dialog')).getByRole('heading', { name: 'Plan a Sunday–Saturday week' })).toBeTruthy()
  })
})

describe('Staff planning forms', () => {
  it('saves employee availability and a missing rate without inventing a wage', async () => {
    const state = { ...demoWorkspace(), operations: emptyOperations() }
    const save = vi.fn(async () => true)
    render(<StaffPlanner state={state} busy={false} save={save} help={() => {}}/>)
    fireEvent.click(screen.getByRole('button', { name: 'Add employee' }))
    const dialog = within(screen.getByRole('dialog'))
    fireEvent.change(dialog.getByLabelText('Employee name'), { target: { value: 'Test cook' } })
    fireEvent.change(dialog.getByLabelText('Role'), { target: { value: 'Cook' } })
    fireEvent.click(dialog.getByLabelText('Sun'))
    fireEvent.click(dialog.getByRole('button', { name: 'Save employee' }))
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    const next = (save.mock.calls as unknown as [[Workspace]])[0][0]
    expect(next.operations!.employees[0]).toMatchObject({ name: 'Test cook', hourlyRate: null, availableDays: [1, 2, 3, 4, 5, 6] })
  })
  it('requires actual hours before approval and keeps approved entries locked until reopened', async () => {
    const state = demoWorkspace(), start = weekStart(kitchenDay())
    state.operations!.shifts = [{ ...state.operations!.shifts[0], date: start, status: 'planned', actualHours: null }]
    const save = vi.fn(async () => true)
    const { rerender } = render(<StaffPlanner state={state} busy={false} save={save} help={() => {}}/>)
    fireEvent.click(screen.getByRole('button', { name: /07:30–15:30/ }))
    let dialog = within(screen.getByRole('dialog'))
    fireEvent.change(dialog.getByLabelText('Review status'), { target: { value: 'approved' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Save approved hours' }))
    expect(await dialog.findByRole('alert')).toBeTruthy()
    expect(save).not.toHaveBeenCalled()
    fireEvent.change(dialog.getByLabelText(/Actual paid hours/), { target: { value: '7' } })
    fireEvent.change(dialog.getByLabelText('Review status'), { target: { value: 'approved' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Save approved hours' }))
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    const next = (save.mock.calls as unknown as [[Workspace]])[0][0]
    expect(next.operations!.shifts[0]).toMatchObject({ status: 'approved', actualHours: 7 })
    rerender(<StaffPlanner state={next} busy={false} save={save} help={() => {}}/>)
    fireEvent.click(screen.getByRole('button', { name: /07:30–15:30/ }))
    dialog = within(screen.getByRole('dialog'))
    expect((dialog.getByLabelText(/Actual paid hours/) as HTMLInputElement).disabled || dialog.getByLabelText(/Actual paid hours/).closest('fieldset')?.disabled).toBe(true)
    fireEvent.click(dialog.getByRole('button', { name: 'Reopen for review' }))
    expect(dialog.getByLabelText(/Actual paid hours/).closest('fieldset')?.disabled).toBe(false)
  })
})

describe('Guides and service checks', () => {
  it('searches guide contents and opens a practical explanation', () => {
    render(<HelpCentre/>)
    fireEvent.change(screen.getByLabelText('Search kitchen guides'), { target: { value: 'quantity-weighted' } })
    expect(screen.getByRole('heading', { name: 'Read your menu performance' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Plan a Sunday–Saturday week' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Read guide' }))
    expect(within(screen.getByRole('dialog')).getByText(/popularity uses 70%/i)).toBeTruthy()
  })
  it('records a service check with its original wording and a separate service date', async () => {
    const state = demoWorkspace(), save = vi.fn(async () => true)
    render(<ServiceChecks state={state} busy={false} save={save} displayName="Test manager" help={() => {}} openPrep={() => {}}/>)
    const title = state.operations!.routines[0].title
    fireEvent.click(screen.getByRole('button', { name: `Complete ${title}` }))
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    const next = (save.mock.calls as unknown as [[Workspace]])[0][0]
    expect(next.operations!.checks[0]).toMatchObject({ date: kitchenDay(), title, recordedBy: 'Test manager', phase: 'opening' })
    expect(state.operations!.checks).toHaveLength(0)
  })
  it('keeps a failed sales save in the review instead of claiming it was saved', async () => {
    const state = demoWorkspace()
    const fetcher = vi.fn(async (_url: string, options?: RequestInit) => options?.method === 'PUT' ? Response.json({ error: 'Another device saved changes.' }, { status: 409 }) : Response.json({ revision: 1, updatedAt: null, state }))
    vi.stubGlobal('fetch', fetcher)
    window.history.replaceState({}, '', '/?view=performance')
    render(<KitchenWorkspace displayName="Test manager"/>)
    fireEvent.change(await screen.findByLabelText('Recipe for Monte Cristo'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save recipe links' }))
    expect(await screen.findByText('Another device saved changes.')).toBeTruthy()
    expect(screen.getByText(/Unsaved report changes/)).toBeTruthy()
    expect((screen.getByLabelText('Recipe for Monte Cristo') as HTMLSelectElement).value).toBe('')
  })
})
