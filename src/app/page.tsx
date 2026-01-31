import Link from 'next/link'
import { ChefHat, Hotel, Zap, ArrowRight, Shield, Star, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black overflow-hidden relative selection:bg-emerald-500/30">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 -left-1/4 w-[1200px] h-[1200px] bg-emerald-600/10 rounded-full blur-[160px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-0 -right-1/4 w-[1000px] h-[1000px] bg-blue-600/10 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
      </div>

      {/* Navigation */}
      <nav className="relative z-20 border-b border-white/5 backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/40 rotate-6 group cursor-pointer hover:rotate-12 transition-all">
              <ChefHat className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-black text-white tracking-tighter italic font-display">Mise.</span>
          </div>

          <div className="hidden md:flex items-center gap-10 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
            <Link href="#features" className="hover:text-white transition-all">Assets</Link>
            <Link href="#solutions" className="hover:text-white transition-all">Network</Link>
            <Link href="/login" className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all shadow-xl">Secure Access</Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 px-8 pt-24 pb-48 max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-32 max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Hospitality Intelligence Alpha</span>
          </div>

          <h1 className="text-7xl md:text-[120px] font-black text-white tracking-tighter mb-10 leading-[0.85] italic font-display">
            The Master key for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white/80 to-white/20">Modern Hotels.</span>
          </h1>

          <p className="text-xl md:text-2xl text-neutral-500 max-w-2xl mx-auto mb-16 leading-relaxed font-medium">
            Architecting the future of hospitality through unified real-time data synthesis and algorithmic kitchen efficiency.
          </p>
        </div>

        {/* Portal Cards Section */}
        <div className="grid md:grid-cols-3 gap-10 relative">
          {/* Guest Portal */}
          <Link href="/guest" className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-emerald-700/20 rounded-[48px] opacity-0 group-hover:opacity-100 blur-2xl transition-all duration-700" />
            <Card className="h-full glass-card border-white/5 hover:border-emerald-500/30 transition-all duration-700 overflow-hidden relative group-hover:-translate-y-4">
              <CardContent className="p-12 flex flex-col items-center text-center">
                <div className="w-28 h-28 rounded-[36px] bg-emerald-500/10 flex items-center justify-center mb-10 group-hover:scale-110 transition-transform duration-700 shadow-inner">
                  <Hotel className="w-14 h-14 text-emerald-500" />
                </div>
                <h3 className="text-4xl font-black text-white italic tracking-tighter mb-6 font-display">Guest Alpha</h3>
                <p className="text-neutral-500 leading-relaxed mb-10 font-bold uppercase text-[10px] tracking-widest">
                  LUXURY DIGITAL MANIFEST • ROOM SERVICE 2.0
                </p>
                <div className="mt-auto w-full flex items-center justify-between p-6 bg-white/5 rounded-3xl group-hover:bg-emerald-600 transition-all duration-700 group-hover:text-white text-neutral-400 border border-white/5">
                  <span className="font-black uppercase text-[10px] tracking-widest">Invoke Portal</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-all" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* FOH Portal */}
          <Link href="/login" className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-blue-700/20 rounded-[48px] opacity-0 group-hover:opacity-100 blur-2xl transition-all duration-700" />
            <Card className="h-full glass-card border-white/5 hover:border-blue-500/30 transition-all duration-700 overflow-hidden relative group-hover:-translate-y-4 shadow-2xl">
              <CardContent className="p-12 flex flex-col items-center text-center">
                <div className="w-28 h-28 rounded-[36px] bg-blue-500/10 flex items-center justify-center mb-10 group-hover:scale-110 transition-transform duration-700 shadow-inner">
                  <Zap className="w-14 h-14 text-blue-500" />
                </div>
                <h3 className="text-4xl font-black text-white italic tracking-tighter mb-6 font-display">Terminal FOH</h3>
                <p className="text-neutral-500 leading-relaxed mb-10 font-bold uppercase text-[10px] tracking-widest">
                  SYNCHRONIZED POS • BILLING MATRIX
                </p>
                <div className="mt-auto w-full flex items-center justify-between p-6 bg-white/5 rounded-3xl group-hover:bg-blue-600 transition-all duration-700 group-hover:text-white text-neutral-400 border border-white/5">
                  <span className="font-black uppercase text-[10px] tracking-widest">Staff Auth</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-all" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Chef Portal */}
          <Link href="/login" className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-purple-700/20 rounded-[48px] opacity-0 group-hover:opacity-100 blur-2xl transition-all duration-700" />
            <Card className="h-full glass-card border-white/5 hover:border-purple-500/30 transition-all duration-700 overflow-hidden relative group-hover:-translate-y-4">
              <CardContent className="p-12 flex flex-col items-center text-center">
                <div className="w-28 h-28 rounded-[36px] bg-purple-500/10 flex items-center justify-center mb-10 group-hover:scale-110 transition-transform duration-700 shadow-inner">
                  <ChefHat className="w-14 h-14 text-purple-500" />
                </div>
                <h3 className="text-4xl font-black text-white italic tracking-tighter mb-6 font-display">Command 01</h3>
                <p className="text-neutral-500 leading-relaxed mb-10 font-bold uppercase text-[10px] tracking-widest">
                  BUSINESS INTELLIGENCE • INVENTORY SYNC
                </p>
                <div className="mt-auto w-full flex items-center justify-between p-6 bg-white/5 rounded-3xl group-hover:bg-purple-600 transition-all duration-700 group-hover:text-white text-neutral-400 border border-white/5">
                  <span className="font-black uppercase text-[10px] tracking-widest">Access Command</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-all" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Confidence Badge */}
        <div className="mt-48 flex flex-col items-center gap-8 opacity-20 hover:opacity-100 transition-all duration-700">
          <div className="flex items-center gap-16 text-neutral-500">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5" />
              <span className="font-black uppercase tracking-[0.3em] text-[10px]">Vault Secured</span>
            </div>
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5" />
              <span className="font-black uppercase tracking-[0.3em] text-[10px]">Cinque Stelle</span>
            </div>
          </div>
          <p className="text-[10px] text-neutral-700 font-black uppercase tracking-[0.6em] text-center">
            Mise Operating System • Build v4.0.2
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-neutral-700 text-[10px] font-black uppercase tracking-widest italic">Designed for Excellence by Antigravity Studio</p>
          <div className="flex gap-6 items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
              <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">System Online</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <span className="text-[10px] text-neutral-600 font-black uppercase tracking-widest">&copy; 2026 Mise AI</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
