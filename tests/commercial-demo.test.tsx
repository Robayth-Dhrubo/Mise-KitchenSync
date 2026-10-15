import {afterEach,describe,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import KitchenWorkspace from '../src/components/workspace/workspace'
import PlateDemo from '../src/components/product/plate-demo'
afterEach(()=>{cleanup();vi.unstubAllGlobals();window.sessionStorage.clear();window.history.replaceState({},'','/')})
describe('Commercial product demo',()=>{
  it('loads, edits and saves its budget without reading or writing a live account',async()=>{
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);vi.stubGlobal('scrollTo',vi.fn())
    window.history.replaceState({},'','/demo?view=budget')
    render(<KitchenWorkspace displayName="Demo guest" mode="demo"/>)
    await screen.findByText('Know the cost of your team.')
    fireEvent.change(screen.getByLabelText('Projected monthly net sales'),{target:{value:'70000'}})
    fireEvent.click(screen.getByRole('button',{name:'Save budget'}))
    await screen.findByText('Budget saved to your kitchen.')
    expect(JSON.parse(sessionStorage.getItem('mise-product-demo-v1')!).business.monthlySales).toBe(70000)
    expect(fetcher).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button',{name:'Subscription'}))
    await screen.findByText('Explore the product using illustrative data. Payments are disabled in the demo.')
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('does not let a demo query string open the private source views',async()=>{
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher)
    window.history.replaceState({},'','/demo?view=sources')
    render(<KitchenWorkspace displayName="Demo guest" mode="demo"/>)
    await screen.findByRole('heading',{name:'Your kitchen, in sync.'})
    expect(screen.queryByRole('button',{name:'Source library'})).toBeNull()
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('flags cleared price inputs instead of presenting a zero-price calculation',()=>{
    render(<PlateDemo/>);expect(screen.getByText('29.1%')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Selling price before tax'),{target:{value:''}})
    expect(screen.getByText('Enter a nonnegative portion cost and a selling price above zero.')).toBeTruthy()
    expect(screen.getAllByText('—')).toHaveLength(2)
  })
})
