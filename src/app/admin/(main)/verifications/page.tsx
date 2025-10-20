"use client"

import React, { useState, useEffect, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Loader2, CheckCircle, XCircle, Clock, Eye, Shield, AlertCircle, FileText } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
    getAllBrokerVerifications,
    processVerificationRequest
} from '@/lib/actions';
import type { BrokerVerificationRecord } from '@/lib/types';
import { processVerificationSchema } from '@/lib/schema';

type ProcessVerificationFormValues = z.infer<typeof processVerificationSchema>;

export default function AdminVerificationsPage() {
    const [verifications, setVerifications] = useState<BrokerVerificationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
    const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
    const [selectedVerification, setSelectedVerification] = useState<BrokerVerificationRecord | null>(null);
    const [selectedImageData, setSelectedImageData] = useState('');
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const form = useForm<ProcessVerificationFormValues>({
        resolver: zodResolver(processVerificationSchema),
        defaultValues: {
            verificationId: '',
            action: 'approve',
            rejectionReason: '',
        },
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const verificationsData = await getAllBrokerVerifications();
            setVerifications(verificationsData);
        } catch (error) {
            toast({
                title: 'Error fetching verifications',
                description: (error as Error).message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleProcessVerification = (verification: BrokerVerificationRecord, action: 'approve' | 'reject') => {
        setSelectedVerification(verification);
        form.reset({
            verificationId: verification.id,
            action: action,
            rejectionReason: '',
        });
        setIsProcessDialogOpen(true);
    };

    const handleViewImage = (imageData: string, verification: BrokerVerificationRecord) => {
        setSelectedImageData(imageData);
        setSelectedVerification(verification);
        setIsImageDialogOpen(true);
    };

    const onProcessSubmit = (values: ProcessVerificationFormValues) => {
        startTransition(async () => {
            try {
                await processVerificationRequest(values);
                toast({ 
                    title: 'Success!', 
                    description: `Verification ${values.action === 'approve' ? 'approved' : 'rejected'} successfully.` 
                });
                setIsProcessDialogOpen(false);
                form.reset();
                setSelectedVerification(null);
                fetchData();
            } catch (error) {
                toast({ 
                    title: 'Failed to process verification', 
                    description: (error as Error).message, 
                    variant: 'destructive' 
                });
            }
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <Clock className="h-4 w-4" />;
            case 'approved':
                return <CheckCircle className="h-4 w-4" />;
            case 'rejected':
                return <XCircle className="h-4 w-4" />;
            default:
                return <AlertCircle className="h-4 w-4" />;
        }
    };

    const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'pending':
                return 'outline';
            case 'approved':
                return 'default';
            case 'rejected':
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    const getIdTypeLabel = (idType: string) => {
        switch (idType) {
            case 'aadhaar':
                return 'Aadhaar Card';
            case 'pan':
                return 'PAN Card';
            case 'driving_license':
                return 'Driving License';
            default:
                return idType;
        }
    };

    const pendingCount = verifications.filter(v => v.status === 'pending').length;
    const approvedCount = verifications.filter(v => v.status === 'approved').length;
    const rejectedCount = verifications.filter(v => v.status === 'rejected').length;

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold font-headline flex items-center gap-3">
                        <Shield className="h-8 w-8 text-primary" />
                        Broker Verifications
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base">Review and manage broker identity verification requests.</p>
                </div>
                
                <div className="grid grid-cols-3 gap-4 sm:w-auto w-full">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Pending</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Approved</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Rejected</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Verification Requests</CardTitle>
                    <CardDescription>All broker identity verification submissions.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-[180px]">Broker Details</TableHead>
                                        <TableHead className="min-w-[120px]">ID Type</TableHead>
                                        <TableHead className="min-w-[150px]">ID Number</TableHead>
                                        <TableHead className="min-w-[100px]">Image</TableHead>
                                        <TableHead className="min-w-[100px]">Status</TableHead>
                                        <TableHead className="min-w-[120px]">Submitted Date</TableHead>
                                        <TableHead className="w-[70px]"><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {verifications.length > 0 ? verifications.map((verification) => (
                                        <TableRow key={verification.id}>
                                            <TableCell className="font-medium">
                                                <div>
                                                    <p className="font-semibold">{verification.brokerName}</p>
                                                    <p className="text-sm text-muted-foreground">{verification.brokerEmail}</p>
                                                    <p className="text-xs text-muted-foreground">Full Name: {verification.fullName}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4" />
                                                    {getIdTypeLabel(verification.idType)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {verification.idNumber}
                                            </TableCell>
                                            <TableCell>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => handleViewImage(verification.idImageData, verification)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(verification.status)}
                                                    <Badge variant={getStatusVariant(verification.status)}>
                                                        {verification.status}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {formatDate(verification.createdAt)}
                                            </TableCell>
                                            <TableCell>
                                                {verification.status === 'pending' && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                                <span className="sr-only">Toggle menu</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuItem 
                                                                onSelect={() => handleProcessVerification(verification, 'approve')}
                                                                className="text-green-600 focus:text-green-600 focus:bg-green-50"
                                                            >
                                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                                Approve
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem 
                                                                onSelect={() => handleProcessVerification(verification, 'reject')}
                                                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                            >
                                                                <XCircle className="mr-2 h-4 w-4" />
                                                                Reject
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                No verification requests found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Process Verification Dialog */}
            <Dialog open={isProcessDialogOpen} onOpenChange={(isOpen) => {
                setIsProcessDialogOpen(isOpen);
                if (!isOpen) {
                    form.reset();
                    setSelectedVerification(null);
                }
            }}>
                <DialogContent className="sm:max-w-[425px] mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {form.watch('action') === 'approve' ? 'Approve' : 'Reject'} Verification Request
                        </DialogTitle>
                        <DialogDescription>
                            {selectedVerification && (
                                <>
                                    {form.watch('action') === 'approve' ? 'Approve' : 'Reject'} verification request from{' '}
                                    <strong>{selectedVerification.brokerName}</strong> for their{' '}
                                    <strong>{getIdTypeLabel(selectedVerification.idType)}</strong>.
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedVerification && (
                        <div className="space-y-4">
                            {/* Verification Details Summary */}
                            <div className="p-4 rounded-lg border bg-muted/50">
                                <h4 className="font-semibold mb-2">Verification Details</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Full Name:</span>
                                        <p className="font-medium">{selectedVerification.fullName}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">ID Type:</span>
                                        <p className="font-medium">{getIdTypeLabel(selectedVerification.idType)}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-muted-foreground">ID Number:</span>
                                        <p className="font-medium font-mono">{selectedVerification.idNumber}</p>
                                    </div>
                                </div>
                            </div>

                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onProcessSubmit)} className="space-y-4">
                                    {form.watch('action') === 'reject' && (
                                        <FormField
                                            control={form.control}
                                            name="rejectionReason"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Rejection Reason *</FormLabel>
                                                    <FormControl>
                                                        <Textarea 
                                                            placeholder="Explain why this verification is being rejected..."
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                    <DialogFooter>
                                        <Button 
                                            type="submit" 
                                            disabled={isPending}
                                            variant={form.watch('action') === 'approve' ? 'default' : 'destructive'}
                                        >
                                            {isPending ? 'Processing...' : (form.watch('action') === 'approve' ? 'Approve' : 'Reject')}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Image Preview Dialog */}
            <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
                <DialogContent className="sm:max-w-[900px] mx-4 sm:mx-0 max-h-[90vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            ID Document Preview
                        </DialogTitle>
                        <DialogDescription>
                            {selectedVerification && (
                                <>
                                    {getIdTypeLabel(selectedVerification.idType)} - {selectedVerification.idNumber}
                                    <br />
                                    Submitted by: <strong>{selectedVerification.brokerName}</strong> ({selectedVerification.brokerEmail})
                                    <br />
                                    Full Name: <strong>{selectedVerification.fullName}</strong>
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center space-y-4">
                        <div className="relative max-w-full">
                            <img 
                                src={selectedImageData} 
                                alt="ID Document" 
                                className="max-w-full max-h-[70vh] object-contain rounded-lg border shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                                onError={(e) => {
                                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBhdmFpbGFibGU8L3RleHQ+PC9zdmc+';
                                }}
                                onClick={() => {
                                    // Open image in new tab for full zoom
                                    const newWindow = window.open();
                                    if (newWindow) {
                                        newWindow.document.write(`
                                            <html>
                                                <head>
                                                    <title>ID Document - ${selectedVerification?.fullName} - ${selectedVerification?.idType}</title>
                                                    <style>
                                                        body {
                                                            margin: 0;
                                                            padding: 20px;
                                                            display: flex;
                                                            flex-direction: column;
                                                            justify-content: center;
                                                            align-items: center;
                                                            min-height: 100vh;
                                                            background: #f5f5f5;
                                                            font-family: Arial, sans-serif;
                                                        }
                                                        .header {
                                                            background: white;
                                                            padding: 15px 20px;
                                                            border-radius: 8px;
                                                            margin-bottom: 20px;
                                                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                                            text-align: center;
                                                        }
                                                        .header h1 {
                                                            margin: 0 0 5px 0;
                                                            color: #333;
                                                            font-size: 20px;
                                                        }
                                                        .header p {
                                                            margin: 0;
                                                            color: #666;
                                                            font-size: 14px;
                                                        }
                                                        img {
                                                            max-width: 95vw;
                                                            max-height: 80vh;
                                                            object-fit: contain;
                                                            border-radius: 8px;
                                                            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                                                            cursor: zoom-in;
                                                            transition: transform 0.3s ease;
                                                        }
                                                        img:hover {
                                                            transform: scale(1.05);
                                                        }
                                                        .zoom-note {
                                                            margin-top: 15px;
                                                            padding: 10px;
                                                            background: rgba(255,255,255,0.9);
                                                            border-radius: 4px;
                                                            font-size: 12px;
                                                            color: #666;
                                                        }
                                                    </style>
                                                </head>
                                                <body>
                                                    <div class="header">
                                                        <h1>${selectedVerification?.fullName}</h1>
                                                        <p>${getIdTypeLabel(selectedVerification?.idType || '')} - ${selectedVerification?.idNumber}</p>
                                                        <p>Submitted by: ${selectedVerification?.brokerName} (${selectedVerification?.brokerEmail})</p>
                                                    </div>
                                                    <img src="${selectedImageData}" alt="ID Document" onclick="this.style.transform = this.style.transform ? '' : 'scale(1.5)'" />
                                                    <div class="zoom-note">
                                                        💡 Click the image to zoom in/out
                                                    </div>
                                                </body>
                                            </html>
                                        `);
                                        newWindow.document.close();
                                    }
                                }}
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 items-center text-sm text-muted-foreground">
                            <span>💡 Click image to open in full-screen zoom view</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const newWindow = window.open();
                                    if (newWindow) {
                                        newWindow.document.write(`
                                            <html>
                                                <head><title>ID Document - ${selectedVerification?.fullName}</title></head>
                                                <body style="margin:0;padding:20px;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;">
                                                    <img src="${selectedImageData}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);" />
                                                </body>
                                            </html>
                                        `);
                                        newWindow.document.close();
                                    }
                                }}
                            >
                                <Eye className="h-4 w-4 mr-1" />
                                Open Full Screen
                            </Button>
                        </div>
                        
                        {/* Image metadata */}
                        {selectedVerification && (
                            <div className="w-full p-4 bg-muted/50 rounded-lg">
                                <h4 className="font-semibold mb-2 text-sm">Document Information</h4>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <span className="text-muted-foreground">File Type:</span>
                                        <p className="font-medium">{selectedVerification.idImageType || 'Unknown'}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">File Size:</span>
                                        <p className="font-medium">
                                            {selectedVerification.idImageSize ? 
                                                `${(selectedVerification.idImageSize / 1024 / 1024).toFixed(2)} MB` : 
                                                'Unknown'
                                            }
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Submitted:</span>
                                        <p className="font-medium">{formatDate(selectedVerification.createdAt)}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Status:</span>
                                        <Badge variant={getStatusVariant(selectedVerification.status)}>
                                            {selectedVerification.status}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}