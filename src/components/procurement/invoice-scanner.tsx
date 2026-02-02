'use client'

import { useState } from 'react'
import { Upload, Camera, FileText, Loader2, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { processInvoiceAction } from '@/app/actions/process-invoice'

interface InvoiceScannerProps {
    onInvoiceProcessed?: () => void
}

export function InvoiceScanner({ onInvoiceProcessed }: InvoiceScannerProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [scanResult, setScanResult] = useState<any>(null)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const result = await processInvoiceAction(formData)
            if (result.success) {
                setScanResult(result.data)
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
        } catch (error) {
            toast.error('Error uploading file')
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-neutral-900/50 border-neutral-800 h-fit">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Camera className="w-5 h-5 text-emerald-500" />
                            Capture Invoice
                        </CardTitle>
                        <CardDescription>
                            Take a photo or upload a PDF/Image of your supplier invoice.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-neutral-800 rounded-xl hover:bg-neutral-800/50 transition-colors bg-neutral-950/30">
                            {isUploading ? (
                                <div className="text-center space-y-4">
                                    <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto" />
                                    <p className="text-sm text-neutral-400 animate-pulse">Analyzing with AI Vision...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center mb-4 border border-neutral-800">
                                        <Upload className="w-8 h-8 text-neutral-400" />
                                    </div>
                                    <Label htmlFor="invoice-upload" className="cursor-pointer">
                                        <span className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
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
                                    <p className="mt-4 text-xs text-neutral-500">Supports JPG, PNG, PDF</p>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {scanResult && (
                    <Card className="bg-neutral-900/50 border-neutral-800 animate-in slide-in-from-right-4 fade-in duration-500">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-emerald-500">
                                <CheckCircle2 className="w-5 h-5" />
                                Inventory Updated
                            </CardTitle>
                            <CardDescription>
                                The following items have been matched and updated.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between text-sm text-neutral-400 border-b border-neutral-800 pb-2">
                                    <span>Vendor</span>
                                    <span className="text-white font-medium">{scanResult.vendor}</span>
                                </div>
                                <div className="flex justify-between text-sm text-neutral-400 border-b border-neutral-800 pb-2">
                                    <span>Total Amount</span>
                                    <span className="text-white font-medium">${scanResult.total.toFixed(2)}</span>
                                </div>

                                <div className="space-y-2 mt-4">
                                    <p className="text-xs font-bold uppercase text-neutral-500 tracking-wider">Extracted Items</p>
                                    {scanResult.items.map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                                            <div>
                                                <p className="text-sm font-medium text-white">{item.name}</p>
                                                <p className="text-xs text-neutral-500">{item.qty} {item.unit} @ ${item.price}</p>
                                            </div>
                                            <div className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded">
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
