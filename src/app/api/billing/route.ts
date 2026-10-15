import { getChatGPTUser } from '@/app/chatgpt-auth'
import { billingStatus,checkout,portal,BillingError } from '@/lib/workspace/billing'

export const dynamic='force-dynamic'
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}})
export async function GET() {
  const user=await getChatGPTUser()
  if(!user)return json({error:'Sign in to view your subscription.'},401)
  try{return json(await billingStatus(user))}catch(error){return json({error:error instanceof BillingError?error.message:'Billing could not be loaded.'},error instanceof BillingError?error.status:503)}
}
export async function POST(request:Request) {
  const user=await getChatGPTUser()
  if(!user)return json({error:'Sign in to manage your subscription.'},401)
  const origin=new URL(request.url).origin
  if(request.headers.get('origin')!==origin)return json({error:'Open billing from your own workspace.'},403)
  try{
    const raw=await request.text()
    if(raw.length>100)return json({error:'Invalid billing request.'},400)
    const input=JSON.parse(raw)
    if(input.action!=='checkout'&&input.action!=='portal')return json({error:'Choose a billing action.'},400)
    return json({url:await(input.action==='checkout'?checkout(user,origin):portal(user,origin))})
  }catch(error){return json({error:error instanceof BillingError?error.message:'The billing action could not be completed.'},error instanceof BillingError?error.status:400)}
}
