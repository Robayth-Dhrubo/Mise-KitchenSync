'use client'

export default function SessionExpiredPage() {
    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-center p-6 font-sans">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C9A84C] to-[#8B7355] flex items-center justify-center text-2xl mb-6 shadow-[0_0_40px_rgba(201,168,76,0.3)]">
                <span className="font-bold text-[#0A0A0A]">M</span>
            </div>
            
            <h1 className="text-xl font-semibold text-[#F5F0E8] mb-2 tracking-tight">Session Expired</h1>
            <p className="text-sm text-[#8A8478] max-w-sm leading-relaxed mb-8">
                Your authentication session for this window has expired. For your security, this active process was terminated.
            </p>

            <button 
                onClick={() => window.parent.postMessage('mise_os_close_window', '*')}
                className="px-6 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm font-medium hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            >
                Close Window
            </button>
        </div>
    )
}
