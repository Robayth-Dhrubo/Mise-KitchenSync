'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signupSchema, type SignupSchemaType } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ChefHat } from 'lucide-react'

export default function SignupPage() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignupSchemaType>({
        resolver: zodResolver(signupSchema),
    })

    const onSubmit = async (data: SignupSchemaType) => {
        setIsLoading(true)
        setError(null)

        const supabase = createClient()
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
        })

        if (authError) {
            setError(authError.message)
            setIsLoading(false)
            return
        }

        if (authData.user) {
            await new Promise(resolve => setTimeout(resolve, 500))
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ restaurant_name: data.restaurantName })
                .eq('id', authData.user.id)
            if (profileError) console.error('Profile update error:', profileError)
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
                        <h1 className="text-3xl font-semibold text-foreground tracking-tight">Employee Register</h1>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.3em]">Create Your Account</p>
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
                                <Label htmlFor="restaurantName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-0.5">Property Name</Label>
                                <Input id="restaurantName" type="text" placeholder="The Grand Hotel" {...register('restaurantName')}
                                    className="h-12 bg-background border-border rounded-xl text-foreground font-medium text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20 transition-all" />
                                {errors.restaurantName && <p className="text-red-500 text-xs font-medium ml-0.5">{errors.restaurantName.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-0.5">Email</Label>
                                <Input id="email" type="email" placeholder="chef@property.com" {...register('email')}
                                    className="h-12 bg-background border-border rounded-xl text-foreground font-medium text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20 transition-all" />
                                {errors.email && <p className="text-red-500 text-xs font-medium ml-0.5">{errors.email.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-0.5">Password</Label>
                                <Input id="password" type="password" placeholder="••••••••" {...register('password')}
                                    className="h-12 bg-background border-border rounded-xl text-foreground font-medium text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20 transition-all" />
                                {errors.password && <p className="text-red-500 text-xs font-medium ml-0.5">{errors.password.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-0.5">Confirm Password</Label>
                                <Input id="confirmPassword" type="password" placeholder="••••••••" {...register('confirmPassword')}
                                    className="h-12 bg-background border-border rounded-xl text-foreground font-medium text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20 transition-all" />
                                {errors.confirmPassword && <p className="text-red-500 text-xs font-medium ml-0.5">{errors.confirmPassword.message}</p>}
                            </div>

                            <Button type="submit"
                                className="w-full h-12 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:bg-primary/90 transition-all duration-300 shadow-sm"
                                disabled={isLoading}>
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-[#F9F8F4]/30 border-t-[#F9F8F4] rounded-full animate-spin" />
                                        Creating Account...
                                    </div>
                                ) : 'Create Account'}
                            </Button>
                        </form>

                        <div className="text-center text-xs font-medium">
                            <span className="text-muted-foreground">Already have an account? </span>
                            <Link href="/login" className="text-primary hover:text-primary transition-colors">Sign In</Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
