'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import OpenAI from 'openai'

export async function processInvoiceAction(formData: FormData) {
    const file = formData.get('file') as File
    if (!file) {
        return { success: false, error: 'No file uploaded' }
    }

    const supabase = await createClient()

    // Check for OpenAI API Key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
        console.warn('OPENAI_API_KEY missing, using mock data')
        // MOCK RESPONSE for Demonstration if no key
        await new Promise(resolve => setTimeout(resolve, 2000))
        return {
            success: true,
            data: {
                vendor: "Sysco (Mock)",
                total: 450.00,
                items: [
                    { name: "Ribeye Steaks", qty: 20, unit: "lbs", price: 15.00, original_name: "Cert Ang Beef Ribeye" },
                    { name: "Romaine Hearts", qty: 2, unit: "cases", price: 35.00, original_name: "Romaine Hearts 24ct" },
                    { name: "Heavy Cream", qty: 4, unit: "gal", price: 20.00, original_name: "Heavy Whipping Cream" }
                ]
            }
        }
    }

    try {
        const openai = new OpenAI({ apiKey })
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64Image = buffer.toString('base64')

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are an OCR assistant. Extract invoice details into JSON format: { vendor: string, total: number, items: [{ name: string, qty: number, unit: string, price: number, original_name: string }] }. Standardize units to lbs, kg, oz, gal, l, cases, or pcs."
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Parse this invoice." },
                        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                    ]
                }
            ],
            response_format: { type: "json_object" }
        })

        const content = response.choices[0].message.content
        if (!content) throw new Error('No content from OpenAI')

        const data = JSON.parse(content)
        var mockData = data // Keep variable name consistent for downstream logic
    } catch (error: any) {
        console.error('OpenAI Error:', error)
        return { success: false, error: 'Failed to process invoice: ' + error.message }
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
