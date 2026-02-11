'use client'

import { useEffect, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface SmartMenuItem {
    recipe_id: string
    user_id: string
    name: string
    description: string | null
    menu_price: number
    image_url: string | null
    category: string
    manual_available: boolean
    max_servings: number
    smart_available: boolean
    is_available: boolean
}

export function useSmartMenu(userId?: string) {
    const supabase = createClient()
    const queryClient = useQueryClient()

    const { data: menuItems, isLoading, error, refetch } = useQuery({
        queryKey: ['smart-menu', userId],
        queryFn: async () => {
            let query = supabase
                .from('view_menu_availability')
                .select('*')
                .order('category')
                .order('name')

            if (userId) {
                query = query.eq('user_id', userId)
            }

            const { data, error } = await query

            if (error) throw error
            return data as SmartMenuItem[]
        },
        enabled: !!userId,
    })

    // Realtime subscription on ingredients table
    useEffect(() => {
        if (!userId) return

        const channel = supabase
            .channel('smart-menu-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'ingredients',
                },
                () => {
                    // Refetch menu when ingredients change
                    queryClient.invalidateQueries({ queryKey: ['smart-menu', userId] })
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'recipes',
                },
                () => {
                    // Refetch menu when recipes change
                    queryClient.invalidateQueries({ queryKey: ['smart-menu', userId] })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, userId, queryClient])

    // Helper function to get availability status
    const getAvailabilityStatus = useCallback((item: SmartMenuItem) => {
        if (!item.manual_available) {
            return { status: 'off_air', label: 'OFF AIR', color: 'text-orange-500' }
        }
        if (!item.smart_available) {
            return { status: 'sold_out', label: 'SOLD OUT', color: 'text-red-500' }
        }
        if (item.max_servings <= 5) {
            return { status: 'low_stock', label: `Only ${item.max_servings} Left!`, color: 'text-amber-500' }
        }
        return { status: 'available', label: 'Available', color: 'text-primary' }
    }, [])

    return {
        menuItems: menuItems || [],
        isLoading,
        error,
        refetch,
        getAvailabilityStatus,
    }
}
