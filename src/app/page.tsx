'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChefHat, Hotel, Terminal, ArrowRight, Shield, CheckCircle, BarChart3, Menu, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background relative selection:bg-chart-1 selection:text-black font-sans">
      {/* Subtle Grid Background - Tech Feel */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute inset-0 z-0 bg-background/90 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                <ChefHat className="w-6 h-6 text-black" />
              </div>
              <span className="text-2xl font-bold text-foreground tracking-tight font-display">Mise.</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 text-sm font-black uppercase tracking-widest text-muted-foreground">
            <Link href="/guest" className="text-emerald-400 hover:text-emerald-300 transition-colors text-[10px]">Guest Portal</Link>
            <Link href="/signup" className="hover:text-white transition-colors text-[10px]">Register</Link>
            <Link href="/login" className="px-6 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-bold hover:bg-zinc-800 transition-all shadow-sm text-[10px]">
              Staff Login
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-white hover:bg-zinc-800 rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav Overlay */}
        {isMobileMenuOpen && (
          <div className="absolute top-20 left-0 w-full bg-background border-b border-white/10 p-6 flex flex-col gap-4 shadow-2xl md:hidden animate-in slide-in-from-top-2 text-[10px] font-black uppercase tracking-widest">
            <Link
              href="/guest"
              className="text-emerald-400 hover:text-emerald-300 py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Guest Portal
            </Link>
            <Link
              href="/signup"
              className="text-white hover:text-emerald-500 py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Register
            </Link>
            <Link
              href="/login"
              className="text-black bg-white py-3 rounded-lg text-center mt-2 hover:bg-zinc-200"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Staff Login
            </Link>
          </div>
        )}
      </nav>

      <main className="relative z-10 px-6 pt-20 pb-32 max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-24 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 mb-8">
            <span className="w-2 h-2 rounded-full bg-chart-1 animate-pulse" />
            <span className="text-sm font-medium text-zinc-300 uppercase tracking-widest font-black text-[10px]">Mise OS v4.0 is live</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-foreground tracking-tight mb-8 leading-tight font-display uppercase">
            Control Your <br />
            <span className="text-chart-1">Service Costs.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-12 leading-relaxed">
            The operating system for profitable restaurants. Track inventory, calculate real food costs, and stop losing money on waste.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <Link href="/login" className="px-10 py-5 rounded-2xl bg-emerald-600 text-white font-black text-xl hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-500/20 w-full md:w-auto uppercase tracking-tighter">
              Staff Login
            </Link>
            <Link href="/guest" className="px-10 py-5 rounded-2xl bg-zinc-900 border border-white/10 text-white font-black text-xl hover:bg-zinc-800 transition-all shadow-xl w-full md:w-auto uppercase tracking-tighter">
              Guest Login
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="mt-32 scroll-mt-24">
          <h2 className="text-4xl font-bold text-white text-center mb-16 font-display uppercase">System Architecture</h2>
          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-2">
                <Shield className="w-8 h-8 text-chart-1" />
              </div>
              <h3 className="text-xl font-bold text-white uppercase">Enterprise Security</h3>
              <p className="text-zinc-400 leading-relaxed">
                Bank-grade encryption for all financial and guest data. Vault secured.
              </p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-2">
                <BarChart3 className="w-8 h-8 text-chart-1" />
              </div>
              <h3 className="text-xl font-bold text-white uppercase">Real-time Analytics</h3>
              <p className="text-zinc-400 leading-relaxed">
                Live profit reporting, cost tracking, and inventory forecasting.
              </p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-2">
                <CheckCircle className="w-8 h-8 text-chart-1" />
              </div>
              <h3 className="text-xl font-bold text-white uppercase">99.9% Uptime</h3>
              <p className="text-zinc-400 leading-relaxed">
                Redundant cloud infrastructure ensures your service never stops.
              </p>
            </div>
          </div>
        </div>

        {/* Book Demo Section */}
        <div id="demo" className="mt-32 mb-24 max-w-5xl mx-auto scroll-mt-24">
          <Card className="glass-card overflow-hidden">
            <CardContent className="p-0 grid md:grid-cols-2">
              <div className="p-8 md:p-12 flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/10 bg-white/5">
                <h2 className="text-3xl font-bold text-white mb-6 font-display uppercase">See Mise in Action</h2>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-chart-1/20 flex items-center justify-center shrink-0">
                      <ChefHat className="w-5 h-5 text-chart-1" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white mb-1">Service Intelligence</h3>
                      <p className="text-zinc-400 text-sm">Automated recipe costing and real-time inventory tracking.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                      <BarChart3 className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white mb-1">Profit Analytics</h3>
                      <p className="text-zinc-400 text-sm">Live P&L dashboards and contribution margin analysis.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white mb-1">Loss Prevention</h3>
                      <p className="text-zinc-400 text-sm">Track waste, theft, and variance down to the ingredient.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 md:p-12">
                <div className="text-center md:text-left mb-8">
                  <h3 className="text-xl font-bold text-white mb-2 uppercase">Schedule Your Personal Tour</h3>
                  <p className="text-zinc-400 text-sm">
                    Join 500+ restaurants modernizing their operations.
                  </p>
                </div>

                <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
                  <div>
                    <label htmlFor="name" className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-1 ml-1">Name</label>
                    <input type="text" id="name" className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner font-bold" placeholder="Chef Ramsay" />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-1 ml-1">Email</label>
                    <input type="email" id="email" className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner font-bold" placeholder="chef@hellskitchen.com" />
                  </div>
                  <div>
                    <label htmlFor="restaurant" className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-1 ml-1">Restaurant Name</label>
                    <input type="text" id="restaurant" className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner font-bold" placeholder="Hell's Kitchen" />
                  </div>

                  <button type="submit" className="mt-4 w-full bg-emerald-600 text-white font-black text-lg py-4 rounded-2xl hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-500/20 active:scale-95">
                    Request Access
                  </button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </main >

      {/* Footer */}
      < footer className="relative z-10 border-t border-white/5 py-10 bg-background" >
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-zinc-500 text-sm font-medium">© 2026 Mise AI. All rights reserved.</p>
          <div className="flex gap-6 items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-chart-1" />
              <span className="text-sm font-bold text-zinc-300 uppercase tracking-tighter">Systems Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
