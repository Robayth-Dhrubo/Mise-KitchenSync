'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import {
    Calendar, ChevronLeft, ChevronRight, Plus, X, Clock, User, Loader2, Copy, Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

type Shift = {
    id: string
    user_id: string
    start_time: string
    end_time: string
    user: {
        id: string
        email: string
        role: string
        restaurant_name?: string
    }
}

type StaffMember = {
    id: string
    email: string
    role: string
    restaurant_name?: string
}

export default function SchedulePage() {
    const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
    const [shifts, setShifts] = useState<Shift[]>([])
    const [staff, setStaff] = useState<StaffMember[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
    const [roleFilter, setRoleFilter] = useState<string>('all')

    // Cell Click Dialog State
    const [selectedCell, setSelectedCell] = useState<{ staffId: string, date: Date } | null>(null)
    const [shiftTimes, setShiftTimes] = useState({ start: '09:00', end: '17:00' })
    const [isSubmitting, setIsSubmitting] = useState(false)

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))

    // Filtered staff based on role filter
    const filteredStaff = useMemo(() => {
        if (roleFilter === 'all') return staff
        return staff.filter(s => s.role === roleFilter)
    }, [staff, roleFilter])

    // Fetch current user role and staff list
    useEffect(() => {
        const fetchUserData = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
                setCurrentUserRole(profile?.role || null)
            }
        }
        fetchUserData()
    }, [])

    // Fetch all staff
    useEffect(() => {
        const fetchStaff = async () => {
            const supabase = createClient()
            let query = supabase.from('profiles').select('id, email, role, restaurant_name')

            // If Chef, only show other chefs
            if (currentUserRole === 'chef') {
                query = query.eq('role', 'chef')
            }

            const { data } = await query.order('role').order('email')
            if (data) setStaff(data)
        }

        if (currentUserRole) fetchStaff()
    }, [currentUserRole])

    const fetchShifts = async () => {
        setIsLoading(true)
        const start = format(currentWeekStart, 'yyyy-MM-dd')
        const end = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd')

        try {
            const res = await fetch(`/api/schedule?start=${start}&end=${end}`)
            if (!res.ok) {
                if (res.status === 401) {
                    setShifts([]) // Gracefully handle no auth
                    return
                }
                throw new Error('Failed to fetch shifts')
            }
            const data = await res.json()
            if (data.shifts) setShifts(data.shifts)
        } catch (e) {
            console.warn('Caught auth/db error fetching shifts.', e)
            setShifts([])
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchShifts()
    }, [currentWeekStart])

    // Get shift for a specific staff member on a specific day
    const getShiftForCell = (staffId: string, day: Date): Shift | undefined => {
        return shifts.find(s => s.user_id === staffId && isSameDay(new Date(s.start_time), day))
    }

    // Handle cell click - open dialog to add/edit shift
    const handleCellClick = (staffId: string, day: Date) => {
        if (currentUserRole !== 'admin' && currentUserRole !== 'chef') return
        setSelectedCell({ staffId, date: day })
        setShiftTimes({ start: '09:00', end: '17:00' })
    }

    // Create shift from dialog
    const handleCreateShift = async () => {
        if (!selectedCell) return
        setIsSubmitting(true)

        const dateStr = format(selectedCell.date, 'yyyy-MM-dd')
        const start_time = `${dateStr}T${shiftTimes.start}:00`
        const end_time = `${dateStr}T${shiftTimes.end}:00`

        try {
            const res = await fetch('/api/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: selectedCell.staffId, start_time, end_time })
            })

            if (res.ok) {
                setSelectedCell(null)
                fetchShifts()
            }
        } catch (e) {
            console.error(e)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Delete shift
    const handleDeleteShift = async (shiftId: string) => {
        try {
            await fetch(`/api/schedule?id=${shiftId}`, { method: 'DELETE' })
            setShifts(prev => prev.filter(s => s.id !== shiftId))
        } catch (e) {
            console.error(e)
        }
    }

    // Copy previous week
    const handleCopyPreviousWeek = async () => {
        const prevWeekStart = addDays(currentWeekStart, -7)
        const prevStart = format(prevWeekStart, 'yyyy-MM-dd')
        const prevEnd = format(addDays(prevWeekStart, 6), 'yyyy-MM-dd')

        try {
            const res = await fetch(`/api/schedule?start=${prevStart}&end=${prevEnd}`)
            const data = await res.json()

            if (data.shifts && data.shifts.length > 0) {
                // Create new shifts offset by 7 days
                for (const shift of data.shifts) {
                    const newStart = addDays(new Date(shift.start_time), 7)
                    const newEnd = addDays(new Date(shift.end_time), 7)

                    await fetch('/api/schedule', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_id: shift.user_id,
                            start_time: newStart.toISOString(),
                            end_time: newEnd.toISOString()
                        })
                    })
                }
                fetchShifts()
            }
        } catch (e) {
            console.error(e)
        }
    }

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
            case 'chef': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
            case 'foh': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            default: return 'bg-muted-foreground/20 text-muted-foreground border-border/30'
        }
    }

    const canManageShifts = currentUserRole === 'admin' || currentUserRole === 'chef'

    const selectedStaff = selectedCell ? staff.find(s => s.id === selectedCell.staffId) : null

    return (
        <div className="p-8 space-y-4 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <Calendar className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">Weekly Schedule</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Click on any cell to add a shift • {filteredStaff.length} staff members
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Role Filter - Only visible to Admin */}
                    {currentUserRole === 'admin' && (
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-muted-foreground" />
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-[130px] h-9 bg-card border-white/10 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-white/10">
                                    <SelectItem value="all">All Roles</SelectItem>
                                    <SelectItem value="chef">Service</SelectItem>
                                    <SelectItem value="foh">Front Desk</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Week Navigation */}
                    <div className="flex items-center gap-1 bg-card/50 rounded-lg border border-white/5 p-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCurrentWeekStart(prev => addDays(prev, -7))}
                            className="h-8 w-8 hover:bg-white/10"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="px-3 text-sm text-foreground font-medium min-w-[180px] text-center">
                            {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCurrentWeekStart(prev => addDays(prev, 7))}
                            className="h-8 w-8 hover:bg-white/10"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Copy Week Button */}
                    {canManageShifts && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyPreviousWeek}
                            className="border-white/10 hover:bg-white/5 text-foreground"
                        >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Last Week
                        </Button>
                    )}
                </div>
            </div>

            {/* Schedule Grid - ADP/Dayforce Style */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <Card className="bg-card/40 border-white/5 overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left p-3 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-sidebar/30 sticky left-0 z-10 min-w-[200px]">
                                            Employee
                                        </th>
                                        {weekDays.map((day, i) => {
                                            const isToday = isSameDay(day, new Date())
                                            return (
                                                <th
                                                    key={i}
                                                    className={`text-center p-3 text-xs font-bold uppercase tracking-wider min-w-[120px] ${isToday ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                                                        }`}
                                                >
                                                    <div>{format(day, 'EEE')}</div>
                                                    <div className={`text-lg ${isToday ? 'text-primary' : 'text-foreground'}`}>
                                                        {format(day, 'd')}
                                                    </div>
                                                </th>
                                            )
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStaff.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-12 text-muted-foreground">
                                                No staff members found. Adjust filters or add team members.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredStaff.map((member) => (
                                            <tr key={member.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                                {/* Employee Name Column (Sticky) */}
                                                <td className="p-3 bg-sidebar/30 sticky left-0 z-10 border-r border-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-foreground">
                                                            {member.email.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-foreground truncate max-w-[120px]">
                                                                {member.email.split('@')[0]}
                                                            </div>
                                                            <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${getRoleBadgeColor(member.role)}`}>
                                                                {member.role}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Day Cells */}
                                                {weekDays.map((day, dayIndex) => {
                                                    const shift = getShiftForCell(member.id, day)
                                                    const isToday = isSameDay(day, new Date())

                                                    return (
                                                        <td
                                                            key={dayIndex}
                                                            className={`p-1 text-center relative group cursor-pointer transition-colors ${isToday ? 'bg-primary/5' : ''
                                                                } ${canManageShifts ? 'hover:bg-white/5' : ''}`}
                                                            onClick={() => !shift && handleCellClick(member.id, day)}
                                                        >
                                                            {shift ? (
                                                                <div className="relative bg-primary/20 border border-primary/30 rounded-lg p-2 mx-1">
                                                                    <div className="text-xs font-bold text-primary">
                                                                        {format(new Date(shift.start_time), 'HH:mm')}
                                                                    </div>
                                                                    <div className="text-[10px] text-primary/70">
                                                                        {format(new Date(shift.end_time), 'HH:mm')}
                                                                    </div>
                                                                    {canManageShifts && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                                handleDeleteShift(shift.id)
                                                                            }}
                                                                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        >
                                                                            <X className="w-3 h-3 text-foreground" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                canManageShifts && (
                                                                    <div className="h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <Plus className="w-5 h-5 text-muted-foreground" />
                                                                    </div>
                                                                )
                                                            )}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Add Shift Dialog */}
            <Dialog open={!!selectedCell} onOpenChange={(open) => !open && setSelectedCell(null)}>
                <DialogContent className="bg-card border-white/10 text-foreground max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary" />
                            Add Shift
                        </DialogTitle>
                    </DialogHeader>
                    {selectedCell && selectedStaff && (
                        <div className="space-y-4 pt-2">
                            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                                        {selectedStaff.email.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-medium text-foreground">{selectedStaff.email.split('@')[0]}</div>
                                        <div className="text-xs text-muted-foreground">{format(selectedCell.date, 'EEEE, MMM d')}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Start Time</Label>
                                    <Input
                                        type="time"
                                        value={shiftTimes.start}
                                        onChange={(e) => setShiftTimes({ ...shiftTimes, start: e.target.value })}
                                        className="bg-sidebar/50 border-white/10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">End Time</Label>
                                    <Input
                                        type="time"
                                        value={shiftTimes.end}
                                        onChange={(e) => setShiftTimes({ ...shiftTimes, end: e.target.value })}
                                        className="bg-sidebar/50 border-white/10"
                                    />
                                </div>
                            </div>

                            {/* Quick Templates */}
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Quick Templates</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { label: 'Morning', start: '06:00', end: '14:00' },
                                        { label: 'Day', start: '09:00', end: '17:00' },
                                        { label: 'Evening', start: '16:00', end: '00:00' },
                                    ].map(template => (
                                        <button
                                            key={template.label}
                                            onClick={() => setShiftTimes({ start: template.start, end: template.end })}
                                            className="py-2 px-3 text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                                        >
                                            {template.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Button
                                className="w-full bg-primary hover:bg-primary"
                                onClick={handleCreateShift}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Shift'}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
