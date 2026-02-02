'use client'

import { useState } from 'react'
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Ticket } from 'lucide-react'
import { toast } from 'sonner' // Assuming sonner is set up as per layout.tsx

export function ReportIssueDialog({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'other',
        priority: 'medium',
        location: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title) return

        setIsLoading(true)
        try {
            const res = await fetch('/api/admin/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (!res.ok) throw new Error('Failed to submit ticket')

            toast.success('Ticket created successfully')
            setOpen(false)
            setFormData({ title: '', description: '', category: 'other', priority: 'medium', location: '' })
        } catch (error) {
            console.error(error)
            toast.error('Failed to submit ticket')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="bg-neutral-900 border-white/10 text-white sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Ticket className="w-5 h-5 text-emerald-500" />
                        Report an Issue
                    </DialogTitle>
                    <DialogDescription className="text-neutral-400">
                        Describe the technical or operational issue you are facing.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-neutral-400">ISSUE TITLE</Label>
                        <Input
                            className="bg-black/50 border-white/10"
                            placeholder="e.g. Printer Offline"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-neutral-400">CATEGORY</Label>
                            <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                                <SelectTrigger className="bg-black/50 border-white/10"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-neutral-900 border-white/10">
                                    <SelectItem value="hardware">Hardware</SelectItem>
                                    <SelectItem value="software">Software</SelectItem>
                                    <SelectItem value="network">Network/WiFi</SelectItem>
                                    <SelectItem value="pos">POS</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-neutral-400">PRIORITY</Label>
                            <Select value={formData.priority} onValueChange={v => setFormData({ ...formData, priority: v })}>
                                <SelectTrigger className="bg-black/50 border-white/10"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-neutral-900 border-white/10">
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-neutral-400">LOCATION (Optional)</Label>
                        <Input
                            className="bg-black/50 border-white/10"
                            placeholder="e.g. Service Station 1"
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-neutral-400">DESCRIPTION</Label>
                        <Textarea
                            className="bg-black/50 border-white/10 min-h-[80px]"
                            placeholder="Details..."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Ticket'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
