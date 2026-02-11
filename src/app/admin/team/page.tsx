'use client'

import { useState, useEffect } from 'react'
import {
    Users, UserPlus, RefreshCw, AlertTriangle, Check, Search, Mail, Filter, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Label } from '@/components/ui/label' // Ensure this is imported if used in Dialog

// --- Types ---
type User = {
    id: string
    email: string
    role: 'foh' | 'chef' | 'admin' | 'pending' | null
    email_confirmed_at: string | null
    restaurant_name?: string
    created_at: string
}

export default function AdminTeamPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    // User Management State
    const [users, setUsers] = useState<User[]>([])

    // Invite State
    const [isInviteOpen, setIsInviteOpen] = useState(false)
    const [emailList, setEmailList] = useState('')
    const [inviteRole, setInviteRole] = useState<'foh' | 'chef' | 'admin'>('foh')
    const [isInviting, setIsInviting] = useState(false)
    const [inviteResult, setInviteResult] = useState<any>(null)

    // --- Data Fetching ---
    const fetchData = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const usersRes = await fetch('/api/admin/users')
            const usersData = await usersRes.json()

            if (!usersRes.ok) throw new Error(usersData.error || 'Failed to fetch users')
            if (usersData.users) setUsers(usersData.users)

        } catch (err: any) {
            setError(err.message || 'Failed to load dashboard data')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    // --- User Actions ---
    const handleInvite = async () => {
        const emails = emailList.split(/[\n,;]/).map(e => e.trim()).filter(e => e.length > 0)
        if (!emails.length) return
        setIsInviting(true)
        setInviteResult(null)
        try {
            const res = await fetch('/api/admin/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emails, role: inviteRole }),
            })
            const data = await res.json()
            setInviteResult(data)
            if (data.results?.some((r: any) => r.success)) {
                setEmailList('')
                fetchData()
                // Don't close immediately so they can see result, or close? 
                // Let's keep open to show success
            }
        } catch (err: any) {
            console.error(err)
            setInviteResult({ message: err.message })
        } finally { setIsInviting(false) }
    }

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, action: 'update_role', value: newRole })
            })
            fetchData()
        } catch (e) { console.error(e) }
    }

    const handleConfirmUser = async (userId: string) => {
        try {
            await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, action: 'confirm_email' })
            })
            fetchData()
        } catch (e) { console.error(e) }
    }

    // Stats
    const stats = {
        users: users.length,
        pending: users.filter(u => u.role === 'pending').length,
        admins: users.filter(u => u.role === 'admin').length
    }

    // Filter
    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.restaurant_name && u.restaurant_name.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tighter flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary" />
                        Team & IAM
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage staff, roles, and access permissions.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={fetchData} size="sm" className="border-white/10 hover:bg-white/5 text-foreground">
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>

                    <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary text-foreground hover:bg-primary shadow-lg shadow-primary/20">
                                <UserPlus className="w-4 h-4 mr-2" />
                                Invite Member
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-white/10 text-foreground sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Invite New Team Members</DialogTitle>
                                <DialogDescription className="text-muted-foreground">
                                    Send email invitations to join your restaurant&apos;s workspace.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">EMAIL ADDRESSES</Label>
                                    <Textarea
                                        placeholder="chef@mise.com, server@mise.com"
                                        className="bg-sidebar/50 border-white/10 text-foreground min-h-[100px]"
                                        value={emailList}
                                        onChange={e => setEmailList(e.target.value)}
                                    />
                                    <p className="text-[10px] text-muted-foreground">Separate multiple emails with commas or new lines.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">ASSIGN ROLE</Label>
                                    <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                                        <SelectTrigger className="bg-sidebar/50 border-white/10 text-foreground"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-card border-white/10">
                                            <SelectItem value="foh">Front Desk (FOH)</SelectItem>
                                            <SelectItem value="chef">Kitchen (Chef)</SelectItem>
                                            <SelectItem value="admin">Administrator</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleInvite} disabled={isInviting || !emailList} className="w-full bg-primary text-foreground hover:bg-primary">
                                    {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Invites'}
                                </Button>
                                {inviteResult && (
                                    <div className={`text-xs p-3 rounded-lg border ${inviteResult.results?.some((r: any) => r.success) ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                        {inviteResult.message}
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {error && (
                <Alert className="bg-red-500/10 border-red-500/20 text-red-500">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>System Alert</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="grid md:grid-cols-4 gap-6">
                {/* Pending Approvals Side Column - Prominent if any */}
                {users.filter(u => u.role === 'pending').length > 0 && (
                    <div className="md:col-span-4">
                        <Alert className="bg-yellow-500/10 border-yellow-500/20 text-yellow-500 mb-6">
                            <AlertTriangle className="h-5 w-5" />
                            <AlertTitle className="text-lg font-bold">Action Required</AlertTitle>
                            <AlertDescription className="mt-2">
                                You have {users.filter(u => u.role === 'pending').length} pending user approvals.
                                Review them in the list below.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {/* Main Directory */}
                <div className="md:col-span-4 space-y-4">
                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card/30 p-4 rounded-xl border border-white/5">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by email or name..."
                                className="pl-9 bg-sidebar/50 border-white/10 text-foreground"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {filteredUsers.length} Users</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><UserPlus className="w-4 h-4" /> {stats.pending} Pending</span>
                        </div>
                    </div>

                    <Card className="bg-card/50 border-white/5">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableHead className="pl-6">User</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Joined</TableHead>
                                        <TableHead className="text-right pr-6">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                No users found matching &quot;{searchTerm}&quot;
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredUsers.map(u => (
                                            <TableRow key={u.id} className="border-white/5 hover:bg-white/5">
                                                <TableCell className="pl-6 font-medium">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#333] to-[#A8A29E] flex items-center justify-center text-xs font-bold text-foreground border border-white/10">
                                                            {u.email.slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="text-foreground">{u.email}</div>
                                                            {u.restaurant_name && <div className="text-xs text-muted-foreground">{u.restaurant_name}</div>}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Select value={u.role || 'pending'} onValueChange={(v) => handleRoleChange(u.id, v as any)}>
                                                        <SelectTrigger className={`h-7 border-0 bg-opacity-20 text-xs w-[120px] font-medium ${u.role === 'admin' ? 'bg-purple-500 text-purple-400' :
                                                            u.role === 'chef' ? 'bg-primary text-primary' :
                                                                u.role === 'foh' ? 'bg-blue-500 text-blue-400' :
                                                                    'bg-yellow-500 text-yellow-400'
                                                            }`}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-card border-white/10">
                                                            <SelectItem value="foh">Front Desk</SelectItem>
                                                            <SelectItem value="chef">Service (Kitchen)</SelectItem>
                                                            <SelectItem value="admin">Admin</SelectItem>
                                                            <SelectItem value="pending" className="text-yellow-500">Pending</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    {u.email_confirmed_at ?
                                                        <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 hover:bg-primary/10">Verified</Badge>
                                                        : <Badge variant="outline" className="text-yellow-500 border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10">Unverified</Badge>
                                                    }
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {new Date(u.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    {!u.email_confirmed_at && (
                                                        <Button size="sm" className="h-7 text-xs bg-primary/20 text-primary hover:bg-primary/40 border border-primary/20" onClick={() => handleConfirmUser(u.id)}>
                                                            <Check className="w-3 h-3 mr-1" /> Confirm
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
