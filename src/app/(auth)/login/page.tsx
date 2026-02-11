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
import { Card, CardContent } from '@/components/ui/card'
import { ChefHat } from 'lucide-react'

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

        router.push('/dashboard')
        router.refresh()
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-sm space-y-10">
                <div className="text-center space-y-6">
                    <Link href="/" className="inline-block group">
                        <div className="mx-auto w-14 h-14 bg-sidebar rounded-2xl flex items-center justify-center group-hover:scale-105 transition-all duration-500">
                            <ChefHat className="w-7 h-7 text-primary" />
                        </div>
                    </Link>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold text-foreground tracking-tight">Employee Sign In</h1>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.3em]">Mise Service System</p>
                    </div>
                </div>

                <Card className="bg-white border-border rounded-2xl shadow-sm">
                    <CardContent className="pt-8 px-6 pb-6 space-y-7">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            {error && (
                                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium flex items-center gap-2.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-0.5">Email</Label>
                                <Input id="email" type="email" placeholder="name@property.com" {...register('email')}
                                    className="h-12 bg-background border-border rounded-xl text-foreground font-medium text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20 transition-all" />
                                {errors.email && <p className="text-red-500 text-xs font-medium ml-0.5">{errors.email.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-0.5">Password</Label>
                                <Input id="password" type="password" placeholder="••••••••" {...register('password')}
                                    className="h-12 bg-background border-border rounded-xl text-foreground font-medium text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20 transition-all" />
                                {errors.password && <p className="text-red-500 text-xs font-medium ml-0.5">{errors.password.message}</p>}
                            </div>

                            <Button type="submit"
                                className="w-full h-12 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:bg-primary/90 transition-all duration-300 shadow-sm"
                                disabled={isLoading}>
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-[#F9F8F4]/30 border-t-[#F9F8F4] rounded-full animate-spin" />
                                        Signing In...
                                    </div>
                                ) : 'Sign In'}
                            </Button>
                        </form>

                        <div className="text-center flex justify-center items-center gap-3 text-xs font-medium">
                            <Link href="/report-issue" className="text-muted-foreground hover:text-foreground transition-colors">Help</Link>
                            <span className="text-foreground">|</span>
                            <Link href="/signup" className="text-muted-foreground hover:text-foreground transition-colors">Create Account</Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
