'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import OpenAI from 'openai'
import { captureException } from '@/lib/monitoring/sentry'

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
            using_mock_data: true,
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

        const invoiceData = JSON.parse(content)

        // Logic to update inventory
        for (const item of invoiceData.items) {
            const { data: ingredients } = await supabase
                .from('ingredients')
                .select('*')
                .ilike('name', `%${item.name.split(' ')[0]}%`)
                .limit(1)

            if (ingredients && ingredients.length > 0) {
                const match = ingredients[0]
                await supabase.from('ingredients')
                    .update({
                        current_stock: match.current_stock + item.qty,
                        purchase_price: item.price
                    })
                    .eq('id', match.id)
            }
        }

        revalidatePath('/inventory')
        return { success: true, data: invoiceData, using_mock_data: false }

    } catch (error: any) {
        captureException(error)
        return { success: false, error: 'Failed to process invoice: ' + error.message }
    }
}
