'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function processInvoiceAction(formData: FormData) {
    const file = formData.get('file') as File
    if (!file) {
        return { success: false, error: 'No file uploaded' }
    }

    const supabase = await createClient()

    // TODO: Integrate OpenAI GPT-4o Vision API here
    // 1. Convert file to base64
    // 2. Send to OpenAI with prompt: "Extract vendor, total, and line items (name, qty, unit, price) as JSON"

    // MOCK RESPONSE for Demonstration
    await new Promise(resolve => setTimeout(resolve, 2000)) // Fake delay

    const mockData = {
        vendor: "Sysco",
        total: 450.00,
        items: [
            { name: "Ribeye Steaks", qty: 20, unit: "lbs", price: 15.00, original_name: "Cert Ang Beef Ribeye" },
            { name: "Romaine Hearts", qty: 2, unit: "cases", price: 35.00, original_name: "Romaine Hearts 24ct" },
            { name: "Heavy Cream", qty: 4, unit: "gal", price: 20.00, original_name: "Heavy Whipping Cream" }
        ]
    }

    // Logic to update inventory
    // 1. Find ingredient by fuzzy matching name
    // 2. Update current_stock and last_price

    for (const item of mockData.items) {
        // Find match in ingredients table
        const { data: ingredients } = await supabase
            .from('ingredients')
            .select('*')
            .ilike('name', `%${item.name.split(' ')[0]}%`) // Simple separate word match for demo
            .limit(1)

        if (ingredients && ingredients.length > 0) {
            const match = ingredients[0]

            // Update stock
            await supabase.from('ingredients')
                .update({
                    current_stock: match.current_stock + item.qty,
                    purchase_price: item.price // Update latest price
                })
                .eq('id', match.id)
        }
    }

    revalidatePath('/inventory')
    return { success: true, data: mockData }
}
