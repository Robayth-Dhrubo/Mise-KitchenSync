'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Coffee, Bell, CheckCircle2, Clock, Loader2, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Order {
    id: string
    table_or_room: string
    status: string
    preparation_status: string
    total_amount: number
    created_at: string
    order_items: any[]
}

export default function IrdDashboard() {
    const [supabase] = useState(() => createClient())
    const [orders, setOrders] = useState<Order[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const [rooms, setRooms] = useState<any[]>([])
    const [isManageRoomsOpen, setIsManageRoomsOpen] = useState(false)
    const [newRoomNumber, setNewRoomNumber] = useState('')
    const [newRoomCapacity, setNewRoomCapacity] = useState('2')

    const fetchOrders = async () => {
        const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*, recipe:recipes(name))')
            .eq('type', 'room_service')
            .neq('status', 'cancelled')
            .order('created_at', { ascending: false })

        if (data) setOrders(data)
        setIsLoading(false)
    }

    const fetchRooms = async () => {
        const { data } = await supabase
            .from('locations')
            .select('*')
            .eq('type', 'room')
            .order('name', { ascending: true }) // Assuming alphanumeric room names
        if (data) setRooms(data)
    }

    useEffect(() => {
        fetchOrders()
        fetchRooms()
        const channel = supabase
            .channel('ird_orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: 'type=eq.room_service' }, fetchOrders)
            .subscribe()

        const roomChannel = supabase
            .channel('ird_rooms')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'locations', filter: 'type=eq.room' }, fetchRooms)
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
            supabase.removeChannel(roomChannel)
        }
    }, [supabase])

    const updateStatus = async (orderId: string, status: string) => {
        const { error } = await supabase
            .from('orders')
            .update({ preparation_status: status })
            .eq('id', orderId)

        if (error) toast.error('Failed to update status')
        else toast.success(`Order marked as ${status}`)
    }

    const handleAddRoom = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newRoomNumber) return

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase
            .from('locations')
            .insert({
                user_id: user.id,
                name: newRoomNumber,
                type: 'room',
                capacity: parseInt(newRoomCapacity) || 2,
                status: 'available'
            })

        if (error) {
            toast.error('Failed to add room')
            console.error(error)
        } else {
            toast.success(`Room ${newRoomNumber} added`)
            setNewRoomNumber('')
            setNewRoomCapacity('2')
        }
    }

    const handleUpdateCapacity = async (roomId: string, currentCap: number, delta: number) => {
        const newCap = Math.max(1, currentCap + delta)
        const { error } = await supabase
            .from('locations')
            .update({ capacity: newCap })
            .eq('id', roomId)

        if (error) {
            toast.error('Failed to update capacity')
        } else {
            // Optimistic update
            setRooms(rooms.map(r => r.id === roomId ? { ...r, capacity: newCap } : r))
        }
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight uppercase leading-none">IRD Dashboard</h1>
                    <p className="text-neutral-500 font-bold uppercase text-[11px] tracking-[0.3em] mt-3">Active Guest Service Queue</p>
                </div>

                <Dialog open={isManageRoomsOpen} onOpenChange={setIsManageRoomsOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest gap-2 shadow-lg shadow-emerald-900/20 transition-all active:scale-95">
                            <Plus className="w-4 h-4" /> Manage Rooms
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-neutral-900 border-white/10 sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black text-white uppercase">Manage Hotel Rooms</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6 pt-4">
                            {/* Add Room Form */}
                            <form onSubmit={handleAddRoom} className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                <h3 className="text-xs font-black text-white uppercase tracking-widest">Add New Room</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-[9px] font-bold text-neutral-500 uppercase">Room Number / Name</label>
                                        <Input
                                            placeholder="e.g. 101, Penthouse"
                                            value={newRoomNumber}
                                            onChange={e => setNewRoomNumber(e.target.value)}
                                            className="bg-neutral-950 border-white/10 text-white font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-neutral-500 uppercase">Capacity</label>
                                        <Input
                                            type="number"
                                            value={newRoomCapacity}
                                            onChange={e => setNewRoomCapacity(e.target.value)}
                                            className="bg-neutral-950 border-white/10 text-white font-bold"
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase">
                                    Add Room
                                </Button>
                            </form>

                            {/* Existing Rooms List */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest border-b border-white/10 pb-2 mb-2">Existing Rooms ({rooms.length})</h3>
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2">
                                    {rooms.length === 0 ? (
                                        <div className="text-neutral-500 text-xs italic text-center py-4">No rooms added yet.</div>
                                    ) : (
                                        rooms.map(room => (
                                            <div key={room.id} className="flex justify-between items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-white text-sm">{room.name}</span>
                                                    <span className="text-[10px] text-neutral-500 uppercase">Cap: {room.capacity}</span>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleUpdateCapacity(room.id, room.capacity, -1)}
                                                        className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-[10px] font-black transition-colors"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="w-6 text-center text-[10px] font-bold text-neutral-400">CAP</span>
                                                    <button
                                                        onClick={() => handleUpdateCapacity(room.id, room.capacity, 1)}
                                                        className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-[10px] font-black transition-colors"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {orders.length === 0 ? (
                    <div className="col-span-full py-48 flex flex-col items-center justify-center border border-white/5 bg-black/20 rounded-[48px] text-neutral-600 shadow-inner">
                        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
                            <Coffee className="w-10 h-10 opacity-20" />
                        </div>
                        <span className="font-black uppercase tracking-[0.3em] text-[10px]">No active guest requests</span>
                    </div>
                ) : (
                    orders.map((order) => (
                        <Card key={order.id} className="glass-card overflow-hidden rounded-[32px] border-white/10 shadow-2xl transition-all hover:scale-[1.02] hover:border-emerald-500/30">
                            <CardHeader className="p-8 border-b border-white/5 flex flex-row items-center justify-between space-y-0 bg-white/[0.02]">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                        <Bell className="w-6 h-6 text-amber-500 animate-pulse" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white leading-none uppercase tracking-tighter">{order.table_or_room}</h3>
                                        <span className="text-[9px] text-neutral-500 font-black uppercase tracking-widest mt-1 block">In-Room</span>
                                    </div>
                                </div>
                                <Badge className={cn(
                                    "px-4 h-7 border-0 text-[9px] font-black uppercase tracking-widest rounded-full",
                                    order.preparation_status === 'received' ? 'bg-amber-500/20 text-amber-500' :
                                        order.preparation_status === 'preparing' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-emerald-600 text-white'
                                )}>
                                    {order.preparation_status}
                                </Badge>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="space-y-4 mb-10">
                                    {order.order_items?.map((item: any) => (
                                        <div key={item.id} className="flex justify-between items-center group">
                                            <span className="text-neutral-400 font-bold uppercase tracking-tight text-sm group-hover:text-white transition-colors">{item.recipe?.name}</span>
                                            <span className="text-neutral-600 font-black tabular-nums text-sm">X{item.quantity}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-3 pt-6 border-t border-white/5">
                                    {order.preparation_status === 'received' && (
                                        <Button
                                            className="flex-1 bg-white/5 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl h-14 transition-all active:scale-95"
                                            onClick={() => updateStatus(order.id, 'preparing')}
                                        >
                                            Engage Prep
                                        </Button>
                                    )}
                                    {order.preparation_status === 'preparing' && (
                                        <Button
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl h-14 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                                            onClick={() => updateStatus(order.id, 'ready')}
                                        >
                                            Ready for Service
                                        </Button>
                                    )}
                                    {order.preparation_status === 'ready' && (
                                        <Button
                                            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl h-14 transition-all active:scale-95"
                                            onClick={() => updateStatus(order.id, 'delivered')}
                                        >
                                            <CheckCircle2 className="w-5 h-5 mr-3" />
                                            Deliver to Room
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div >
    )
}
