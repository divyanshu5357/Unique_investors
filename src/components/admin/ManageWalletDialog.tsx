
"use client"

import React, { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { manageBrokerWallet } from '@/lib/actions';
import type { Broker } from '@/lib/types';
import { Textarea } from '../ui/textarea';

const walletTransactionSchema = z.object({
    amount: z.coerce.number().positive("Amount must be a positive number."),
    walletType: z.enum(['direct', 'downline']),
    description: z.string().min(1, "A description or reason is required."),
    paymentMode: z.string().optional(),
    transactionId: z.string().optional(),
});

type WalletTransactionValues = z.infer<typeof walletTransactionSchema>;

interface ManageWalletDialogProps {
    isOpen: boolean;
    onClose: () => void;
    broker: Broker | null;
    onTransactionSuccess: () => void;
}

const formatCurrency = (amount?: number) => {
    if (typeof amount !== 'number') return '₹0.00';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

export function ManageWalletDialog({ isOpen, onClose, broker, onTransactionSuccess }: ManageWalletDialogProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const addFundsForm = useForm<WalletTransactionValues>({
        resolver: zodResolver(walletTransactionSchema),
        defaultValues: { amount: '' as any, walletType: 'direct', description: '', paymentMode: '', transactionId: '' },
    });

    const payoutForm = useForm<WalletTransactionValues>({
        resolver: zodResolver(walletTransactionSchema),
        defaultValues: { amount: '' as any, walletType: 'direct', description: '', paymentMode: '', transactionId: '' },
    });
    
    useEffect(() => {
        if (!isOpen) {
            addFundsForm.reset();
            payoutForm.reset();
        }
    }, [isOpen, addFundsForm, payoutForm]);


    if (!broker) return null;

    const handleTransaction = (values: WalletTransactionValues, type: 'credit' | 'debit') => {
        startTransition(async () => {
            try {
                await manageBrokerWallet({ ...values, brokerId: broker.id, type });
                toast({ title: 'Success', description: `Transaction completed successfully for ${broker.full_name}.` });
                onTransactionSuccess();
                onClose();
            } catch (error) {
                toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Manage Wallet for {broker.full_name}</DialogTitle>
                     <DialogDescription>
                        Direct: {formatCurrency(broker.directSaleBalance ?? 0)} | Downline: {formatCurrency(broker.downlineSaleBalance ?? 0)}
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="add" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="add">Add Funds</TabsTrigger>
                        <TabsTrigger value="payout">Payout</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="add">
                        <Form {...addFundsForm}>
                            <form onSubmit={addFundsForm.handleSubmit(v => handleTransaction(v, 'credit'))} className="space-y-4 pt-4">
                                <FormField control={addFundsForm.control} name="amount" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount to Add</FormLabel>
                                        <FormControl><Input type="number" placeholder="e.g. 5000" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={addFundsForm.control} name="walletType" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Target Wallet</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="direct">Direct Sale Wallet</SelectItem>
                                                <SelectItem value="downline">Downline Sale Wallet</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={addFundsForm.control} name="description" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Reason / Description</FormLabel>
                                        <FormControl><Textarea placeholder="e.g. Bonus payout for Q2" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <DialogFooter>
                                    <Button type="submit" disabled={isPending}>{isPending ? 'Processing...' : 'Add Funds'}</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </TabsContent>

                    <TabsContent value="payout">
                         <Form {...payoutForm}>
                            <form onSubmit={payoutForm.handleSubmit(v => handleTransaction(v, 'debit'))} className="space-y-4 pt-4">
                                <FormField control={payoutForm.control} name="amount" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount to Pay Out</FormLabel>
                                        <FormControl><Input type="number" placeholder="e.g. 1000" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={payoutForm.control} name="walletType" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Source Wallet</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="direct">Direct Sale Wallet</SelectItem>
                                                <SelectItem value="downline">Downline Sale Wallet</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                 <FormField control={payoutForm.control} name="description" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Reason / Description</FormLabel>
                                        <FormControl><Textarea placeholder="e.g. Weekly payout" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={payoutForm.control} name="paymentMode" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Payment Mode (Optional)</FormLabel>
                                        <FormControl><Input placeholder="e.g. UPI, Bank Transfer" {...field} /></FormControl>
                                    </FormItem>
                                )}/>
                                 <FormField control={payoutForm.control} name="transactionId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Transaction ID (Optional)</FormLabel>
                                        <FormControl><Input placeholder="UTR or reference number" {...field} /></FormControl>
                                    </FormItem>
                                )}/>
                                <DialogFooter>
                                    <Button type="submit" variant="destructive" disabled={isPending}>{isPending ? 'Processing...' : 'Confirm Payout'}</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
