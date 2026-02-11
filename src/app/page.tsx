import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Sparkles, Shield, BarChart3, Utensils, Zap, Clock, TrendingUp, Star, Flame, Eye } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Silk texture */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat' }} />

      {/* Warm golden glow — very subtle */}
      <div className="fixed top-[-30%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-primary/[0.03] blur-[140px] pointer-events-none z-0" />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Image src="/logo.png" alt="Mise" width={36} height={36} className="rounded-full group-hover:opacity-80 transition-opacity" />
            <span className="font-bold text-lg tracking-tight text-foreground">Mise</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link href="/signup" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-40 pb-32 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Logo emblem */}
          <div className="flex justify-center">
            <Image src="/logo.png" alt="Mise Culinary Solutions" width={100} height={100} className="rounded-full shadow-2xl shadow-primary/10" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 text-xs text-primary font-medium tracking-wider uppercase">
            <Sparkles className="w-3 h-3" />
            Culinary Solutions
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-[-0.04em] leading-[1.05]">
            <span className="text-foreground">Run Your Kitchen</span>
            <br />
            <span className="text-primary">Like a Machine.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Recipe costing, inventory, POS, and margin protection — unified under one premium platform for profitable hospitality.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/signup" className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all">
              Start Free Trial
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/guest" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg border border-border text-sm text-muted-foreground font-medium hover:text-foreground hover:border-primary/30 transition-all">
              Guest Portal
            </Link>
          </div>
        </div>
      </section>

      {/* Thin gold divider */}
      <div className="relative z-10 max-w-3xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>

      {/* Metrics strip */}
      <section className="relative z-10">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '99.9%', label: 'Uptime' },
              { value: '<2s', label: 'Response' },
              { value: '30%', label: 'Cost Savings' },
              { value: '5★', label: 'Rating' },
            ].map((s, i) => (
              <div key={i} className="space-y-1">
                <p className="text-2xl font-bold tracking-tight text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gold divider */}
      <div className="relative z-10 max-w-3xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>

      {/* Features */}
      <section className="relative z-10 py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Platform</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Everything you need</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Utensils, title: 'Recipe Engine', desc: 'Precision costing with yield tracking and real-time ingredient repricing.' },
              { icon: BarChart3, title: 'Margin Guard', desc: 'Automated alerts when supplier price changes threaten your food cost targets.' },
              { icon: Shield, title: 'Inventory Control', desc: 'Par-level management, waste tracking, and smart reorder suggestions.' },
              { icon: Flame, title: 'Kitchen Display', desc: 'Real-time order routing to stations with automated ticket management.' },
              { icon: Eye, title: 'Live Dashboard', desc: 'Revenue, covers, and cost metrics updating in real-time across all outlets.' },
              { icon: Zap, title: 'Unified POS', desc: 'Dine-in, room service, and takeaway — one terminal, one ticket system.' },
            ].map((f, i) => (
              <div key={i} className="bg-card border border-border/50 rounded-xl p-7 hover:border-primary/20 transition-all duration-300 group">
                <f.icon className="w-5 h-5 text-primary/60 mb-4 group-hover:text-primary transition-colors" />
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="relative z-10 py-28 px-6 border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Workflow</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Three steps to control</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              { step: '01', title: 'Build Your Menu', desc: 'Import recipes, set food costs, and calculate optimal pricing automatically.' },
              { step: '02', title: 'Track Everything', desc: 'Inventory levels, supplier prices, and waste — all tracked in real-time.' },
              { step: '03', title: 'Protect Margins', desc: 'Get alerts before cost spikes eat your profit. Adjust menus instantly.' },
            ].map((item, i) => (
              <div key={i} className="space-y-3">
                <span className="text-3xl font-bold text-primary/20">{item.step}</span>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-28 px-6 border-t border-border/50">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Ready to take control?
          </h2>
          <p className="text-muted-foreground">
            Join culinary teams running smarter, more profitable operations.
          </p>
          <Link href="/signup" className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all">
            Get Started Free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Mise" width={20} height={20} className="rounded-full opacity-50" />
            <span className="text-sm font-medium text-muted-foreground">Mise</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>© 2026 Mise Culinary Solutions</span>
            <span>·</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Privacy</span>
            <span>·</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Terms</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
