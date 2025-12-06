"use client"

import React from 'react';
import { Plot } from '@/lib/schema';
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
    CreditCard,
    CalendarDays,
    DollarSign,
    Check,
    Clock,
    AlertCircle,
    Download,
    Printer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface PaymentInstallment {
    id: string;
    installmentDate: string;
    amount: number;
    paymentMethod?: string;
    receiptNumber?: string;
    status: 'paid' | 'unpaid' | 'partial';
    lateFee?: number;
}

interface PaymentRecord {
    id: string;
    paymentDate: string;
    amount: number;
    paymentMethod?: string;
    receiptNumber?: string;
    description?: string;
}

interface PaymentInstallmentDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    plot: Plot | null;
    installments?: PaymentInstallment[];
    paymentHistory?: PaymentRecord[];
    userRole: 'admin' | 'broker';
    onDownloadReceipt?: (installmentId: string) => void;
    onPrint?: (plot: Plot) => void;
}

export function PaymentInstallmentDrawer({
    isOpen,
    onClose,
    plot,
    installments = [],
    paymentHistory = [],
    userRole,
    onDownloadReceipt,
    onPrint,
}: PaymentInstallmentDrawerProps) {
    if (!plot) return null;

    const isAdmin = userRole === 'admin';
    const isBooked = plot.status === 'booked';
    const isSold = plot.status === 'sold';

    // Calculate total paid amount from payment history
    const totalPaidFromHistory = paymentHistory.reduce((sum, p: any) => {
        return sum + (p.amount_received || p.amount || 0);
    }, 0);

    // Get the total amount based on status
    const getTotalAmount = (): number => {
        if (isBooked && plot.totalPlotAmount) {
            return plot.totalPlotAmount;
        }
        // For sold plots, use salePrice first, then fall back to payment history total
        if (isSold) {
            if (plot.salePrice) {
                return plot.salePrice;
            }
            // If salePrice not set, use the total from payment history (for transitioned plots)
            if (totalPaidFromHistory > 0) {
                return totalPaidFromHistory;
            }
        }
        return 0;
    };

    const totalAmount = getTotalAmount();
    
    // Get paid amount based on status
    const getPaidAmount = (): number => {
        if (isBooked && plot.bookingAmount) {
            return plot.bookingAmount;
        }
        // For sold plots, use payment history total (all payments received)
        if (isSold) {
            return totalPaidFromHistory;
        }
        return 0;
    };

    const paidAmount = getPaidAmount();

    // Calculate totals
    // For sold plots: balance is 0 (fully paid)
    // For booked plots: calculate remaining balance
    const totalBalance = isSold ? 0 : (totalAmount - paidAmount);
    const totalLateFees = installments
        .reduce((sum, i) => sum + (i.lateFee || 0), 0);

    // Find next due date
    const nextUnpaid = installments.find(i => i.status === 'unpaid');
    const nextDueDate = nextUnpaid?.installmentDate || 'N/A';

    const paidInstallments = installments.filter(i => i.status === 'paid' || i.status === 'partial');
    const unpaidInstallments = installments.filter(i => i.status === 'unpaid');

    const paymentStatus = {
        paid: {
            label: 'Paid',
            color: 'bg-green-100 text-green-800 border-green-300',
            icon: Check,
        },
        unpaid: {
            label: 'Unpaid',
            color: 'bg-red-100 text-red-800 border-red-300',
            icon: AlertCircle,
        },
        partial: {
            label: 'Partial',
            color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            icon: Clock,
        },
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-full sm:w-[600px] md:w-[700px] flex flex-col p-0">
                {/* Sticky Header */}
                <div className="sticky top-0 z-10 bg-background border-b p-6">
                    <SheetHeader className="mb-4">
                        <SheetTitle className="text-2xl mb-2">
                            Payment & Installments
                        </SheetTitle>
                        <SheetDescription className="text-base">
                            Plot #{plot.plotNumber} • {plot.projectName}
                        </SheetDescription>
                    </SheetHeader>
                    
                    {(isBooked || isSold) && (
                        <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2">
                            <p className="text-xs text-blue-800">
                                {isBooked ? 'Booked' : 'Sold'} Plot - Payment & Installment Details
                            </p>
                        </div>
                    )}
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                    <Tabs defaultValue="summary" className="w-full">
                        <TabsList className="sticky top-0 z-10 w-full justify-start border-b bg-background rounded-none px-6 h-12">
                            <TabsTrigger value="summary">Summary</TabsTrigger>
                            <TabsTrigger value="installments">
                                Installments {installments.length > 0 && `(${installments.length})`}
                            </TabsTrigger>
                            <TabsTrigger value="history">History</TabsTrigger>
                        </TabsList>

                        {/* Summary Tab */}
                        <TabsContent value="summary" className="space-y-4 p-6">
                            {/* Payment Progress Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        Payment Overview
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                                        <p className="text-xs text-green-800 mb-1">Total Paid Amount</p>
                                        <p className="text-3xl font-bold text-green-700">₹{paidAmount.toLocaleString('en-IN')}</p>
                                    </div>

                                    <Separator />

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">
                                                {isBooked ? 'Total Plot Amount' : 'Total Amount'}
                                            </p>
                                            <p className="text-lg font-semibold">₹{totalAmount.toLocaleString('en-IN')}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Outstanding Balance</p>
                                            <p className="text-lg font-semibold text-orange-600">₹{totalBalance.toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Paid Installments</p>
                                            <p className="text-xl font-bold text-green-600">{paidInstallments.length}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Unpaid Installments</p>
                                            <p className="text-xl font-bold text-red-600">{unpaidInstallments.length}</p>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1">Payment Progress</p>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="font-semibold">{((paidAmount / totalAmount) * 100).toFixed(1)}% Completed</p>
                                            <Badge variant="outline" className="bg-blue-50">
                                                {((paidAmount / totalAmount) * 100).toFixed(1)}%
                                            </Badge>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                            <div 
                                                className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all" 
                                                style={{width: `${((paidAmount / totalAmount) * 100)}%`}}
                                            ></div>
                                        </div>
                                    </div>

                                    {totalLateFees > 0 && (
                                        <>
                                            <Separator />
                                            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                                                <p className="text-xs text-red-700 mb-1">Late Fees</p>
                                                <p className="text-lg font-semibold text-red-600">₹{totalLateFees.toLocaleString('en-IN')}</p>
                                            </div>
                                        </>
                                    )}

                                    <Separator />

                                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                                        <p className="text-xs text-amber-800 mb-2">Next Due Date</p>
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="h-4 w-4 text-amber-600" />
                                            <p className="font-semibold text-amber-900">
                                                {nextDueDate === 'N/A' 
                                                    ? 'All Payments Complete' 
                                                    : format(new Date(nextDueDate), 'dd MMMM yyyy')
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Installments Tab */}
                        <TabsContent value="installments" className="space-y-4 p-6">
                            {installments.length === 0 ? (
                                <Card>
                                    <CardContent className="pt-6 text-center">
                                        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                        <p className="text-muted-foreground">
                                            No installment data available yet.
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-3">
                                    {installments.map((installment, index) => {
                                        const statusConfig = paymentStatus[installment.status];
                                        const StatusIcon = statusConfig?.icon || AlertCircle;

                                        return (
                                            <Card key={installment.id} className="overflow-hidden">
                                                <CardContent className="pt-6">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <p className="text-sm font-semibold">Installment #{index + 1}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {format(new Date(installment.installmentDate), 'dd MMMM yyyy')}
                                                            </p>
                                                        </div>
                                                        <Badge className={cn(
                                                            "flex items-center gap-1",
                                                            statusConfig?.color
                                                        )}>
                                                            <StatusIcon className="h-3 w-3" />
                                                            {statusConfig?.label}
                                                        </Badge>
                                                    </div>

                                                    <Separator className="mb-3" />

                                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                                        <div>
                                                            <p className="text-xs text-muted-foreground mb-1">Amount Due</p>
                                                            <p className="text-lg font-semibold">₹{installment.amount.toLocaleString('en-IN')}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-muted-foreground mb-1">Payment Method</p>
                                                            <p className="text-sm font-medium">
                                                                {installment.paymentMethod || 'N/A'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {installment.receiptNumber && (
                                                        <>
                                                            <Separator className="my-3" />
                                                            <div>
                                                                <p className="text-xs text-muted-foreground mb-1">Receipt / Reference Number</p>
                                                                <p className="text-sm font-mono bg-gray-50 p-2 rounded">
                                                                    {installment.receiptNumber}
                                                                </p>
                                                            </div>
                                                        </>
                                                    )}

                                                    {installment.lateFee && installment.lateFee > 0 && (
                                                        <>
                                                            <Separator className="my-3" />
                                                            <div className="bg-red-50 p-3 rounded">
                                                                <p className="text-xs text-red-700 mb-1">Late Fee Applied</p>
                                                                <p className="text-lg font-semibold text-red-600">
                                                                    ₹{installment.lateFee.toLocaleString('en-IN')}
                                                                </p>
                                                            </div>
                                                        </>
                                                    )}

                                                    {isAdmin && installment.status === 'paid' && (
                                                        <>
                                                            <Separator className="my-3" />
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="flex-1 gap-2"
                                                                    onClick={() => onDownloadReceipt?.(installment.id)}
                                                                >
                                                                    <Download className="h-3 w-3" />
                                                                    Receipt
                                                                </Button>
                                                            </div>
                                                        </>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </TabsContent>

                        {/* History Tab - Shows actual payment records */}
                        <TabsContent value="history" className="space-y-4 p-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Payment History</CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Actual payments received
                                    </p>
                                </CardHeader>
                                <CardContent>
                                    {!paymentHistory || paymentHistory.length === 0 ? (
                                        <div className="text-center py-8">
                                            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                            <p className="text-muted-foreground">
                                                No payment history yet.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {paymentHistory.map((payment: any, index: number) => (
                                                <div key={payment.id || index} className="flex gap-3 pb-4 border-b last:border-0 last:pb-0">
                                                    <div className="flex-shrink-0">
                                                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-100">
                                                            <Check className="h-4 w-4 text-green-600" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-semibold">
                                                            ✅ Payment Received
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {format(new Date(payment.payment_date || payment.paymentDate), 'dd MMMM yyyy')}
                                                        </p>
                                                        <p className="text-sm font-semibold mt-1">
                                                            ₹{(payment.amount_received || payment.amount).toLocaleString('en-IN')}
                                                        </p>
                                                        {(payment.notes) && (
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                Notes: {payment.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex-shrink-0 text-right">
                                                        <Badge variant="default">
                                                            Paid
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Sticky Action Bar */}
                <div className="sticky bottom-0 z-10 border-t bg-background p-6 space-y-3">
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onPrint?.(plot)}
                            className="flex-1 gap-2"
                        >
                            <Printer className="h-4 w-4" />
                            Print Statement
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-2"
                        >
                            <Download className="h-4 w-4" />
                            Export
                        </Button>
                    </div>
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                        onClick={onClose}
                    >
                        Close
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
