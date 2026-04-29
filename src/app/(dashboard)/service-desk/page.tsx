'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, MessageSquare, Send, CheckCircle, Clock, Loader2, Plus, Ticket, Server, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { ReportIssueDialog } from '@/components/layout/report-issue-dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

// Helper for date formatting
const timeAgo = (dateStr: string) => {
    try {
        const date = new Date(dateStr)
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

        let interval = seconds / 31536000
        if (interval > 1) return Math.floor(interval) + "y ago"
        interval = seconds / 2592000
        if (interval > 1) return Math.floor(interval) + "mo ago"
        interval = seconds / 86400
        if (interval > 1) return Math.floor(interval) + "d ago"
        interval = seconds / 3600
        if (interval > 1) return Math.floor(interval) + "h ago"
        interval = seconds / 60
        if (interval > 1) return Math.floor(interval) + "m ago"
        return "just now"
    } catch (e) {
        return "recently"
    }
}

interface Issue {
    id: number
    title: string
    description: string
    status: 'open' | 'in_progress' | 'resolved'
    created_at: string
    priority: string
    category: string
    reply: string | null
    creator: {
        email: string
        role: string
    } | null
    type: 'service' | 'desk' | 'other'
}

export default function ReportedIssuesPage() {
    const [activeTab, setActiveTab] = useState<'service' | 'desk' | 'all'>('service')
    const [issues, setIssues] = useState<Issue[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [replyingTo, setReplyingTo] = useState<number | null>(null)
    const [replyText, setReplyText] = useState('')

    const fetchIssues = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/admin/tickets')
            if (!res.ok) {
                if (res.status === 401) {
                    setIssues([]) // No auth, gracefully show empty
                    return
                }
                throw new Error('Failed to fetch')
            }
            const data = await res.json()

            // Transform data using creator role
            const transformed = data.tickets.map((t: any) => ({
                ...t,
                type: t.creator?.role === 'chef' ? 'service'
                    : t.creator?.role === 'foh' ? 'desk'
                        : 'other' // Fallback
            }))

            setIssues(transformed)
        } catch (error) {
            console.warn('Caught error loading issues. Serving empty UI.', error)
            setIssues([])
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchIssues()
    }, [])

    const filteredIssues = issues.filter(issue => {
        if (activeTab === 'all') return true
        if (activeTab === 'service') return issue.type === 'service'
        if (activeTab === 'desk') return issue.type === 'desk'
        return true
    })

    const handleSendReply = async (id: number) => {
        if (!replyText.trim()) return

        try {
            const res = await fetch('/api/admin/tickets', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    reply: replyText,
                    status: 'resolved'
                })
            })

            if (!res.ok) throw new Error('Failed to reply')

            // Optimistic update
            setIssues(issues.map(issue =>
                issue.id === id
                    ? { ...issue, status: 'resolved', reply: replyText }
                    : issue
            ))

            toast.success('Reply sent & issue resolved')
            setReplyingTo(null)
            setReplyText('')
        } catch (error) {
            toast.error('Failed to send reply')
        }
    }

    const handleStatusChange = async (id: number, newStatus: string) => {
        // Optimistic update
        setIssues(issues.map(issue =>
            issue.id === id ? { ...issue, status: newStatus as any } : issue
        ))

        try {
            await fetch('/api/admin/tickets', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus })
            })
            toast.success('Status updated')
        } catch (error) {
            toast.error('Failed to update status')
            fetchIssues() // Revert
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                        <AlertCircle className="w-8 h-8 text-primary" />
                        Service Desk
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage support tickets from Kitchen and Front of House.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchIssues}
                        className="border-border bg-sidebar/40 text-muted-foreground hover:text-foreground"
                    >
                        Refresh
                    </Button>
                    <ReportIssueDialog>
                        <Button className="bg-primary hover:bg-primary text-foreground gap-2">
                            <Plus className="w-4 h-4" />
                            Create Ticket
                        </Button>
                    </ReportIssueDialog>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 border-b border-white/10 pb-4 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('service')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg transition-all border whitespace-nowrap",
                        activeTab === 'service'
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "text-muted-foreground border-transparent hover:text-foreground hover:bg-white/5"
                    )}
                >
                    {activeTab === 'service' && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                    Service (Kitchen)
                </button>
                <button
                    onClick={() => setActiveTab('desk')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg transition-all border whitespace-nowrap",
                        activeTab === 'desk'
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            : "text-muted-foreground border-transparent hover:text-foreground hover:bg-white/5"
                    )}
                >
                    {activeTab === 'desk' && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                    Desk (FOH)
                </button>
                <button
                    onClick={() => setActiveTab('all')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg transition-all border whitespace-nowrap",
                        activeTab === 'all'
                            ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                            : "text-muted-foreground border-transparent hover:text-foreground hover:bg-white/5"
                    )}
                >
                    All Issues ({issues.length})
                </button>
            </div>

            {/* Issues List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : filteredIssues.length > 0 ? (
                    filteredIssues.map((issue) => (
                        <div key={issue.id} className="bg-card/50 border border-border rounded-xl p-6 transition-all hover:border-border group">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center border shrink-0",
                                        issue.type === 'service'
                                            ? "bg-primary/10 border-primary/20 text-primary"
                                            : "bg-blue-500/10 border-blue-500/20 text-blue-500"
                                    )}>
                                        {issue.category === 'hardware' ? <Server className="w-5 h-5" /> : <Ticket className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-foreground font-bold text-lg">{issue.title}</h3>
                                            <span className={cn(
                                                "uppercase text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                                issue.priority === 'critical' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                                    issue.priority === 'high' ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                                                        "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                            )}>{issue.priority}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-muted-foreground text-sm mt-1 flex-wrap">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {timeAgo(issue.created_at)}
                                            </span>
                                            <span>•</span>
                                            <span className="text-muted-foreground">
                                                {issue.creator?.email?.split('@')[0] || 'Unknown'}
                                                <span className="opacity-50 ml-1">({issue.creator?.role.toUpperCase()})</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full md:w-auto min-w-[140px]">
                                    <Select value={issue.status} onValueChange={(v) => handleStatusChange(issue.id, v)}>
                                        <SelectTrigger className={cn(
                                            "h-8 border-white/10 text-xs font-medium",
                                            issue.status === 'resolved' ? "bg-primary/10 text-primary border-primary/20" :
                                                issue.status === 'in_progress' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                    "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                        )}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-white/10">
                                            <SelectItem value="open">Open</SelectItem>
                                            <SelectItem value="in_progress">In Progress</SelectItem>
                                            <SelectItem value="resolved">Resolved</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <p className="text-foreground ml-14 mb-6 leading-relaxed">
                                {issue.description}
                            </p>

                            {/* Reply Section */}
                            <div className="ml-14">
                                {issue.reply ? (
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                        <div className="flex items-center gap-2 text-primary font-bold text-sm mb-2">
                                            <MessageSquare className="w-4 h-4" />
                                            Admin Reply
                                        </div>
                                        <p className="text-foreground text-sm">{issue.reply}</p>
                                    </div>
                                ) : replyingTo === issue.id ? (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <Textarea
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            placeholder="Type your reply to resolve this issue..."
                                            className="bg-sidebar/40 border-border min-h-[100px] text-foreground"
                                            autoFocus
                                        />
                                        <div className="flex items-center gap-2">
                                            <Button
                                                onClick={() => handleSendReply(issue.id)}
                                                className="bg-primary hover:bg-primary text-foreground gap-2"
                                            >
                                                <Send className="w-4 h-4" />
                                                Send Reply & Resolve
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                onClick={() => setReplyingTo(null)}
                                                className="text-muted-foreground hover:text-foreground"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setReplyingTo(issue.id)
                                            setReplyText('')
                                        }}
                                        className="border-border hover:bg-white/5 hover:text-foreground hover:border-border text-muted-foreground"
                                    >
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        Reply to Staff
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-card/50 border border-border rounded-xl p-12 flex flex-col items-center justify-center text-center mt-6">
                        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-6">
                            <CheckCircle className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-foreground font-medium text-xl">All caught up!</h3>
                        <p className="text-muted-foreground mt-2 max-w-sm">
                            There are no {activeTab !== 'all' ? activeTab : ''} issues requiring attention.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
