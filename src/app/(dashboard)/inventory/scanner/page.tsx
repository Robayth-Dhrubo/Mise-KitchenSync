'use client'

import { useState } from 'react'
import { Upload, Camera, FileText, Loader2, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { processInvoiceAction } from '@/app/actions/process-invoice'

export default function ScannerPage() {
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
                setScanResult(result)
                toast.success('Invoice processed successfully!', {
                    description: `Identified ${result.data?.items.length} items.`
                })
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
            <div className="space-y-1">
                <h1 className="text-3xl font-bold text-foreground">The Scanner</h1>
                <p className="text-muted-foreground">Upload paper invoices to instantly update inventory.</p>
            </div>

            {scanResult?.using_mock_data && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3 text-amber-500 animate-in fade-in slide-in-from-top-4 duration-500">
                    <FileText className="w-5 h-5 shrink-0" />
                    <div className="text-sm">
                        <p className="font-bold uppercase tracking-wider">Demo Mode: Mock Data Used</p>
                        <p className="opacity-80">OPENAI_API_KEY is missing. Inventory updates are simulated with sample data.</p>
                    </div>
                </div>
            )}

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

                {scanResult && scanResult.data && (
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
                                    <span className="text-foreground font-medium">{scanResult.data.vendor}</span>
                                </div>
                                <div className="flex justify-between text-sm text-muted-foreground border-b border-border pb-2">
                                    <span>Total Amount</span>
                                    <span className="text-foreground font-medium">${scanResult.data.total.toFixed(2)}</span>
                                </div>

                                <div className="space-y-2 mt-4">
                                    <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Extracted Items</p>
                                    {scanResult.data.items.map((item: any, i: number) => (
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
