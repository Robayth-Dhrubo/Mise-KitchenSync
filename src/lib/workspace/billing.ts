import { env } from 'cloudflare:workers'
import type { ChatGPTUser } from '@/app/chatgpt-auth'
import type { StripeEvent } from './stripe-webhook'

type Plan = { name:string; amount:number; currency:string; interval:string; intervalCount:number }
type Subscription = { id:string; status:string; cancel_at_period_end?:boolean; latest_invoice?:{status?:string}|string|null; items:{ data:{ price:{ id:string } }[] }; metadata?:Record<string,string> }
export class BillingError extends Error {
  constructor(message:string,public status=503) { super(message) }
}
export function billingConfigured() { return !!(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_ID && env.STRIPE_WEBHOOK_SECRET && env.DB) }
export function billingEnforced() { return env.BILLING_ENFORCED === 'true' }
async function stripe<T>(path:string,fields?:Record<string,string>,idempotency?:string):Promise<T> {
  if (!env.STRIPE_SECRET_KEY) throw new BillingError('Subscriptions are not available yet.')
  const headers:Record<string,string> = { Authorization:`Bearer ${env.STRIPE_SECRET_KEY}` }
  if(fields)headers['Content-Type']='application/x-www-form-urlencoded'
  if(idempotency)headers['Idempotency-Key']=idempotency
  headers['Stripe-Version']=env.STRIPE_API_VERSION || '2026-08-26.dahlia'
  try {
    const response=await fetch(`https://api.stripe.com/v1/${path}`,{method:fields?'POST':'GET',headers,body:fields?new URLSearchParams(fields):undefined,signal:AbortSignal.timeout(12000)})
    if(!response.ok)throw new BillingError('Billing is temporarily unavailable. Please retry.')
    return await response.json() as T
  }catch(error){if(error instanceof BillingError)throw error;throw new BillingError('Billing is temporarily unavailable. Please retry.')}
}
export async function publicPlan():Promise<Plan|null> {
  if(!billingConfigured())return null
  const p=await stripe<{ active:boolean;unit_amount:number|null;currency:string;recurring:{interval:string;interval_count:number}|null;product:{name:string} }>(`prices/${encodeURIComponent(env.STRIPE_PRICE_ID!)}?expand[]=product`)
  if(!p.active||p.unit_amount===null||!p.recurring)throw new BillingError('A fixed recurring subscription price needs to be configured.')
  // The customer-facing integration supports two-decimal CAD/USD/EUR/GBP prices.
  if(!['cad','usd','eur','gbp'].includes(p.currency))throw new BillingError('Configure a supported subscription currency.')
  return {name:p.product.name,amount:p.unit_amount/100,currency:p.currency.toUpperCase(),interval:p.recurring.interval,intervalCount:p.recurring.interval_count}
}
async function customerId(user:ChatGPTUser,create=false):Promise<string|null> {
  if(!env.DB)throw new BillingError('Billing storage is unavailable.')
  const row=await env.DB.prepare('SELECT customer_id FROM billing_accounts WHERE owner_id = ?').bind(user.userId).first<{customer_id:string}>()
  if(row)return row.customer_id
  if(!create)return null
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(user.userId)))).map(b=>b.toString(16).padStart(2,'0')).join('')
  const customer=await stripe<{id:string}>('customers',{email:user.email,name:user.displayName,'metadata[mise_owner_id]':user.userId},`mise-customer-${digest}`)
  await env.DB.prepare('INSERT INTO billing_accounts (owner_id, customer_id, updated_at) VALUES (?, ?, ?) ON CONFLICT(owner_id) DO NOTHING').bind(user.userId,customer.id,new Date().toISOString()).run()
  const saved=await env.DB.prepare('SELECT customer_id FROM billing_accounts WHERE owner_id = ?').bind(user.userId).first<{customer_id:string}>()
  if(!saved)throw new BillingError('Billing setup could not be saved. Please retry.')
  return saved.customer_id
}
export async function billingStatus(user:ChatGPTUser) {
  const configured=billingConfigured(),enforced=billingEnforced()
  if(!configured){
    if(enforced)throw new BillingError('Subscription access is unavailable until billing is configured.')
    return {configured:false,enforced:false,mode:'pilot',status:'pilot',hasAccess:true,canManage:false,plan:null,cancelsAtPeriodEnd:false}
  }
  const customer=await customerId(user)
  const plan=await publicPlan()
  const subscription=customer?await canonicalSubscription(customer,user.userId):undefined
  const receipt=customer?await env.DB!.prepare('SELECT subscription_id, status FROM billing_receipts WHERE owner_id = ?').bind(user.userId).first<{subscription_id:string|null;status:string}>():null
  const eligible=subscriptionEligible(subscription)
  const confirmed=eligible&&receipt?.subscription_id===subscription?.id&&receipt?.status===subscription?.status
  return {configured:true,enforced,mode:/^(sk|rk)_test_/.test(env.STRIPE_SECRET_KEY!)?'test':'live',status:subscription?.status??'none',hasAccess:!enforced||confirmed,confirmationPending:!!subscription&&['active','trialing'].includes(subscription.status)&&!confirmed,canManage:!!customer,plan,cancelsAtPeriodEnd:subscription?.cancel_at_period_end??false}
}

async function canonicalSubscription(customer:string,ownerId:string) {
  const query=new URLSearchParams({customer,price:env.STRIPE_PRICE_ID!,status:'all',limit:'100','expand[]':'data.latest_invoice'})
  const all=await stripe<{data:Subscription[];has_more:boolean}>(`subscriptions?${query}`)
  const owned=all.data.filter(s=>s.metadata?.mise_owner_id===ownerId&&s.items.data.some(i=>i.price.id===env.STRIPE_PRICE_ID))
  const subscription=owned.find(s=>s.status==='active'||s.status==='trialing')??owned[0]
  if(all.has_more&&!subscription)throw new BillingError('Billing history needs to be reviewed before access can be confirmed.')
  return subscription
}

function subscriptionEligible(subscription:Subscription|undefined) {
  return !!subscription&&(subscription.status==='trialing'||(subscription.status==='active'&&typeof subscription.latest_invoice==='object'&&subscription.latest_invoice?.status==='paid'))
}

// Stripe events resolve through their customer ID to the app's existing ownership
// boundary. Payload metadata never chooses the kitchen that receives paid access.
export async function handleBillingEvent(event:StripeEvent) {
  if(!billingConfigured())throw new BillingError('Webhook billing is not configured.')
  const test=/^(sk|rk)_test_/.test(env.STRIPE_SECRET_KEY!)
  if(event.livemode===test)throw new BillingError('Webhook environment does not match billing.',400)
  const object=event.data.object
  const supported=event.type.startsWith('customer.subscription.')||['invoice.paid','invoice.payment_failed','checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed'].includes(event.type)
  if(!supported)return {received:true,ignored:true}
  if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)&&!['paid','no_payment_required'].includes(String(object.payment_status)))return {received:true,ignored:true}
  const customer=typeof object.customer==='string'?object.customer:typeof object.customer==='object'&&object.customer!==null?(object.customer as {id?:unknown}).id:null
  if(typeof customer!=='string')return {received:true,ignored:true}
  const owner=await env.DB!.prepare('SELECT owner_id FROM billing_accounts WHERE customer_id = ?').bind(customer).first<{owner_id:string}>()
  if(!owner)return {received:true,ignored:true}
  const duplicate=await env.DB!.prepare('SELECT event_id FROM billing_events WHERE event_id = ?').bind(event.id).first()
  if(duplicate)return {received:true,duplicate:true}
  const subscription=await canonicalSubscription(customer,owner.owner_id)
  // Even an active subscription can have a first asynchronous payment pending.
  // Canonical invoice status, not event order or a success URL, controls access.
  const status=subscriptionEligible(subscription)?subscription!.status:subscription?.status==='active'?'pending_payment':subscription?.status??'none'
  const now=new Date().toISOString()
  await env.DB!.batch([
    env.DB!.prepare('INSERT INTO billing_receipts (owner_id, subscription_id, status, event_id, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(owner_id) DO UPDATE SET subscription_id=excluded.subscription_id, status=excluded.status, event_id=excluded.event_id, updated_at=excluded.updated_at').bind(owner.owner_id,subscription?.id??null,status,event.id,now),
    env.DB!.prepare('INSERT INTO billing_events (event_id, owner_id, received_at) VALUES (?, ?, ?) ON CONFLICT(event_id) DO NOTHING').bind(event.id,owner.owner_id,now),
  ])
  return {received:true}
}
export async function requireBillingAccess(user:ChatGPTUser) {
  if(!billingEnforced())return
  const status=await billingStatus(user)
  if(!status.hasAccess)throw new BillingError('Your subscription needs attention. Open Subscription to continue saving. Your records remain available to view and export.',402)
}
function verifiedRedirect(url:string,hostname:string) {
  let parsed:URL;try{parsed=new URL(url)}catch{throw new BillingError('The billing redirect is unavailable.')}
  if(parsed.protocol!=='https:'||parsed.hostname!==hostname)throw new BillingError('The billing redirect is unavailable.')
  return url
}
export async function checkout(user:ChatGPTUser,origin:string) {
  if(!billingConfigured())throw new BillingError('Payments are not open yet. Your private pilot workspace remains available.')
  const status=await billingStatus(user)
  if(status.status==='active'||status.status==='trialing')throw new BillingError('You already have a subscription. Use Manage subscription.',409)
  const customer=await customerId(user,true)
  const session=await stripe<{url:string|null}>('checkout/sessions',{
    mode:'subscription',customer:customer!,client_reference_id:user.userId,
    'line_items[0][price]':env.STRIPE_PRICE_ID!,'line_items[0][quantity]':'1',
    'subscription_data[metadata][mise_owner_id]':user.userId,
    integration_identifier:`mise_kitchensync_${Array.from(crypto.getRandomValues(new Uint8Array(8)),n=>String.fromCharCode(97+n%26)).join('')}`,
    success_url:`${origin}/?view=billing&checkout=complete`,cancel_url:`${origin}/?view=billing&checkout=cancelled`,
  })
  if(!session.url)throw new BillingError('The payment page could not be opened.')
  return verifiedRedirect(session.url,'checkout.stripe.com')
}
export async function portal(user:ChatGPTUser,origin:string) {
  if(!billingConfigured())throw new BillingError('Subscriptions are not available yet.')
  const customer=await customerId(user)
  if(!customer)throw new BillingError('There is no subscription to manage.',404)
  const session=await stripe<{url:string}>('billing_portal/sessions',{customer,return_url:`${origin}/?view=billing`})
  return verifiedRedirect(session.url,'billing.stripe.com')
}
