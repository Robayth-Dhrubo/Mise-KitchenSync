'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    ArrowLeft,
    Link2,
    CheckCircle2,
    ExternalLink,
    RefreshCw,
    AlertCircle,
    ShoppingCart,
    Calculator,
    Truck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

// Integration definitions
const INTEGRATIONS = {
    pos: [
        {
            id: 'square',
            name: 'Square',
            description: 'Import menu items, prices, and sales data',
            logo: '/integrations/square.svg',
            color: 'bg-sidebar',
            status: 'available',
            docsUrl: 'https://developer.squareup.com',
        },
        {
            id: 'toast',
            name: 'Toast',
            description: 'Sync menu, modifiers, and pricing',
            logo: '/integrations/toast.svg',
            color: 'bg-orange-600',
            status: 'available',
            docsUrl: 'https://developer.toasttab.com',
        },
        {
            id: 'clover',
            name: 'Clover',
            description: 'Import items, categories, and inventory',
            logo: '/integrations/clover.svg',
            color: 'bg-green-600',
            status: 'coming_soon',
            docsUrl: 'https://docs.clover.com',
        },
    ],
    accounting: [
        {
            id: 'quickbooks',
            name: 'QuickBooks',
            description: 'Sync purchases, invoices, and expenses',
            logo: '/integrations/quickbooks.svg',
            color: 'bg-green-700',
            status: 'available',
            docsUrl: 'https://developer.intuit.com',
        },
        {
            id: 'xero',
            name: 'Xero',
            description: 'Import items and invoice data',
            logo: '/integrations/xero.svg',
            color: 'bg-blue-600',
            status: 'coming_soon',
            docsUrl: 'https://developer.xero.com',
        },
    ],
    suppliers: [
        {
            id: 'sysco',
            name: 'Sysco',
            description: 'Import product catalog and pricing',
            logo: '/integrations/sysco.svg',
            color: 'bg-blue-800',
            status: 'coming_soon',
            docsUrl: 'https://www.sysco.com',
        },
        {
            id: 'usfoods',
            name: 'US Foods',
            description: 'Sync order history and product data',
            logo: '/integrations/usfoods.svg',
            color: 'bg-red-700',
            status: 'coming_soon',
            docsUrl: 'https://www.usfoods.com',
        },
    ],
}

type ConnectionStatus = 'connected' | 'disconnected' | 'syncing'

type ConnectedIntegrations = {
    [key: string]: {
        status: ConnectionStatus
        lastSync?: string
        itemCount?: number
    }
}

export default function IntegrationsPage() {
    // In production, this would come from the database
    const [connections, setConnections] = useState<ConnectedIntegrations>({})
    const [connecting, setConnecting] = useState<string | null>(null)

    const handleConnect = async (integrationId: string) => {
        setConnecting(integrationId)

        // Redirect to OAuth flow
        window.location.href = `/api/integrations/${integrationId}/auth`
    }

    const handleDisconnect = async (integrationId: string) => {
        try {
            await fetch(`/api/integrations/${integrationId}/disconnect`, { method: 'POST' })
            setConnections(prev => {
                const newState = { ...prev }
                delete newState[integrationId]
                return newState
            })
            toast.success('Integration disconnected')
        } catch (error) {
            toast.error('Failed to disconnect')
        }
    }

    const handleSync = async (integrationId: string) => {
        setConnections(prev => ({
            ...prev,
            [integrationId]: { ...prev[integrationId], status: 'syncing' }
        }))

        try {
            const res = await fetch(`/api/integrations/${integrationId}/sync`, { method: 'POST' })
            const data = await res.json()

            setConnections(prev => ({
                ...prev,
                [integrationId]: {
                    status: 'connected',
                    lastSync: new Date().toISOString(),
                    itemCount: data.itemCount
                }
            }))
            toast.success(`Synced ${data.itemCount} items`)
        } catch (error) {
            toast.error('Sync failed')
            setConnections(prev => ({
                ...prev,
                [integrationId]: { ...prev[integrationId], status: 'connected' }
            }))
        }
    }

    const renderIntegrationCard = (integration: typeof INTEGRATIONS.pos[0]) => {
        const connection = connections[integration.id]
        const isConnected = connection?.status === 'connected' || connection?.status === 'syncing'
        const isSyncing = connection?.status === 'syncing'
        const isConnecting = connecting === integration.id

        return (
            <Card key={integration.id} className="glass-card overflow-hidden group hover:border-white/10 transition-all">
                <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 ${integration.color} rounded-xl flex items-center justify-center text-foreground font-bold text-lg`}>
                                {integration.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">{integration.name}</h3>
                                <p className="text-xs text-muted-foreground">{integration.description}</p>
                            </div>
                        </div>
                        {integration.status === 'coming_soon' ? (
                            <Badge className="bg-secondary text-muted-foreground text-xs">Coming Soon</Badge>
                        ) : isConnected ? (
                            <Badge className="bg-primary/20 text-primary text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Connected
                            </Badge>
                        ) : null}
                    </div>

                    {isConnected && (
                        <div className="mb-4 p-3 bg-white/5 rounded-lg">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Last synced</span>
                                <span className="text-foreground">
                                    {connection.lastSync
                                        ? new Date(connection.lastSync).toLocaleString()
                                        : 'Never'}
                                </span>
                            </div>
                            {connection.itemCount !== undefined && (
                                <div className="flex justify-between text-xs mt-1">
                                    <span className="text-muted-foreground">Items imported</span>
                                    <span className="text-primary font-medium">{connection.itemCount}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-2">
                        {integration.status === 'coming_soon' ? (
                            <Button
                                variant="outline"
                                className="flex-1 border-white/10 text-muted-foreground"
                                disabled
                            >
                                Coming Soon
                            </Button>
                        ) : isConnected ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => handleSync(integration.id)}
                                    disabled={isSyncing}
                                    className="flex-1 border-white/10 text-foreground"
                                >
                                    <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => handleDisconnect(integration.id)}
                                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                >
                                    Disconnect
                                </Button>
                            </>
                        ) : (
                            <Button
                                onClick={() => handleConnect(integration.id)}
                                disabled={isConnecting}
                                className="flex-1 bg-primary hover:bg-primary"
                            >
                                {isConnecting ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        <Link2 className="w-4 h-4 mr-2" />
                                        Connect
                                    </>
                                )}
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/pantry">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/5 border border-white/5">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
                    <p className="text-sm text-muted-foreground">Connect your existing systems to import data automatically</p>
                </div>
            </div>

            {/* CSV Import Card */}
            <Card className="glass-card border-primary/20">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">CSV/Spreadsheet Upload</h3>
                                <p className="text-xs text-muted-foreground">Import ingredients from any spreadsheet</p>
                            </div>
                        </div>
                        <Link href="/pantry/import">
                            <Button className="bg-primary hover:bg-primary">
                                Upload File
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* POS Systems */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                    <h2 className="text-lg font-semibold text-foreground">Point of Sale (POS)</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    {INTEGRATIONS.pos.map(renderIntegrationCard)}
                </div>
            </div>

            {/* Accounting */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-muted-foreground" />
                    <h2 className="text-lg font-semibold text-foreground">Accounting Software</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    {INTEGRATIONS.accounting.map(renderIntegrationCard)}
                </div>
            </div>

            {/* Suppliers */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-muted-foreground" />
                    <h2 className="text-lg font-semibold text-foreground">Suppliers</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    {INTEGRATIONS.suppliers.map(renderIntegrationCard)}
                </div>
            </div>

            {/* Help Section */}
            <Card className="glass-card">
                <CardContent className="p-6 text-center">
                    <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-medium text-foreground mb-1">Need a different integration?</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        We're always adding new integrations. Let us know what you need.
                    </p>
                    <Button variant="outline" className="border-white/10 text-foreground">
                        Request Integration
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
