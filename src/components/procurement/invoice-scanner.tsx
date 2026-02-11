'use client'

import { useState } from 'react'
import { Upload, Camera, Loader2, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { processInvoiceAction } from '@/app/actions/process-invoice'

interface InvoiceScannerProps {
    onInvoiceProcessed?: () => void
}

interface InvoiceItem {
    name: string
    qty: number
    unit: string
    price: number
    original_name?: string
}

interface InvoiceResult {
    vendor: string
    total: number
    items: InvoiceItem[]
}

export function InvoiceScanner({ onInvoiceProcessed }: InvoiceScannerProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [scanResult, setScanResult] = useState<InvoiceResult | null>(null)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const result = await processInvoiceAction(formData)
            if (result.success && result.data) {
                setScanResult(result.data as InvoiceResult)
                toast.success('Invoice processed successfully!', {
                    description: `Identified ${result.data?.items.length} items.`
                })
                if (onInvoiceProcessed) {
                    onInvoiceProcessed()
                }
            } else {
                toast.error('Failed to process invoice', {
                    description: result.error
                })
            }
        } catch {
            toast.error('Error uploading file')
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-card/50 border-border h-fit">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Camera className="w-5 h-5 text-primary" />
                            Capture Invoice
                        </CardTitle>
                        <CardDescription>
                            Take a photo or upload a PDF/Image of your supplier invoice.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-border rounded-xl hover:bg-secondary/50 transition-colors bg-sidebar/30">
                            {isUploading ? (
                                <div className="text-center space-y-4">
                                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
                                    <p className="text-sm text-muted-foreground animate-pulse">Analyzing with AI Vision...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mb-4 border border-border">
                                        <Upload className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <Label htmlFor="invoice-upload" className="cursor-pointer">
                                        <span className="bg-primary hover:bg-[#7A6330] text-foreground px-4 py-2 rounded-lg font-medium transition-colors">
                                            Select Invoice
                                        </span>
                                    </Label>
                                    <Input
                                        id="invoice-upload"
                                        type="file"
                                        accept="image/*,application/pdf"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                    <p className="mt-4 text-xs text-muted-foreground">Supports JPG, PNG, PDF</p>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {scanResult && (
                    <Card className="bg-card/50 border-border animate-in slide-in-from-right-4 fade-in duration-500">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-primary">
                                <CheckCircle2 className="w-5 h-5" />
                                Inventory Updated
                            </CardTitle>
                            <CardDescription>
                                The following items have been matched and updated.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between text-sm text-muted-foreground border-b border-border pb-2">
                                    <span>Vendor</span>
                                    <span className="text-foreground font-medium">{scanResult.vendor}</span>
                                </div>
                                <div className="flex justify-between text-sm text-muted-foreground border-b border-border pb-2">
                                    <span>Total Amount</span>
                                    <span className="text-foreground font-medium">${scanResult.total.toFixed(2)}</span>
                                </div>

                                <div className="space-y-2 mt-4">
                                    <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Extracted Items</p>
                                    {scanResult.items.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-card border border-border">
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{item.name}</p>
                                                <p className="text-xs text-muted-foreground">{item.qty} {item.unit} @ ${item.price}</p>
                                            </div>
                                            <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                                + Stock Added
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
