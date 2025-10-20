"use client"

import React, { useState, useEffect, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Loader2, CheckCircle, XCircle, Clock, Upload, AlertCircle } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    getAllWithdrawalRequests,
    processWithdrawalRequest
} from '@/lib/actions';
import type { WithdrawalRequestRecord } from '@/lib/types';
import { processWithdrawalSchema } from '@/lib/schema';

type ProcessWithdrawalFormValues = z.infer<typeof processWithdrawalSchema>;

export default function AdminTransactionsPage() {
    const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequestRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequestRecord | null>(null);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const form = useForm<ProcessWithdrawalFormValues>({
        resolver: zodResolver(processWithdrawalSchema),
        defaultValues: {
            requestId: '',
            action: 'approve',
            paymentType: undefined,
            proofImageUrl: '',
            rejectionReason: '',
        },
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const requestsData = await getAllWithdrawalRequests();
            setWithdrawalRequests(requestsData);
        } catch (error) {
            toast({
                title: 'Error fetching withdrawal requests',
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

    const handleProcessRequest = (request: WithdrawalRequestRecord, action: 'approve' | 'reject') => {
        setSelectedRequest(request);
        form.reset({
            requestId: request.id,
            action: action,
            paymentType: undefined,
            proofImageUrl: '',
            rejectionReason: '',
        });
        setIsProcessDialogOpen(true);
    };

    const onProcessSubmit = (values: ProcessWithdrawalFormValues) => {
        startTransition(async () => {
            try {
                await processWithdrawalRequest(values);
                toast({ 
                    title: 'Success!', 
                    description: `Withdrawal request ${values.action === 'approve' ? 'approved' : 'rejected'} successfully.` 
                });
                setIsProcessDialogOpen(false);
                form.reset();
                setSelectedRequest(null);
                fetchData();
            } catch (error) {
                toast({ 
                    title: 'Failed to process request', 
                    description: (error as Error).message, 
                    variant: 'destructive' 
                });
            }
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
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

    const pendingCount = withdrawalRequests.filter(req => req.status === 'pending').length;
    const totalAmount = withdrawalRequests
        .filter(req => req.status === 'pending')
        .reduce((sum, req) => sum + req.amount, 0);

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold font-headline">Transaction Management</h1>
                    <p className="text-muted-foreground text-sm sm:text-base">Manage all broker withdrawal requests.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 sm:w-auto w-full">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Pending Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Pending Amount</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-red-600">
                                {formatCurrency(totalAmount)}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Withdrawal Requests</CardTitle>
                    <CardDescription>All withdrawal requests from brokers.</CardDescription>
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
                                        <TableHead className="min-w-[150px]">Broker Name</TableHead>
                                        <TableHead className="min-w-[120px]">Amount</TableHead>
                                        <TableHead className="min-w-[100px]">Status</TableHead>
                                        <TableHead className="min-w-[120px]">Requested Date</TableHead>
                                        <TableHead className="min-w-[120px]">Payment Type</TableHead>
                                        <TableHead className="min-w-[200px]">Note</TableHead>
                                        <TableHead className="w-[70px]"><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {withdrawalRequests.length > 0 ? withdrawalRequests.map((request) => (
                                        <TableRow key={request.id}>
                                            <TableCell className="font-medium">
                                                <div>
                                                    <p className="font-semibold">{request.brokerName}</p>
                                                    <p className="text-sm text-muted-foreground">{request.brokerEmail}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-semibold text-lg">
                                                {formatCurrency(request.amount)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(request.status)}
                                                    <Badge variant={getStatusVariant(request.status)}>
                                                        {request.status}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {formatDate(request.requestedAt)}
                                            </TableCell>
                                            <TableCell>
                                                {request.paymentType || 'Pending'}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate">
                                                {request.note || request.rejectionReason || 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {request.status === 'pending' && (
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
                                                                onSelect={() => handleProcessRequest(request, 'approve')}
                                                                className="text-green-600 focus:text-green-600 focus:bg-green-50"
                                                            >
                                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                                Approve
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem 
                                                                onSelect={() => handleProcessRequest(request, 'reject')}
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
                                                No withdrawal requests found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isProcessDialogOpen} onOpenChange={(isOpen) => {
                setIsProcessDialogOpen(isOpen);
                if (!isOpen) {
                    form.reset();
                    setSelectedRequest(null);
                }
            }}>
                <DialogContent className="sm:max-w-[425px] mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {form.watch('action') === 'approve' ? 'Approve' : 'Reject'} Withdrawal Request
                        </DialogTitle>
                        <DialogDescription>
                            {selectedRequest && (
                                <>
                                    {form.watch('action') === 'approve' ? 'Approve' : 'Reject'} withdrawal request from{' '}
                                    <strong>{selectedRequest.brokerName}</strong> for{' '}
                                    <strong>{formatCurrency(selectedRequest.amount)}</strong>.
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onProcessSubmit)} className="space-y-4">
                            {form.watch('action') === 'approve' ? (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="paymentType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Payment Type *</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select payment type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="cash">Cash</SelectItem>
                                                        <SelectItem value="cheque">Cheque</SelectItem>
                                                        <SelectItem value="online_transfer">Online Transfer</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="proofImageUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Proof Image URL (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        placeholder="https://example.com/proof.jpg"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                                <p className="text-sm text-muted-foreground">
                                                    Upload transaction slip or cheque image URL
                                                </p>
                                            </FormItem>
                                        )}
                                    />
                                </>
                            ) : (
                                <FormField
                                    control={form.control}
                                    name="rejectionReason"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Rejection Reason *</FormLabel>
                                            <FormControl>
                                                <Textarea 
                                                    placeholder="Explain why this request is being rejected..."
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
                </DialogContent>
            </Dialog>
        </div>
    );
}