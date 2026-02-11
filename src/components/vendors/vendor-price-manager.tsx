'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Store, DollarSign, Link as LinkIcon, Loader2, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { Ingredient, VendorProduct, Supplier } from '@/lib/types/database'
import { scrapeAndSaveProduct } from '@/app/actions/scrape-product'

interface VendorPriceManagerProps {
    ingredient: Ingredient
    vendors: Supplier[]
    existingPrices: VendorProduct[]
    onUpdate: () => void
}

export function VendorPriceManager({ ingredient, vendors, existingPrices, onUpdate }: VendorPriceManagerProps) {
    const supabase = createClient()
    const [isAdding, setIsAdding] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Form State
    const [selectedVendorId, setSelectedVendorId] = useState('')
    const [productUrl, setProductUrl] = useState('')
    const [packSize, setPackSize] = useState('')

    const handleScrapeAndSave = async () => {
        if (!selectedVendorId || !productUrl) {
            toast.error('Please select a vendor and enter a URL')
            return
        }

        setIsLoading(true)
        try {
            const result = await scrapeAndSaveProduct(
                ingredient.id,
                selectedVendorId,
                productUrl,
                packSize
            )

            if (result.success) {
                toast.success(`Price found: $${result.price}`)
                setIsAdding(false)
                setProductUrl('')
                setPackSize('')
                setSelectedVendorId('')
                onUpdate()
            } else {
                toast.error(`Scrape failed: ${result.error}`)
            }
        } catch {
            toast.error('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('vendor_products').delete().eq('id', id)
        if (error) toast.error('Failed to delete')
        else {
            toast.success('Price removed')
            onUpdate()
        }
    }

    return (
        <Card className="bg-card border-border shadow-2xl">
            <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-xl font-medium text-foreground flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <DollarSign className="w-5 h-5 text-primary" />
                    </div>
                    Vendor Prices for {ingredient.name}
                </CardTitle>
                <CardDescription>
                    Auto-track real-time pricing from supplier websites.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">

                {/* List of Tracked Prices */}
                <div className="space-y-3">
                    {existingPrices.map(vp => (
                        <div key={vp.id} className="group flex items-center justify-between p-4 bg-sidebar/20 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                                    <Store className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-medium text-foreground flex items-center gap-2">
                                        {vendors.find(v => v.id === vp.vendor_id)?.name || 'Unknown Vendor'}
                                        {vp.scrape_status === 'success' && (
                                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                                                Live Synced
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                        {vp.pack_size && <span>{vp.pack_size}</span>}
                                        {vp.product_url && (
                                            <a href={vp.product_url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 flex items-center gap-1">
                                                <LinkIcon className="w-3 h-3" /> Source
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <div className="text-xl font-bold text-foreground">${vp.vendor_price.toFixed(2)}</div>
                                    <div className="text-[10px] text-muted-foreground">
                                        Last checked: {vp.last_updated ? new Date(vp.last_updated).toLocaleDateString() : 'N/A'}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDelete(vp.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}

                    {existingPrices.length === 0 && !isAdding && (
                        <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-card/50">
                            <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground text-sm">No live prices linked yet</p>
                        </div>
                    )}
                </div>

                {/* Add New Fetched Price */}
                {isAdding ? (
                    <div className="p-5 bg-card rounded-xl border border-blue-500/30 shadow-lg shadow-blue-900/10 animate-in fade-in slide-in-from-top-2">
                        <h4 className="text-sm font-medium text-blue-400 mb-4 flex items-center gap-2">
                            <Globe className="w-4 h-4" /> Add Web Source
                        </h4>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="text-xs text-muted-foreground mb-1.5 block">Vendor</label>
                                    <select
                                        className="w-full bg-sidebar border border-border text-foreground rounded-lg h-10 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none"
                                        value={selectedVendorId}
                                        onChange={e => setSelectedVendorId(e.target.value)}
                                    >
                                        <option value="">Select Vendor...</option>
                                        {vendors.map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <label className="text-xs text-muted-foreground mb-1.5 block">Pack Size (Optional)</label>
                                    <Input
                                        placeholder="e.g. 50lb Bag"
                                        className="bg-sidebar border-border h-10"
                                        value={packSize}
                                        onChange={e => setPackSize(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-muted-foreground mb-1.5 block">Product Page URL</label>
                                <Input
                                    placeholder="https://supplier.com/product/..."
                                    className="bg-sidebar border-border h-10 font-mono text-xs text-blue-300"
                                    value={productUrl}
                                    onChange={e => setProductUrl(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end mt-6">
                            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-500 text-foreground min-w-[120px]"
                                onClick={handleScrapeAndSave}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Fetching...
                                    </>
                                ) : (
                                    <>
                                        <Globe className="w-4 h-4 mr-2" /> Auto-Fetch Price
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        className="w-full py-6 border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border transition-all rounded-xl"
                        onClick={() => setIsAdding(true)}
                    >
                        <Plus className="w-5 h-5 mr-2" /> Link New Web Price
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}
