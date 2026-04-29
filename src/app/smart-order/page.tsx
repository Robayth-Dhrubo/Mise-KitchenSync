import { createClient } from '@/lib/supabase/server';
import { SmartOrderBoard } from './client-board';

export default async function SmartOrderPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let orders = {};

    try {
        if (user) {
            const { data: smartOrderData, error } = await supabase
                .rpc('generate_smart_order_grouped', { p_user_id: user.id });
                
            if (error) {
                console.error('Smart Order Error:', error);
            } else {
                orders = typeof smartOrderData === 'string' ? JSON.parse(smartOrderData) : (smartOrderData || {});
            }
        }
    } catch (e) {
        console.warn('Caught auth/db error in Smart Order page.', e);
    }

    return (
        <div className="h-screen flex flex-col p-6 overflow-hidden">
            <header className="mb-6 flex-shrink-0">
                <h1 className="text-3xl font-bold text-foreground">Smart Order Engine</h1>
                <p className="text-muted-foreground">Review and approve vendor purchase orders</p>
            </header>

            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <SmartOrderBoard initialData={orders || {}} />
            </div>
        </div>
    );
}
