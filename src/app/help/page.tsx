import InfoPage from '@/components/product/info-page'
import { HelpCentre } from '@/components/workspace/help-centre'
import '@/components/workspace/workspace.css'
import '@/components/workspace/professional.css'
import '@/components/workspace/operations.css'
export const metadata={title:'Kitchen guides · Mise KitchenSync',description:'Practical guides to recipe costing, stock, staff planning, menu analysis and daily service.'}
export default function HelpPage(){return <div className="public-help"><InfoPage eyebrow="THE KITCHEN GUIDE" title="Clear steps. Useful answers." intro="Find the workflow you need, understand the numbers and get back to the kitchen."><HelpCentre/></InfoPage></div>}
