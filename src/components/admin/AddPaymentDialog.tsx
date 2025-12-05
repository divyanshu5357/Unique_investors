"use client"

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { addPaymentToPlot } from '@/lib/actions';
import { addPaymentSchema } from '@/lib/schema';
import { Loader2, IndianRupee, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BookedPlot {
    id: string;
    project_name: string;
    plot_number: number;
    buyer_name: string | null;
    total_plot_amount: number | null;
    remaining_amount: number | null;
    paid_percentage: number | null;
}

interface AddPaymentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    plot: BookedPlot;
    onSuccess: () => void;
}

export function AddPaymentDialog({ isOpen, onClose, plot, onSuccess }: AddPaymentDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof addPaymentSchema>>({
        resolver: zodResolver(addPaymentSchema),
        defaultValues: {
            plotId: plot.id,
            amountReceived: '' as any,
            paymentDate: new Date().toISOString().split('T')[0],
            notes: '',
        },
    });

    const handleSubmit = async (values: z.infer<typeof addPaymentSchema>) => {
        setIsSubmitting(true);
        try {
            await addPaymentToPlot(values);
            
            toast({
                title: "Payment Added",
                description: `Payment of ₹${values.amountReceived} has been recorded successfully.`,
            });

            form.reset();
            onSuccess();
        } catch (error) {
            console.error('Error adding payment:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to add payment",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (amount: number | null) => {
        if (amount === null || amount === undefined) return 'N/A';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Payment</DialogTitle>
                    <DialogDescription>
                        Record a new payment received from the buyer
                    </DialogDescription>
                </DialogHeader>

                {/* Plot Summary */}
                <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Project:</span>
                        <span className="text-sm font-medium">{plot.project_name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Plot Number:</span>
                        <span className="text-sm font-medium">{plot.plot_number}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Buyer:</span>
                        <span className="text-sm font-medium">{plot.buyer_name || 'N/A'}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total Amount:</span>
                            <span className="text-sm font-semibold">{formatCurrency(plot.total_plot_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Remaining:</span>
                            <span className="text-sm font-semibold text-orange-600">
                                {formatCurrency(plot.remaining_amount)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Paid:</span>
                            <span className="text-sm font-semibold text-green-600">
                                {plot.paid_percentage?.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Payment Form */}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="amountReceived"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount Received *</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="number"
                                                placeholder="Enter amount"
                                                className="pl-10"
                                                {...field}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="paymentDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Payment Date *</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="date"
                                                className="pl-10"
                                                {...field}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Add any notes about this payment..."
                                            rows={3}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Warning for 50% threshold */}
                        {(!plot.total_plot_amount || plot.total_plot_amount <= 0) && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-sm text-red-800">
                                    <strong>Missing Total Amount:</strong> Set the plot's total amount before recording payments to enable percentage & commission logic.
                                </p>
                            </div>
                        )}
                        {plot.total_plot_amount && plot.total_plot_amount > 0 && plot.paid_percentage !== null && plot.paid_percentage < 50 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <p className="text-sm text-yellow-800">
                                    <strong>Note:</strong> When cumulative payments reach 50% of the total, the plot status will automatically change to "Sold" and commissions will be distributed.
                                </p>
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting || !plot.total_plot_amount || plot.total_plot_amount <= 0}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Add Payment
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
