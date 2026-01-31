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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChefHat, Loader2 } from 'lucide-react'

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

        // Sign up the user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
        })

        if (authError) {
            setError(authError.message)
            setIsLoading(false)
            return
        }

        // Create profile
        if (authData.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: authData.user.id,
                    restaurant_name: data.restaurantName,
                })

            if (profileError) {
                console.error('Profile creation error:', profileError)
            }
        }

        router.push('/dashboard')
        router.refresh()
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px]" />

            <Card className="w-full max-w-md relative z-10 bg-neutral-900/40 border-white/5 backdrop-blur-3xl rounded-[40px] shadow-2xl overflow-hidden p-2">
                <CardHeader className="text-center space-y-4 pt-10 px-8">
                    <div className="mx-auto w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shadow-lg rotate-3">
                        <ChefHat className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-white">Create your account</CardTitle>
                        <CardDescription className="text-neutral-400">
                            Start managing your kitchen profitably
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="restaurantName" className="text-neutral-300">Restaurant Name</Label>
                            <Input
                                id="restaurantName"
                                type="text"
                                placeholder="The Golden Spoon"
                                {...register('restaurantName')}
                                className="bg-neutral-800/50 border-neutral-700 text-white placeholder:text-neutral-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                            />
                            {errors.restaurantName && (
                                <p className="text-red-400 text-sm">{errors.restaurantName.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-neutral-300">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="chef@restaurant.com"
                                {...register('email')}
                                className="bg-neutral-800/50 border-neutral-700 text-white placeholder:text-neutral-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                            />
                            {errors.email && (
                                <p className="text-red-400 text-sm">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-neutral-300">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                {...register('password')}
                                className="bg-neutral-800/50 border-neutral-700 text-white placeholder:text-neutral-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                            />
                            {errors.password && (
                                <p className="text-red-400 text-sm">{errors.password.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-neutral-300">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                {...register('confirmPassword')}
                                className="bg-neutral-800/50 border-neutral-700 text-white placeholder:text-neutral-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                            />
                            {errors.confirmPassword && (
                                <p className="text-red-400 text-sm">{errors.confirmPassword.message}</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-medium h-11 transition-all duration-200"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                'Create account'
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-neutral-400 text-sm">
                        Already have an account?{' '}
                        <Link href="/login" className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors">
                            Sign in
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
