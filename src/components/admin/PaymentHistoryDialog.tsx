"use client"

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getPaymentHistory } from '@/lib/actions';
import { Loader2, Calendar, IndianRupee, User } from 'lucide-react';
import { format } from 'date-fns';

interface PaymentRecord {
    id: string;
    amount_received: number;
    payment_date: string;
    notes: string | null;
    created_at: string;
    updater: { full_name: string | null } | null;
}

interface PaymentHistoryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    plotId: string;
    plotDetails: {
        projectName: string;
        plotNumber: number;
        buyerName: string;
    };
}

export function PaymentHistoryDialog({ isOpen, onClose, plotId, plotDetails }: PaymentHistoryDialogProps) {
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchPaymentHistory();
        }
    }, [isOpen, plotId]);

    const fetchPaymentHistory = async () => {
        setLoading(true);
        try {
            const data = await getPaymentHistory(plotId);
            setPayments(data);
        } catch (error) {
            console.error('Error fetching payment history:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'dd MMM yyyy');
        } catch {
            return dateString;
        }
    };

    const totalReceived = payments.reduce((sum, payment) => sum + payment.amount_received, 0);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Payment History</DialogTitle>
                    <DialogDescription>
                        Complete transaction history for this plot
                    </DialogDescription>
                </DialogHeader>

                {/* Plot Details */}
                <div className="bg-muted p-4 rounded-lg">
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <span className="text-sm text-muted-foreground">Project</span>
                            <p className="font-medium">{plotDetails.projectName}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">Plot Number</span>
                            <p className="font-medium">{plotDetails.plotNumber}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">Buyer</span>
                            <p className="font-medium">{plotDetails.buyerName}</p>
                        </div>
                    </div>
                    {payments.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Total Amount Received</span>
                                <span className="text-lg font-bold text-green-600">{formatCurrency(totalReceived)}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Payment History Table */}
                <div className="overflow-y-auto max-h-96">
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No payment history found</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Updated By</TableHead>
                                    <TableHead>Notes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">
                                                    {formatDate(payment.payment_date)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <IndianRupee className="h-4 w-4 text-green-600" />
                                                <span className="font-semibold text-green-600">
                                                    {formatCurrency(payment.amount_received)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm">
                                                    {payment.updater?.full_name || 'Admin'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-muted-foreground">
                                                {payment.notes || '-'}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {/* Summary Footer */}
                {payments.length > 0 && (
                    <div className="border-t pt-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                                {payments.length} payment{payments.length !== 1 ? 's' : ''} recorded
                            </span>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Total: {formatCurrency(totalReceived)}
                            </Badge>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
