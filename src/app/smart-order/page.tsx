import { createClient } from '@/lib/supabase/server';
import { SmartOrderBoard } from './client-board';

export default async function SmartOrderPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return <div>Please login</div>;

    // The RPC returns a JSON object where keys are Vendor Names and values are arrays of items
    const { data: smartOrderData, error } = await supabase
        .rpc('generate_smart_order_grouped', { p_user_id: user.id });

    if (error) {
        console.error('Smart Order Error:', error);
        return <div className="text-red-500">Failed to generate smart order</div>;
    }

    // Parse if it returns a string, otherwise use as is
    const orders = typeof smartOrderData === 'string' ? JSON.parse(smartOrderData) : smartOrderData;

    return (
        <div className="h-screen flex flex-col p-6 overflow-hidden">
            <header className="mb-6 flex-shrink-0">
                <h1 className="text-3xl font-bold text-white">Smart Order Engine</h1>
                <p className="text-neutral-400">Review and approve vendor purchase orders</p>
            </header>

            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <SmartOrderBoard initialData={orders || {}} />
            </div>
        </div>
    );
}
