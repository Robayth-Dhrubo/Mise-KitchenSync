// @vitest-environment node
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
const mock=vi.hoisted(()=>({env:{} as Record<string,unknown>}))
vi.mock('cloudflare:workers',()=>({env:mock.env}))
import {billingStatus,checkout,portal,requireBillingAccess} from '../src/lib/workspace/billing'
import {GET,POST} from '../src/app/api/billing/route'
const auth=vi.hoisted(()=>({getUser:vi.fn()}))
vi.mock('@/app/chatgpt-auth',()=>({getChatGPTUser:auth.getUser}))
const user={userId:'owner-one',email:'owner@example.invalid',displayName:'Owner',fullName:null}
let receipt:{subscription_id:string;status:string}|null=null
const prepare=vi.fn((sql:string)=>({bind:vi.fn(()=>({first:vi.fn(async()=>sql.includes('billing_receipts')?receipt:({customer_id:'cus_owned'})),run:vi.fn(async()=>({meta:{changes:1}}))}))}))
const price={active:true,unit_amount:4900,currency:'cad',recurring:{interval:'month',interval_count:1},product:{name:'Mise Kitchen'}}
function provider(subscriptions:unknown[]=[]){return vi.fn(async(input:string,_options?:RequestInit)=>{
 if(input.includes('/prices/'))return Response.json(price)
 if(input.includes('/subscriptions?'))return Response.json({data:subscriptions,has_more:false})
 if(input.endsWith('/checkout/sessions'))return Response.json({url:'https://checkout.stripe.com/c/pay/test'})
 if(input.endsWith('/billing_portal/sessions'))return Response.json({url:'https://billing.stripe.com/p/session/test'})
 throw new Error('Unexpected provider request')
})}
beforeEach(()=>{Object.keys(mock.env).forEach(k=>delete mock.env[k]);prepare.mockClear();receipt={subscription_id:'sub_other',status:'active'};mock.env.DB={prepare};auth.getUser.mockResolvedValue(user)})
afterEach(()=>vi.unstubAllGlobals())
describe('Subscription boundaries',()=>{
 it('waits for a verified webhook and a settled invoice before granting access',async()=>{
   Object.assign(mock.env,{STRIPE_SECRET_KEY:'sk_test_placeholder',STRIPE_PRICE_ID:'price_mise',STRIPE_WEBHOOK_SECRET:'whsec_test_placeholder',BILLING_ENFORCED:'true'})
   const sub={id:'sub_other',status:'active',latest_invoice:{status:'paid'},metadata:{mise_owner_id:user.userId},items:{data:[{price:{id:'price_mise'}}]}}
   receipt=null;vi.stubGlobal('fetch',provider([sub]));expect(await billingStatus(user)).toMatchObject({hasAccess:false,confirmationPending:true})
   receipt={subscription_id:'sub_other',status:'active'};expect((await billingStatus(user)).hasAccess).toBe(true)
   vi.stubGlobal('fetch',provider([{...sub,latest_invoice:{status:'open'}}]));expect((await billingStatus(user)).hasAccess).toBe(false)
 })
 it('keeps checkout closed when webhook verification is not configured',async()=>{
   Object.assign(mock.env,{STRIPE_SECRET_KEY:'sk_test_placeholder',STRIPE_PRICE_ID:'price_mise'})
   await expect(checkout(user,'https://mise.example')).rejects.toThrow('Payments are not open')
 })

 it('leaves the existing private pilot available when payments are not configured',async()=>{expect(await billingStatus(user)).toMatchObject({configured:false,status:'pilot',hasAccess:true});expect(prepare).not.toHaveBeenCalled()})
 it('fails closed if paid access is enabled without a working payment configuration',async()=>{mock.env.BILLING_ENFORCED='true';await expect(requireBillingAccess(user)).rejects.toThrow('until billing is configured')})
 it('checks the owned customer, owner metadata and configured price before granting paid access',async()=>{
   Object.assign(mock.env,{STRIPE_SECRET_KEY:'sk_test_placeholder',STRIPE_PRICE_ID:'price_mise',STRIPE_WEBHOOK_SECRET:'whsec_test_placeholder',BILLING_ENFORCED:'true'})
   const wrong=[{id:'sub_other',status:'active',latest_invoice:{status:'paid'},metadata:{mise_owner_id:'other-owner'},items:{data:[{price:{id:'price_mise'}}]}}]
   vi.stubGlobal('fetch',provider(wrong));expect((await billingStatus(user)).hasAccess).toBe(false)
   const good=[{...wrong[0],metadata:{mise_owner_id:user.userId}}];vi.stubGlobal('fetch',provider(good));expect((await billingStatus(user)).hasAccess).toBe(true)
   vi.stubGlobal('fetch',provider([{...good[0],items:{data:[{price:{id:'price_other'}}]}}]));expect((await billingStatus(user)).hasAccess).toBe(false)
 })
 it('checks canonical provider state instead of granting access from checkout success parameters',async()=>{
   Object.assign(mock.env,{STRIPE_SECRET_KEY:'sk_test_placeholder',STRIPE_PRICE_ID:'price_mise',STRIPE_WEBHOOK_SECRET:'whsec_test_placeholder',BILLING_ENFORCED:'true'});vi.stubGlobal('fetch',provider())
   await expect(requireBillingAccess(user)).rejects.toMatchObject({status:402})
 })
 it('creates hosted checkout using only server-selected owner and price',async()=>{
   Object.assign(mock.env,{STRIPE_SECRET_KEY:'sk_test_placeholder',STRIPE_PRICE_ID:'price_mise',STRIPE_WEBHOOK_SECRET:'whsec_test_placeholder'});const fetcher=provider();vi.stubGlobal('fetch',fetcher)
   expect(await checkout(user,'https://mise.example')).toContain('https://checkout.stripe.com/')
   const args=fetcher.mock.calls.find(([url])=>url.endsWith('/checkout/sessions'))![1]!
   const body=args.body as URLSearchParams;expect(body.get('line_items[0][price]')).toBe('price_mise');expect(body.get('subscription_data[metadata][mise_owner_id]')).toBe(user.userId);expect(body.get('integration_identifier')).toMatch(/^mise_kitchensync_[a-z]{8}$/)
   expect(prepare.mock.calls.every(([sql])=>sql.includes('owner_id'))).toBe(true)
 })
 it('rejects a redirect to an unexpected host',async()=>{
   Object.assign(mock.env,{STRIPE_SECRET_KEY:'sk_test_placeholder',STRIPE_PRICE_ID:'price_mise',STRIPE_WEBHOOK_SECRET:'whsec_test_placeholder'})
   vi.stubGlobal('fetch',vi.fn(async()=>Response.json({url:'https://attacker.example/session'})))
   await expect(portal(user,'https://mise.example')).rejects.toThrow('redirect is unavailable')
 })
 it('rejects unauthenticated and cross-origin billing requests before contacting the provider',async()=>{
   const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);auth.getUser.mockResolvedValue(null);expect((await GET()).status).toBe(401)
   auth.getUser.mockResolvedValue(user);const r=await POST(new Request('https://mise.example/api/billing',{method:'POST',headers:{origin:'https://attacker.example'},body:JSON.stringify({action:'checkout'})}));expect(r.status).toBe(403);expect(fetcher).not.toHaveBeenCalled()
 })
})
