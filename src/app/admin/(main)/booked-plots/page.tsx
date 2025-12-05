"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, History, IndianRupee, TrendingUp, Clock, Trash2 } from 'lucide-react';
import { getBookedPlots, setBookedPlotAmounts, cancelBookedPlot } from '@/lib/actions';
import { Loader2 } from 'lucide-react';
import { AddPaymentDialog } from '@/components/admin/AddPaymentDialog';
import { PaymentHistoryDialog } from '@/components/admin/PaymentHistoryDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

interface BookedPlot {
    id: string;
    project_name: string;
    plot_number: number;
    buyer_name: string | null;
    broker_id: string | null;
    total_plot_amount: number | null;
    booking_amount: number | null;
    remaining_amount: number | null;
    paid_percentage: number | null;
    tenure_months: number | null;
    status: string;
    commission_status: string | null;
    broker: { full_name: string | null; email: string | null } | null;
    payment_history: Array<{ amount_received: number; payment_date: string }>;
}

export default function BookedPlotsPage() {
    const [plots, setPlots] = useState<BookedPlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlot, setSelectedPlot] = useState<BookedPlot | null>(null);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [editingAmountsId, setEditingAmountsId] = useState<string | null>(null);
    const [amountInputs, setAmountInputs] = useState<{ total: string; booking: string }>({ total: '', booking: '' });
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [cancelingPlotId, setCancelingPlotId] = useState<string | null>(null);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);

    const handleCloseHistory = () => {
        setIsHistoryDialogOpen(false);
        // Refresh plots to reflect any backfilled initial booking payment
        fetchPlots();
    };

    const handleCancelClick = (plot: BookedPlot) => {
        setCancelingPlotId(plot.id);
        setSelectedPlot(plot);
        setShowCancelDialog(true);
    };

    const handleConfirmCancel = async () => {
        if (!cancelingPlotId) return;
        
        try {
            setIsCanceling(true);
            const result = await cancelBookedPlot(cancelingPlotId);
            
            if (result.success) {
                toast({
                    title: 'Success',
                    description: result.message,
                    variant: 'default'
                });
                // Refresh the booked plots list
                fetchPlots();
            } else {
                toast({
                    title: 'Error',
                    description: result.message,
                    variant: 'destructive'
                });
            }
        } catch (error) {
            console.error('Error canceling booking:', error);
            toast({
                title: 'Error',
                description: 'Failed to cancel booking',
                variant: 'destructive'
            });
        } finally {
            setIsCanceling(false);
            setShowCancelDialog(false);
            setCancelingPlotId(null);
        }
    };

    const fetchPlots = async () => {
        setLoading(true);
        try {
            const data = await getBookedPlots();
            setPlots(data);
        } catch (error) {
            console.error('Error fetching booked plots:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlots();
    }, []);

    const handleAddPayment = (plot: BookedPlot) => {
        setSelectedPlot(plot);
        setIsPaymentDialogOpen(true);
    };

    const handleViewHistory = (plot: BookedPlot) => {
        setSelectedPlot(plot);
        setIsHistoryDialogOpen(true);
    };

    const handlePaymentSuccess = () => {
        setIsPaymentDialogOpen(false);
        fetchPlots(); // Refresh the list
    };

    const formatCurrency = (amount: number | null) => {
        if (amount === null || amount === undefined) return 'N/A';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getStatusBadge = (status: string) => {
        if (status === 'Booked') {
            return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Booked</Badge>;
        }
        if (status === 'Sold') {
            return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Sold</Badge>;
        }
        return <Badge variant="outline">{status}</Badge>;
    };

    const getCommissionBadge = (commissionStatus: string | null) => {
        if (commissionStatus === 'paid') {
            return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>;
        }
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    };

    // Aggregate helpers with fallback to payment history when structural fields are missing
    const totalBookedAmount = plots.reduce((sum, plot) => sum + (plot.total_plot_amount || 0), 0);
    const totalReceived = plots.reduce((sum, plot) => {
        const paymentsSum = (plot.payment_history || []).reduce((pSum, p) => pSum + (p.amount_received || 0), 0);
        if (!plot.total_plot_amount || plot.total_plot_amount <= 0) {
            // Fallback: treat payments sum as received when total not set
            return sum + paymentsSum;
        }
        const received = (plot.total_plot_amount || 0) - (plot.remaining_amount || 0);
        // If structural calc yields 0 but payments exist, prefer payments sum
        return sum + (received === 0 && paymentsSum > 0 ? paymentsSum : received);
    }, 0);
    const totalPending = plots.reduce((sum, plot) => {
        if (!plot.total_plot_amount || plot.total_plot_amount <= 0) return sum; // Unknown pending when total unset
        return sum + (plot.remaining_amount || 0);
    }, 0);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">Booked Plots Management</h1>
                <p className="text-muted-foreground">Track payments and manage booked plots</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Booked Amount</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalBookedAmount)}</div>
                        <p className="text-xs text-muted-foreground">{plots.length} plots booked</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Amount Received</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(totalReceived)}</div>
                        <p className="text-xs text-muted-foreground">
                            {((totalReceived / totalBookedAmount) * 100).toFixed(1)}% collected
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
                        <Clock className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalPending)}</div>
                        <p className="text-xs text-muted-foreground">To be collected</p>
                    </CardContent>
                </Card>
            </div>

            {/* Booked Plots Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Booked Plots</CardTitle>
                    <CardDescription>
                        Manage payments for booked plots. Commission will be distributed automatically when 50% payment is received.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {plots.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No booked plots found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Project</TableHead>
                                        <TableHead>Plot No.</TableHead>
                                        <TableHead>Buyer</TableHead>
                                        <TableHead>Broker</TableHead>
                                        <TableHead className="text-right">Total Amount</TableHead>
                                        <TableHead className="text-right">Received</TableHead>
                                        <TableHead className="text-right">Remaining</TableHead>
                                        <TableHead className="text-center">% Paid</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="text-center">Commission</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {plots.map((plot) => {
                                        const paymentsSum = (plot.payment_history || []).reduce((pSum, p) => pSum + (p.amount_received || 0), 0);
                                        let received = (plot.total_plot_amount || 0) - (plot.remaining_amount || 0);
                                        // Fallback to payments sum if structural values missing or zero
                                        if ((!plot.total_plot_amount || plot.total_plot_amount <= 0) || (received === 0 && paymentsSum > 0)) {
                                            received = paymentsSum;
                                        }
                                        let percentage = plot.paid_percentage || 0;
                                        if ((!plot.total_plot_amount || plot.total_plot_amount <= 0) && paymentsSum > 0) {
                                            // Without total we can't compute real percentage; show inferred 100% only if status sold
                                            percentage = plot.status.toLowerCase() === 'sold' ? 100 : 0;
                                        }
                                        
                                        // Removed verbose client-side debug logging for production cleanliness
                                        
                                        return (
                                            <TableRow key={plot.id}>
                                                <TableCell className="font-medium">{plot.project_name}</TableCell>
                                                <TableCell>{plot.plot_number}</TableCell>
                                                <TableCell>{plot.buyer_name || 'N/A'}</TableCell>
                                                <TableCell>{plot.broker?.full_name || 'N/A'}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {editingAmountsId === plot.id ? (
                                                        <div className="flex flex-col gap-2 min-w-[140px]">
                                                            <input
                                                                type="number"
                                                                placeholder="Total"
                                                                className="border rounded px-2 py-1 text-sm"
                                                                value={amountInputs.total}
                                                                onChange={(e) => setAmountInputs(a => ({ ...a, total: e.target.value }))}
                                                            />
                                                            <input
                                                                type="number"
                                                                placeholder="Booking"
                                                                className="border rounded px-2 py-1 text-sm"
                                                                value={amountInputs.booking}
                                                                onChange={(e) => setAmountInputs(a => ({ ...a, booking: e.target.value }))}
                                                            />
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="default"
                                                                    onClick={async () => {
                                                                        const totalNum = parseFloat(amountInputs.total);
                                                                        const bookingNum = amountInputs.booking ? parseFloat(amountInputs.booking) : undefined;
                                                                        if (isNaN(totalNum) || totalNum <= 0) return;
                                                                        try {
                                                                            await setBookedPlotAmounts(plot.id, totalNum, bookingNum);
                                                                            setEditingAmountsId(null);
                                                                            setAmountInputs({ total: '', booking: '' });
                                                                            fetchPlots();
                                                                        } catch (err) {
                                                                            console.error('Failed to set amounts', err);
                                                                        }
                                                                    }}
                                                                >Save</Button>
                                                                <Button size="sm" variant="outline" onClick={() => { setEditingAmountsId(null); setAmountInputs({ total: '', booking: '' }); }}>Cancel</Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <span>{formatCurrency(plot.total_plot_amount)}</span>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => {
                                                                    setEditingAmountsId(plot.id);
                                                                    setAmountInputs({
                                                                        total: plot.total_plot_amount ? String(plot.total_plot_amount) : '',
                                                                        booking: plot.booking_amount ? String(plot.booking_amount) : ''
                                                                    });
                                                                }}
                                                            >Edit</Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right text-green-600">
                                                    {formatCurrency(received)}
                                                </TableCell>
                                                <TableCell className="text-right text-orange-600">
                                                    {plot.total_plot_amount && plot.total_plot_amount > 0 ? formatCurrency(plot.remaining_amount) : '—'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-semibold">{percentage.toFixed(1)}%</span>
                                                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                                            <div
                                                                className={`h-2 rounded-full ${
                                                                    percentage >= 50 ? 'bg-green-600' : 'bg-blue-600'
                                                                }`}
                                                                style={{ width: `${Math.min(percentage, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {getStatusBadge(plot.status)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {getCommissionBadge(plot.commission_status)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex gap-2 justify-center">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleAddPayment(plot)}
                                                            disabled={plot.status === 'Sold'}
                                                        >
                                                            <Plus className="h-4 w-4 mr-1" />
                                                            Payment
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleViewHistory(plot)}
                                                        >
                                                            <History className="h-4 w-4" />
                                                        </Button>
                                                        {(percentage === null || percentage === undefined || percentage < 50) && plot.status !== 'Sold' && (
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => handleCancelClick(plot)}
                                                                className="gap-2"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                Cancel
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialogs */}
            {selectedPlot && (
                <>
                    <AddPaymentDialog
                        isOpen={isPaymentDialogOpen}
                        onClose={() => setIsPaymentDialogOpen(false)}
                        plot={selectedPlot}
                        onSuccess={handlePaymentSuccess}
                    />
                    <PaymentHistoryDialog
                        isOpen={isHistoryDialogOpen}
                        onClose={handleCloseHistory}
                        plotId={selectedPlot.id}
                        plotDetails={{
                            projectName: selectedPlot.project_name,
                            plotNumber: selectedPlot.plot_number,
                            buyerName: selectedPlot.buyer_name || 'N/A',
                        }}
                    />
                </>
            )}

            {/* Cancel Booking Dialog */}
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel this booking for Plot #{selectedPlot?.plot_number}?
                            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                                <p className="text-sm text-red-800 dark:text-red-200">
                                    <strong>⚠️ This action will:</strong>
                                </p>
                                <ul className="text-xs text-red-700 dark:text-red-300 mt-2 space-y-1 ml-4">
                                    <li>• Reset the plot status to "Available"</li>
                                    <li>• Clear all booking information</li>
                                    <li>• Make it available for other buyers</li>
                                    <li>• Clear buyer and broker details</li>
                                    <li>• This cannot be undone</li>
                                </ul>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2 mt-6">
                        <AlertDialogCancel disabled={isCanceling}>
                            No, Keep It
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmCancel}
                            disabled={isCanceling}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isCanceling ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Canceling...
                                </>
                            ) : (
                                'Yes, Cancel Booking'
                            )}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
