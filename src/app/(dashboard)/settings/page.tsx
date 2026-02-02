'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Settings as SettingsIcon, User, Building2, DollarSign, Save, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

export default function SettingsPage() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    const [formData, setFormData] = useState({
        restaurant_name: '',
        currency_symbol: '$',
    })

    // Fetch profile
    const { data: profile, isLoading } = useQuery({
        queryKey: ['profile'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (error) throw error
            return data
        },
    })

    // Fetch user email
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            return user
        },
    })

    // Update form when profile loads
    useEffect(() => {
        if (profile) {
            setFormData({
                restaurant_name: profile.restaurant_name || '',
                currency_symbol: profile.currency_symbol || '$',
            })
        }
    }, [profile])

    // Update profile mutation
    const updateMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('profiles')
                .update(data)
                .eq('id', user.id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] })
            toast.success('Settings saved successfully')
        },
        onError: (error) => {
            toast.error('Failed to save settings: ' + error.message)
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        updateMutation.mutate(formData)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-6 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl">
                    <SettingsIcon className="w-8 h-8 text-emerald-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
                    <p className="text-zinc-500 text-sm mt-1">Manage your account and restaurant preferences</p>
                </div>
            </div>

            {/* Account Info */}
            <Card className="bg-neutral-900/50 border-neutral-800">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <User className="w-5 h-5 text-emerald-500" />
                        Account
                    </CardTitle>
                    <CardDescription className="text-neutral-500">
                        Your account information
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <Label className="text-neutral-400 text-sm">Email</Label>
                            <p className="text-white font-medium">{user?.email}</p>
                        </div>
                        <div>
                            <Label className="text-neutral-400 text-sm">Account Role</Label>
                            <p className="text-white font-medium capitalize">{profile?.role || 'Chef'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Restaurant Settings */}
            <form onSubmit={handleSubmit}>
                <Card className="bg-neutral-900/50 border-neutral-800">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-emerald-500" />
                            Restaurant
                        </CardTitle>
                        <CardDescription className="text-neutral-500">
                            Configure your restaurant details
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-neutral-300">Restaurant Name</Label>
                            <Input
                                value={formData.restaurant_name}
                                onChange={(e) => setFormData({ ...formData, restaurant_name: e.target.value })}
                                placeholder="Your Restaurant Name"
                                className="bg-neutral-800/50 border-neutral-700 text-white"
                            />
                        </div>

                        <Separator className="bg-neutral-800" />

                        <div className="space-y-2">
                            <Label className="text-neutral-300 flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                Currency Symbol
                            </Label>
                            <Input
                                value={formData.currency_symbol}
                                onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
                                placeholder="$"
                                maxLength={3}
                                className="bg-neutral-800/50 border-neutral-700 text-white w-24"
                            />
                            <p className="text-sm text-neutral-500">
                                This symbol will be used throughout the app (e.g., $, €, £)
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="mt-6">
                    <Button
                        type="submit"
                        disabled={updateMutation.isPending}
                        className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600"
                    >
                        {updateMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </form>

            {/* App Info */}
            <Card className="bg-neutral-900/50 border-neutral-800">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <SettingsIcon className="w-5 h-5 text-emerald-500" />
                        About Mise
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-neutral-500">Version</span>
                            <span className="text-neutral-300">1.0.0</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-neutral-500">Tagline</span>
                            <span className="text-neutral-300">The Operating System for Profitable Service Operations</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
