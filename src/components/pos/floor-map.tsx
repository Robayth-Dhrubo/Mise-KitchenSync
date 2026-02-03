'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, Clock, Loader2, AlertCircle, Calendar, Receipt, ChevronRight, X, ExternalLink, History } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Location, POSOrder, Reservation } from '@/lib/types/pos'
import { Separator } from '@/components/ui/separator'
import LocationLedger from './location-ledger'

// Removed local Location interface

export default function FloorMap() {
    const router = useRouter()
    const [supabase] = useState(() => createClient())
    const [locations, setLocations] = useState<Location[]>([])
    const [view, setView] = useState<'floor' | 'rooms'>('floor')
    const [isEditMode, setIsEditMode] = useState(false)
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
    const [reservations, setReservations] = useState<Reservation[]>([])
    const [preOrders, setPreOrders] = useState<POSOrder[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    // Architect Logic
    const containerRef = useRef<HTMLDivElement>(null)
    const [interactionState, setInteractionState] = useState<{
        type: 'drag' | 'resize' | 'rotate'
        id: string
        startX: number
        startY: number
        initialX: number
        initialY: number
        initialW: number
        initialH: number
        initialR: number
        handle?: 'e' | 's' | 'se'
    } | null>(null)

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (interactionState) handleInteractionEnd()
        }
        window.addEventListener('mouseup', handleGlobalMouseUp)
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
    }, [interactionState])

    const handleInteractionStart = (e: React.MouseEvent | React.TouchEvent, location: Location, type: 'drag' | 'resize' | 'rotate', handle?: 'e' | 's' | 'se') => {
        if (!isEditMode) return
        e.stopPropagation()
        // Prevent scroll on touch devices when starting an interaction
        // if ('touches' in e) e.preventDefault() 

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY

        setInteractionState({
            type,
            id: location.id,
            startX: clientX,
            startY: clientY,
            initialX: location.x_pos,
            initialY: location.y_pos,
            initialW: location.width || 0,
            initialH: location.height || 0,
            initialR: location.rotation || 0,
            handle
        })
    }

    const handleInteractionMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!interactionState || !containerRef.current) return

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY

        const rect = containerRef.current.getBoundingClientRect()
        const deltaX = clientX - interactionState.startX
        const deltaY = clientY - interactionState.startY
        const deltaXPercent = (deltaX / rect.width) * 100
        const deltaYPercent = (deltaY / rect.height) * 100

        setLocations(prev => prev.map(l => {
            if (l.id !== interactionState.id) return l

            if (interactionState.type === 'drag') {
                return {
                    ...l,
                    x_pos: Math.max(0, Math.min(100, interactionState.initialX + deltaXPercent)),
                    y_pos: Math.max(0, Math.min(100, interactionState.initialY + deltaYPercent))
                }
            } else if (interactionState.type === 'resize') {
                const newW = interactionState.initialW + (interactionState.handle?.includes('e') ? deltaXPercent : 0)
                const newH = interactionState.initialH + (interactionState.handle?.includes('s') ? deltaYPercent : 0)
                return {
                    ...l,
                    width: Math.max(2, newW),
                    height: Math.max(2, newH)
                }
            } else if (interactionState.type === 'rotate') {
                return { ...l, rotation: (interactionState.initialR + deltaX) % 360 }
            }
            return l
        }))
    }

    const handleInteractionEnd = async () => {
        if (!interactionState) return
        const location = locations.find(l => l.id === interactionState.id)
        if (location) {
            const { error } = await supabase.from('locations').update({
                x_pos: location.x_pos,
                y_pos: location.y_pos,
                width: location.width,
                height: location.height,
                rotation: location.rotation
            }).eq('id', location.id)
            if (error) {
                console.error('Error updating location:', error.message, error.details, error.hint)
            }
        }
        setInteractionState(null)
    }

    useEffect(() => {
        const fetchData = async () => {
            // Fetch locations
            const { data: locData } = await supabase
                .from('locations')
                .select('*')
                .order('name')

            // Fetch upcoming reservations for today
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const tonight = new Date()
            tonight.setHours(23, 59, 59, 999)

            const { data: resData } = await supabase
                .from('reservations')
                .select('*')
                .gte('reservation_time', today.toISOString())
                .lte('reservation_time', tonight.toISOString())
                .eq('status', 'confirmed')

            // Fetch pending pre-orders for today
            const { data: orderData } = await supabase
                .from('orders')
                .select('*')
                .eq('is_preorder', true)
                .eq('preparation_status', 'pending')
                .gte('scheduled_for', today.toISOString())
                .lte('scheduled_for', tonight.toISOString())

            if (locData) setLocations(locData)
            if (resData) setReservations(resData)
            if (orderData) setPreOrders(orderData)
            setIsLoading(false)
        }

        fetchData()

        const channel = supabase
            .channel('pos_floor_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [supabase])

    const floorElements = useMemo(() => locations.filter(l => l.type !== 'room'), [locations])
    const rooms = useMemo(() => locations.filter(l => l.type === 'room'), [locations])

    const getStatusColor = (status: Location['status']) => {
        switch (status) {
            case 'available': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            case 'occupied': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            case 'dirty': return 'bg-red-500/10 text-red-500 border-red-500/20'
            case 'reserved': return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
            default: return 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20'
        }
    }

    const checkCollision = (x: number, y: number, w: number, h: number, existing: Location[]) => {
        // Assume rough percentages for conversion validity
        // AABB Collision Detection
        return existing.some(l => {
            // For existing items, use their width/height or defaults
            // Tables default to ~10% width/height if 0
            const lW = l.width || (l.type === 'table' ? 8 : 10)
            const lH = l.height || (l.type === 'table' ? 8 : 10)

            // Convert center-based coords (x,y) to top-left for easier math, or just use center difference
            // Our system uses center-center positioning: transform: translate(-50%, -50%)
            // So x,y is the center.

            const distanceX = Math.abs(x - l.x_pos)
            const distanceY = Math.abs(y - l.y_pos)

            const minDistanceX = (w + lW) / 2
            const minDistanceY = (h + lH) / 2

            return distanceX < minDistanceX && distanceY < minDistanceY
        })
    }

    const handleAddLocation = async (type: Location['type'] = 'table', w?: number, h?: number, subtype?: string) => {
        setIsSaving(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setIsSaving(false)
            return
        }

        const isArchitectural = ['wall', 'kitchen', 'restroom', 'bar', 'entrance', 'obstacle'].includes(type)
        const baseName = type === 'wall' ? 'Wall' : type === 'table' ? 'T' : type.charAt(0).toUpperCase() + type.slice(1)

        // Determine dimensions
        const width = w || (type === 'wall' ? 20 : type === 'table' ? 8 : 30)
        const height = h || (type === 'wall' ? 2 : type === 'table' ? 8 : 20)

        // Find free position
        let bestX = 50
        let bestY = 50

        // Scan grid
        let found = false
        for (let tryY = 10; tryY <= 90; tryY += 5) {
            for (let tryX = 10; tryX <= 90; tryX += 5) {
                if (!checkCollision(tryX, tryY, width, height, locations)) {
                    bestX = tryX
                    bestY = tryY
                    found = true
                    break
                }
            }
            if (found) break
        }

        // If grid full, add random jitter to center
        if (!found) {
            bestX = 50 + (Math.random() * 10 - 5)
            bestY = 50 + (Math.random() * 10 - 5)
        }

        const newLocation = {
            user_id: user.id,
            name: view === 'floor' ? `${baseName}-${locations.length + 1}` : `${100 + locations.length}`,
            type: view === 'floor' ? type : 'room', // Force 'room' if in room view for now
            status: 'available',
            x_pos: bestX,
            y_pos: bestY,
            width: w || (type === 'wall' ? 20 : type === 'table' ? 0 : 30), // 0 for table means use css class default
            height: h || (type === 'wall' ? 2 : type === 'table' ? 0 : 20),
            rotation: 0,
            capacity: type === 'table' ? 2 : 0,
            metadata: { color: 'neutral', subtype }
        }

        const { error } = await supabase.from('locations').insert(newLocation)
        if (error) console.error('Error adding location:', error)
        setIsSaving(false)
    }

    const handleDeleteLocation = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('Are you sure you want to delete this location?')) return

        setIsSaving(true)
        const { error } = await supabase.from('locations').delete().eq('id', id)
        if (error) console.error('Error deleting location:', error)
        setIsSaving(false)
    }

    const handleUpdatePosition = async (id: string, x: number, y: number) => {
        const { error } = await supabase.from('locations').update({ x_pos: x, y_pos: y }).eq('id', id)
        if (error) console.error('Error updating position:', error)
    }

    const handleUpdateCapacity = async (id: string, capacity: number, e: React.MouseEvent) => {
        e.stopPropagation()
        const { error } = await supabase.from('locations').update({ capacity }).eq('id', id)
        if (error) console.error('Error updating capacity:', error)
    }







    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="p-12 h-full flex flex-col gap-10 overflow-y-auto custom-scrollbar bg-neutral-950/50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 sm:gap-0">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight uppercase leading-none">Command Center</h1>
                    <p className="text-neutral-500 font-bold uppercase text-[11px] tracking-[0.3em] mt-3">Live Infrastructure Monitoring</p>
                </div>

                <div className="flex flex-col sm:items-end gap-4">
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={cn(
                                "h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all gap-2",
                                isEditMode ? "bg-amber-500 text-black hover:bg-amber-400" : "text-neutral-500 hover:text-white"
                            )}
                        >
                            {isEditMode ? 'EXIT EDITOR' : 'EDIT FLOOR'}
                        </Button>

                        <div className="w-[1px] h-6 bg-white/10 mx-1" />

                        {(['floor', 'rooms'] as const).map((v) => (
                            <Button
                                key={v}
                                variant="ghost"
                                size="sm"
                                onClick={() => setView(v)}
                                className={cn(
                                    "h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all",
                                    view === v ? "bg-emerald-600 text-white shadow-lg" : "text-neutral-500 hover:text-white"
                                )}
                            >
                                {v === 'floor' ? 'Restaurant Floor' : 'In-Room Dining'}
                            </Button>
                        ))}
                    </div>
                    <div className="flex gap-2">

                        <Badge variant="outline" className="h-7 px-4 bg-emerald-500/5 text-emerald-500 border-emerald-500/10 rounded-full font-black uppercase text-[8px] tracking-[0.2em]">
                            {locations.filter(l => l.status === 'available').length} FREE
                        </Badge>
                        <Badge variant="outline" className="h-7 px-4 bg-amber-500/5 text-amber-500 border-amber-500/10 rounded-full font-black uppercase text-[8px] tracking-[0.2em]">
                            {locations.filter(l => l.status === 'occupied').length} LIVE
                        </Badge>
                    </div>
                </div>
            </div>

            <div className="flex-1 relative min-h-[600px] border border-white/5 bg-black/40 rounded-[48px] overflow-hidden shadow-2xl">
                {/* Visual Map Grid */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle, #fff 1.5px, transparent 1.5px)', backgroundSize: '48px 48px' }}
                />

                {view === 'floor' ? (
                    floorElements.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-600 p-12 text-center">
                            <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                            <span className="font-black uppercase tracking-[0.2em] text-[10px]">No infrastructure established</span>
                            <Button
                                variant="ghost"
                                className="mt-6 text-[10px] font-black uppercase tracking-widest hover:text-emerald-500 transition-colors"
                                onClick={async () => {
                                    await supabase.rpc('initialize_sample_locations')
                                    window.location.reload() // Force reload to ensure all real-time channels and states are fresh
                                }}
                            >
                                Initialize Environment
                            </Button>
                        </div>
                    ) : (
                        <div
                            ref={containerRef}
                            className="relative w-full h-full"
                            onMouseMove={handleInteractionMove}
                            onTouchMove={handleInteractionMove}
                            onTouchEnd={handleInteractionEnd}
                            onMouseUp={handleInteractionEnd}
                            onMouseLeave={handleInteractionEnd}
                        >
                            {/* Safe Area Container: Minimal inset to maximize map spread */}
                            <div className="absolute inset-4 sm:inset-8">
                                {floorElements.map((element) => {
                                    const hasReservation = reservations.some(r => r.location_id === element.id)
                                    const hasPreOrder = preOrders.some(p => p.location_id === element.id)

                                    // Base style for positioning
                                    const style = {
                                        left: `${element.x_pos}%`,
                                        top: `${element.y_pos}%`,
                                        width: element.width ? `${element.width}%` : undefined,
                                        height: element.height ? `${element.height}%` : undefined,
                                        transform: `translate(-50%, -50%) rotate(${element.rotation || 0}deg)`
                                    }

                                    return (
                                        <div
                                            key={element.id}
                                            className={cn(
                                                "absolute transition-all duration-300 cursor-pointer group flex items-center justify-center overflow-hidden touch-none",
                                                // Table Styling (Default Squircles)
                                                element.type === 'table' && "w-24 h-24 rounded-2xl border-2 shadow-2xl backdrop-blur-xl",
                                                element.type === 'table' && element.status === 'available' && "bg-black/40 border-white/5 hover:border-emerald-500/40 hover:bg-emerald-500/5 shadow-emerald-500/5",
                                                element.type === 'table' && element.status === 'occupied' && "bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40 shadow-amber-500/5",
                                                element.type === 'table' && element.status === 'dirty' && "bg-red-500/10 border-red-500/20 hover:border-red-500/40 shadow-red-500/5",

                                                // Wall Styling
                                                element.type === 'wall' && "bg-neutral-800 rounded-sm shadow-xl border border-white/5",

                                                // Zone Styling (Kitchen, Restroom, etc)
                                                // Zone Styling (Kitchen, Restroom, etc)
                                                ['kitchen', 'restroom', 'bar', 'entrance'].includes(element.type) && "bg-black/20 border-2 border-dashed border-white/10 rounded-xl hover:border-emerald-500/20 hover:bg-emerald-500/5",

                                                // Custom Entry/Exit Styling
                                                element.type === 'entrance' && element.metadata?.subtype === 'entry' && "border-emerald-500/50 bg-emerald-500/10",
                                                element.type === 'entrance' && element.metadata?.subtype === 'exit' && "border-red-500/50 bg-red-500/10"
                                            )}
                                            style={style}
                                            onMouseDown={(e) => handleInteractionStart(e, element, 'drag')}
                                            onTouchStart={(e) => handleInteractionStart(e, element, 'drag')}
                                            onClick={(e) => {
                                                if (interactionState) return
                                                !isEditMode && setSelectedLocation(element)
                                            }}
                                        >
                                            {/* Handles for Edit Mode */}
                                            {isEditMode && (
                                                <>
                                                    {['wall', 'kitchen', 'restroom', 'obstacle'].includes(element.type) && (
                                                        <>
                                                            {/* Resize Right */}
                                                            <div
                                                                className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-emerald-500/50 z-50 transition-colors"
                                                                onMouseDown={(e) => handleInteractionStart(e, element, 'resize', 'e')}
                                                            />
                                                            {/* Resize Bottom */}
                                                            <div
                                                                className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-emerald-500/50 z-50 transition-colors"
                                                                onMouseDown={(e) => handleInteractionStart(e, element, 'resize', 's')}
                                                            />
                                                            {/* Resize Corner */}
                                                            <div
                                                                className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize bg-white/20 hover:bg-emerald-500 z-50 rounded-tl-sm transition-colors"
                                                                onMouseDown={(e) => handleInteractionStart(e, element, 'resize', 'se')}
                                                            />
                                                            {/* Rotate Handle (Top Center outside) */}
                                                            <div
                                                                className="absolute -top-4 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/20 rounded-full cursor-grab hover:bg-amber-500 flex items-center justify-center"
                                                                onMouseDown={(e) => handleInteractionStart(e, element, 'rotate')}
                                                            >
                                                                <div className="w-1.5 h-1.5 bg-black rounded-full" />
                                                            </div>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                            {/* --- CONTENT FOR TABLES --- */}
                                            {element.type === 'table' && (
                                                <>
                                                    <div className="relative z-10 text-center">
                                                        <span className="text-base font-black text-white tracking-tighter uppercase transition-transform duration-500 group-hover:scale-110 block">
                                                            {element.name}
                                                        </span>
                                                    </div>

                                                    <div className={cn(
                                                        "absolute inset-1 rounded-xl border border-dashed opacity-20 group-hover:opacity-40 transition-opacity",
                                                        element.status === 'available' ? "border-emerald-500 animate-[spin_10s_linear_infinite]" :
                                                            element.status === 'occupied' ? "border-amber-500 animate-[spin_15s_linear_infinite]" :
                                                                element.status === 'dirty' ? "border-red-500" : "border-white"
                                                    )} />

                                                    {/* Table Badges */}
                                                    <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                                                        {hasReservation && <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center animate-pulse"><Calendar className="w-3 h-3 text-white" /></div>}
                                                        {hasPreOrder && <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center animate-pulse"><Clock className="w-3 h-3 text-black" /></div>}
                                                    </div>

                                                    {/* Hover Info */}
                                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0 z-20">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <div className="flex items-center gap-1.5 text-[10px] font-black text-white uppercase tracking-widest"><Users className="w-3 h-3 text-emerald-500" />{element.capacity}</div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {/* --- CONTENT FOR ZONES --- */}
                                            {['kitchen', 'restroom', 'bar', 'entrance'].includes(element.type) && (
                                                <div className="flex flex-col items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.3em]">{element.type === 'entrance' ? element.metadata?.subtype || 'DOOR' : element.type}</span>
                                                    {element.type !== 'entrance' && <span className="text-xs font-black text-white tracking-tight uppercase">{element.name}</span>}
                                                    {element.type === 'entrance' && (
                                                        <div className={cn(
                                                            "mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                                                            element.metadata?.subtype === 'entry' ? "bg-emerald-500 text-black" :
                                                                element.metadata?.subtype === 'exit' ? "bg-red-500 text-white" : "bg-white/10 text-white"
                                                        )}>
                                                            {element.metadata?.subtype === 'entry' ? 'ENTER' : element.metadata?.subtype === 'exit' ? 'EXIT' : 'DOOR'}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Edit Mode Toolbar Layer */}
                                            {isEditMode && (
                                                <div className="flex gap-1.5 w-full">
                                                    <Button
                                                        size="icon" variant="ghost"
                                                        className="w-8 h-8 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white"
                                                        onClick={(e) => handleDeleteLocation(element.id, e)}
                                                    >
                                                        <AlertCircle className="w-4 h-4" />
                                                    </Button>
                                                    {element.type === 'table' && (
                                                        <>
                                                            <Button size="sm" variant="ghost" className="flex-1 h-8 rounded-lg bg-white/5 text-[7px] font-black" onClick={(e) => handleUpdateCapacity(element.id, element.capacity + 1, e)}>+ PPL</Button>
                                                            <Button size="sm" variant="ghost" className="flex-1 h-8 rounded-lg bg-white/5 text-[7px] font-black" onClick={(e) => handleUpdateCapacity(element.id, Math.max(1, element.capacity - 1), e)}>- PPL</Button>
                                                        </>
                                                    )}
                                                </div>

                                            )
                                            }
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                ) : (
                    rooms.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-600 p-12 text-center">
                            <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                            <span className="font-black uppercase tracking-[0.2em] text-[10px]">No IRD Infrastructure Detected</span>
                            <Button
                                variant="ghost"
                                className="mt-6 text-[10px] font-black uppercase tracking-widest hover:text-emerald-500 transition-colors"
                                onClick={async () => {
                                    await supabase.rpc('initialize_sample_locations')
                                    window.location.reload()
                                }}
                            >
                                provision rooms
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 p-12 sm:p-16 overflow-y-auto h-full content-start custom-scrollbar">
                            {rooms.map((room) => {
                                const hasReservation = reservations.some(r => r.location_id === room.id)
                                const hasPreOrder = preOrders.some(p => p.location_id === room.id)

                                return (
                                    <div
                                        key={room.id}
                                        className={cn(
                                            "aspect-square rounded-[32px] border-2 transition-all duration-500 cursor-pointer group shadow-2xl backdrop-blur-xl flex flex-col items-center justify-center relative overflow-hidden",
                                            room.status === 'available' ? "bg-black/40 border-white/5 hover:border-emerald-500/40 hover:bg-emerald-500/5 shadow-emerald-500/5" :
                                                room.status === 'occupied' ? "bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40 shadow-amber-500/5" :
                                                    room.status === 'dirty' ? "bg-red-500/10 border-red-500/20 hover:border-red-500/40 shadow-red-500/5" :
                                                        "bg-black/80 border-white/5"
                                        )}
                                        onClick={() => !isEditMode && setSelectedLocation(room)}
                                    >
                                        {/* Status Glow / Ring */}
                                        <div className={cn(
                                            "absolute inset-2 rounded-[24px] border border-dashed opacity-10 group-hover:opacity-30 transition-opacity",
                                            room.status === 'available' ? "border-emerald-500" :
                                                room.status === 'occupied' ? "border-amber-500" :
                                                    room.status === 'dirty' ? "border-red-500" : "border-white"
                                        )} />

                                        {/* Top Indicators Badge Container */}
                                        <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                                            {hasReservation && (
                                                <div className="w-6 h-6 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/40 animate-pulse">
                                                    <Calendar className="w-3.5 h-3.5 text-white" />
                                                </div>
                                            )}
                                            {hasPreOrder && (
                                                <div className="w-6 h-6 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/40 animate-pulse">
                                                    <Clock className="w-3.5 h-3.5 text-black" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="relative z-10 text-center space-y-1">
                                            <div className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.3em] group-hover:text-neutral-400 transition-colors">Room</div>
                                            <div className="text-3xl font-black text-white leading-none tracking-tighter uppercase group-hover:scale-110 transition-transform duration-500">{room.name}</div>
                                        </div>

                                        {/* Hover Revealed Info (Bottom Slide Up) - Only show if NOT in edit mode */}
                                        {!isEditMode && (
                                            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0 z-20">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-widest">
                                                        <Users className="w-4 h-4 text-emerald-500" />
                                                        CAPACITY: {room.capacity}
                                                    </div>
                                                    {room.status === 'occupied' && (
                                                        <div className="flex items-center gap-2 text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">
                                                            <Clock className="w-4 h-4" />
                                                            Active: 2h 15m
                                                        </div>
                                                    )}
                                                    <Button size="sm" variant="ghost" className="mt-2 h-9 px-6 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10">
                                                        PLACE ORDER
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Edit Mode Toolbar Layer */}
                                        {isEditMode && (
                                            <div className="absolute inset-0 bg-black/90 z-30 flex flex-col items-center justify-center p-6 gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Edit Context</span>
                                                    <Button size="icon" variant="ghost" className="w-9 h-9 rounded-xl bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white" onClick={(e) => handleDeleteLocation(room.id, e)}><AlertCircle className="w-5 h-5" /></Button>
                                                </div>

                                                <div className="flex flex-col items-center gap-2 w-full">
                                                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Capacity: <span className="text-white">{room.capacity}</span></span>
                                                    <div className="grid grid-cols-2 gap-3 w-full">
                                                        <Button variant="ghost" className="h-10 rounded-xl bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest gap-2" onClick={(e) => handleUpdateCapacity(room.id, Math.max(1, room.capacity - 1), e)}><Users className="w-3.5 h-3.5" /> -</Button>
                                                        <Button variant="ghost" className="h-10 rounded-xl bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest gap-2" onClick={(e) => handleUpdateCapacity(room.id, room.capacity + 1, e)}><Users className="w-3.5 h-3.5" /> +</Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )
                )}


                {/* Architect Palette Toolbar */}
                {isEditMode && view === 'floor' && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl z-40 transition-all duration-500 animate-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-1 pr-4 border-r border-white/10 mr-2">
                            <span className="text-[10px] font-black uppercase text-neutral-500 tracking-widest pl-2">Palette</span>
                        </div>
                        <Button onClick={() => handleAddLocation('table')} variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500 text-neutral-400 group" title="Add Table"><div className="w-5 h-5 rounded-[10px] border-2 border-current transition-transform group-hover:scale-110" /></Button>
                        <Button onClick={() => handleAddLocation('wall')} variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl hover:bg-neutral-500/10 hover:text-white text-neutral-400 group" title="Add Wall"><div className="w-6 h-1.5 bg-current rounded-sm transition-transform group-hover:scale-110" /></Button>
                        <Button onClick={() => handleAddLocation('kitchen')} variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl hover:bg-amber-500/10 hover:text-amber-500 text-neutral-400 group" title="Add Kitchen"><div className="w-5 h-5 rounded-md border-2 border-dashed border-current transition-transform group-hover:scale-110" /></Button>
                        <Button onClick={() => handleAddLocation('restroom')} variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl hover:bg-blue-500/10 hover:text-blue-500 text-neutral-400 group" title="Add Restroom"><div className="w-4 h-4 rounded-sm border border-current flex items-center justify-center text-[8px] font-black scale-110">W</div></Button>
                        <Button onClick={() => handleAddLocation('entrance', undefined, undefined, 'entry')} variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500 text-neutral-400 group" title="Add Entry"><div className="w-5 h-5 rounded-md border-2 border-current border-dashed flex items-center justify-center text-[8px] font-black text-emerald-500">IN</div></Button>
                        <Button onClick={() => handleAddLocation('entrance', undefined, undefined, 'exit')} variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl hover:bg-red-500/10 hover:text-red-500 text-neutral-400 group" title="Add Exit"><div className="w-5 h-5 rounded-md border-2 border-current border-dashed flex items-center justify-center text-[8px] font-black text-red-500">OUT</div></Button>
                        <Button onClick={() => handleAddLocation('obstacle')} variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl hover:bg-red-500/10 hover:text-red-500 text-neutral-400 group" title="Add Obstacle"><div className="w-5 h-5 rounded-md bg-white/10 border border-current flex items-center justify-center"><X className="w-3 h-3" /></div></Button>
                    </div>
                )}

                {/* Room Management Toolbar */}
                {isEditMode && view === 'rooms' && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl z-40 transition-all duration-500 animate-in slide-in-from-bottom-4">
                        <Button onClick={() => handleAddLocation('room')} className="h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest group gap-2">
                            <Users className="w-4 h-4" />
                            Add New Room
                        </Button>
                    </div>
                )}

                {selectedLocation && (
                    <LocationLedger
                        location={selectedLocation}
                        onClose={() => setSelectedLocation(null)}
                        onOpenTerminal={() => {
                            router.push(`/pos/terminal?location_id=${selectedLocation.id}`)
                            setSelectedLocation(null)
                        }}
                    />
                )}
            </div>
        </div >
    )
}
