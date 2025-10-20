"use client"

import React, { useState, useEffect, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Loader2, Download, Eye, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    requestWithdrawal, 
    getBrokerTransactions, 
    getBrokerWithdrawalRequests,
    getBrokerWallets 
} from '@/lib/actions';
import type { TransactionRecord, WithdrawalRequestRecord } from '@/lib/types';
import type { Wallet } from '@/lib/schema';
import { withdrawalRequestSchema } from '@/lib/schema';

type WithdrawalFormValues = z.infer<typeof withdrawalRequestSchema>;

export default function BrokerTransactionsPage() {
    const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
    const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequestRecord[]>([]);
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [loading, setLoading] = useState(true);
    const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const form = useForm<WithdrawalFormValues>({
        resolver: zodResolver(withdrawalRequestSchema),
        defaultValues: {
            amount: 0,
            note: '',
        },
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [transactionsData, withdrawalsData, walletData] = await Promise.all([
                getBrokerTransactions(),
                getBrokerWithdrawalRequests(),
                getBrokerWallets()
            ]);
            
            setTransactions(transactionsData);
            setWithdrawalRequests(withdrawalsData);
            setWallet(walletData);
        } catch (error) {
            toast({
                title: 'Error fetching data',
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

    const onWithdrawalSubmit = (values: WithdrawalFormValues) => {
        startTransition(async () => {
            try {
                await requestWithdrawal(values);
                toast({ 
                    title: 'Success!', 
                    description: 'Withdrawal request submitted successfully.' 
                });
                setIsWithdrawalDialogOpen(false);
                form.reset();
                fetchData();
            } catch (error) {
                toast({ 
                    title: 'Failed to submit withdrawal request', 
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
            case 'completed':
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
            case 'completed':
                return 'default';
            case 'rejected':
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold font-headline">Transaction History</h1>
                    <p className="text-muted-foreground text-sm sm:text-base">View your transactions and request withdrawals.</p>
                </div>
                
                {wallet && (
                    <Card className="sm:w-auto w-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Available Balance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(wallet.totalBalance)}
                            </p>
                            <Dialog open={isWithdrawalDialogOpen} onOpenChange={(isOpen) => {
                                setIsWithdrawalDialogOpen(isOpen);
                                if (!isOpen) {
                                    form.reset();
                                }
                            }}>
                                <DialogTrigger asChild>
                                    <Button className="w-full mt-3" disabled={wallet.totalBalance <= 0}>
                                        <Download className="mr-2 h-4 w-4" /> 
                                        Request Withdrawal
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px] mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Request Withdrawal</DialogTitle>
                                        <DialogDescription>
                                            Request to withdraw money from your available balance.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <Form {...form}>
                                        <form onSubmit={form.handleSubmit(onWithdrawalSubmit)} className="space-y-4">
                                            <FormField
                                                control={form.control}
                                                name="amount"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Amount</FormLabel>
                                                        <FormControl>
                                                            <Input 
                                                                type="number" 
                                                                placeholder="Enter amount" 
                                                                {...field}
                                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                                max={wallet.totalBalance}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                        <p className="text-sm text-muted-foreground">
                                                            Available: {formatCurrency(wallet.totalBalance)}
                                                        </p>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="note"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Note (Optional)</FormLabel>
                                                        <FormControl>
                                                            <Textarea 
                                                                placeholder="Add any additional notes..."
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <DialogFooter>
                                                <Button type="submit" disabled={isPending}>
                                                    {isPending ? "Submitting..." : "Submit Request"}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>
                )}
            </div>

            <Tabs defaultValue="transactions" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="transactions">All Transactions</TabsTrigger>
                    <TabsTrigger value="withdrawals">Withdrawal Requests</TabsTrigger>
                </TabsList>
                
                <TabsContent value="transactions" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Transaction History</CardTitle>
                            <CardDescription>All your commission earnings and withdrawals.</CardDescription>
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
                                                <TableHead className="min-w-[120px]">Date</TableHead>
                                                <TableHead className="min-w-[100px]">Type</TableHead>
                                                <TableHead className="min-w-[120px]">Amount</TableHead>
                                                <TableHead className="min-w-[100px]">Status</TableHead>
                                                <TableHead className="min-w-[200px]">Description</TableHead>
                                                <TableHead className="min-w-[120px]">Payment Mode</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {transactions.length > 0 ? transactions.map((transaction) => (
                                                <TableRow key={transaction.id}>
                                                    <TableCell className="font-medium">
                                                        {formatDate(transaction.date)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={transaction.type === 'credit' ? 'default' : 'secondary'}>
                                                            {transaction.type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className={transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                                                        {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {getStatusIcon(transaction.status || 'completed')}
                                                            <Badge variant={getStatusVariant(transaction.status || 'completed')}>
                                                                {transaction.status || 'completed'}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="max-w-[200px] truncate">
                                                        {transaction.description}
                                                    </TableCell>
                                                    <TableCell>
                                                        {transaction.paymentMode || 'N/A'}
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-24 text-center">
                                                        No transactions found.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="withdrawals" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Withdrawal Requests</CardTitle>
                            <CardDescription>Track your withdrawal request status.</CardDescription>
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
                                                <TableHead className="min-w-[120px]">Requested Date</TableHead>
                                                <TableHead className="min-w-[120px]">Amount</TableHead>
                                                <TableHead className="min-w-[100px]">Status</TableHead>
                                                <TableHead className="min-w-[120px]">Payment Type</TableHead>
                                                <TableHead className="min-w-[120px]">Processed Date</TableHead>
                                                <TableHead className="min-w-[200px]">Note</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {withdrawalRequests.length > 0 ? withdrawalRequests.map((request) => (
                                                <TableRow key={request.id}>
                                                    <TableCell className="font-medium">
                                                        {formatDate(request.requestedAt)}
                                                    </TableCell>
                                                    <TableCell className="font-semibold">
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
                                                        {request.paymentType || 'Pending'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {request.processedAt ? formatDate(request.processedAt) : 'N/A'}
                                                    </TableCell>
                                                    <TableCell className="max-w-[200px] truncate">
                                                        {request.note || request.rejectionReason || 'N/A'}
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-24 text-center">
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
                </TabsContent>
            </Tabs>
        </div>
    );
}