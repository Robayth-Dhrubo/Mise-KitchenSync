'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginSchemaType } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChefHat, Loader2 } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginSchemaType>({
        resolver: zodResolver(loginSchema),
    })

    const onSubmit = async (data: LoginSchemaType) => {
        setIsLoading(true)
        setError(null)

        const supabase = createClient()
        const { error } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
        })

        if (error) {
            setError(error.message)
            setIsLoading(false)
            return
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', (await supabase.auth.getUser()).data.user?.id)
            .single()

        // Redirect based on role
        if (profile?.role === 'admin') {
            router.push('/admin/team')
        } else if (profile?.role === 'foh') {
            router.push('/front-desk')
        } else {
            router.push('/dashboard')
        }
        router.refresh()
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-emerald-600/10 rounded-full blur-[140px] animate-pulse" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px]" />

            <div className="w-full max-w-md relative z-10 space-y-8">
                <div className="text-center space-y-6">
                    <Link href="/" className="inline-block group">
                        <div className="mx-auto w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-600/20 rotate-3 group-hover:rotate-12 transition-all duration-500">
                            <ChefHat className="w-10 h-10 text-white" />
                        </div>
                    </Link>
                    <div className="space-y-2">
                        <h1 className="text-5xl font-black text-white tracking-tighter font-display">Welcome Back</h1>
                        <p className="text-neutral-500 font-bold text-xs uppercase tracking-[0.3em]">
                            Mise Service System
                        </p>
                    </div>
                </div>

                <Card className="glass-card p-2 border-white/5 shadow-2xl">
                    <CardContent className="pt-8 px-6 space-y-8">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {error && (
                                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-in shake duration-500">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-3">
                                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 ml-1">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@restaurant.com"
                                    {...register('email')}
                                    className="h-14 bg-black/40 border-white/5 rounded-2xl text-white font-bold placeholder:text-neutral-800 focus:border-emerald-500/50 transition-all shadow-inner"
                                />
                                {errors.email && (
                                    <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest ml-1">{errors.email.message}</p>
                                )}
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 ml-1">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    {...register('password')}
                                    className="h-14 bg-black/40 border-white/5 rounded-2xl text-white font-bold placeholder:text-neutral-800 focus:border-emerald-500/50 transition-all shadow-inner"
                                />
                                {errors.password && (
                                    <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest ml-1">{errors.password.message}</p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg tracking-tighter rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        Signing In...
                                    </div>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>
                        </form>

                        <div className="text-center flex justify-center items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]">
                            <Link href="/report-issue" className="text-neutral-600 hover:text-red-500 transition-colors">
                                Help
                            </Link>
                            <span className="text-neutral-700">•</span>
                            <Link href="/signup" className="text-neutral-400 hover:text-emerald-500 transition-colors">
                                Create Account
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-center gap-6 opacity-40">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse delay-75" />
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse delay-150" />
                </div>
            </div>
        </div>
    )
}
