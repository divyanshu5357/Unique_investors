"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Eye, Calendar, IndianRupee, Lock } from 'lucide-react';
import { getBrokerBookedPlots, getProjectedCommissionWallet, cancelBookedPlot } from '@/lib/actions';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function BrokerBookedPlotsPage() {
    const [bookedPlots, setBookedPlots] = useState<any[]>([]);
    const [projectedCommission, setProjectedCommission] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPlot, setSelectedPlot] = useState<any>(null);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [cancelingPlotId, setCancelingPlotId] = useState<string | null>(null);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [plots, projected] = await Promise.all([
                    getBrokerBookedPlots(),
                    getProjectedCommissionWallet()
                ]);
                setBookedPlots(plots || []);
                setProjectedCommission(projected);
            } catch (error) {
                console.error('Error fetching data:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load booked plots',
                    variant: 'destructive'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleViewDetails = (plot: any) => {
        setSelectedPlot(plot);
        setShowDetailsDialog(true);
    };

    const handleCancelClick = (plot: any) => {
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
                const plots = await getBrokerBookedPlots();
                setBookedPlots(plots || []);
                const projected = await getProjectedCommissionWallet();
                setProjectedCommission(projected);
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

    const totalAmount = bookedPlots.reduce((sum, plot) => sum + (plot.total_plot_amount || 0), 0);
    const totalReceived = bookedPlots.reduce((sum, plot) => sum + ((plot.total_plot_amount || 0) - (plot.remaining_amount || 0)), 0);
    const totalRemaining = bookedPlots.reduce((sum, plot) => sum + (plot.remaining_amount || 0), 0);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Booked Plots History</h1>
                <p className="text-muted-foreground">View all your booked plots with payment tracking</p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                        <div className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{bookedPlots.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                        <IndianRupee className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{totalAmount.toLocaleString('en-IN')}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Received</CardTitle>
                        <div className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">₹{totalReceived.toLocaleString('en-IN')}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <div className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">₹{totalRemaining.toLocaleString('en-IN')}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Projected Commission Wallet */}
            <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-3">
                        <Lock className="h-5 w-5 text-yellow-600" />
                        <div>
                            <CardTitle className="text-sm font-medium text-yellow-900">Projected Commission Wallet</CardTitle>
                            <CardDescription className="text-xs text-yellow-700 mt-1">
                                Expected commission from incomplete bookings
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-3xl font-bold text-yellow-700">
                                    ₹{projectedCommission?.totalProjectedAmount?.toLocaleString('en-IN') || '0'}
                                </div>
                                <p className="text-xs text-yellow-600 mt-1">
                                    {projectedCommission?.totalPlots || 0} plot{(projectedCommission?.totalPlots || 0) !== 1 ? 's' : ''} contributing
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="inline-block px-3 py-1 bg-yellow-600 text-white text-xs font-semibold rounded-full">
                                    LOCKED
                                </div>
                                <p className="text-xs text-yellow-700 mt-2">Not Withdrawable</p>
                            </div>
                        </div>
                        
                        <div className="pt-2 border-t border-yellow-200">
                            <p className="text-xs text-yellow-700 leading-relaxed">
Your earning from this booking is being securely held here and will be unlocked into your wallet once the required payment milestone is completed.                            </p>
                        </div>

                        {projectedCommission?.plots && projectedCommission.plots.length > 0 && (
                            <div className="pt-2 border-t border-yellow-200">
                                <p className="text-xs font-semibold text-yellow-900 mb-2">Contributing Plots:</p>
                                <div className="space-y-2">
                                    {projectedCommission.plots.slice(0, 3).map((plot: any) => (
                                        <div key={plot.id} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-yellow-100">
                                            <span className="text-yellow-700">
                                                <strong>#{plot.plot_number}</strong> - {plot.project_name}
                                            </span>
                                            <span className="font-semibold text-yellow-700">
                                                ₹{(plot.projected_commission || 0).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    ))}
                                    {(projectedCommission?.totalPlots || 0) > 3 && (
                                        <p className="text-xs text-yellow-600 italic">
                                            +{(projectedCommission?.totalPlots || 0) - 3} more plot{(projectedCommission?.totalPlots || 0) - 3 !== 1 ? 's' : ''}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Booked Plots Table */}
            <Card>
                <CardHeader>
                    <CardTitle>My Booked Plots</CardTitle>
                    <CardDescription>Complete list of all your booked plots with payment status</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center text-muted-foreground h-40 flex items-center justify-center">
                            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                            <p>Loading booked plots...</p>
                        </div>
                    ) : bookedPlots.length === 0 ? (
                        <div className="text-center text-muted-foreground h-40 flex items-center justify-center">
                            <p>No booked plots found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Project</TableHead>
                                        <TableHead>Plot No.</TableHead>
                                        <TableHead>Buyer Name</TableHead>
                                        <TableHead className="text-right">Total Amount</TableHead>
                                        <TableHead className="text-right">Received</TableHead>
                                        <TableHead className="text-center">% Paid</TableHead>
                                        <TableHead className="text-center">Tenure</TableHead>
                                        <TableHead className="text-center">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bookedPlots.map((plot: any) => (
                                        <TableRow key={plot.id}>
                                            <TableCell className="font-medium">{plot.project_name}</TableCell>
                                            <TableCell>#{plot.plot_number}</TableCell>
                                            <TableCell>{plot.buyer_name || 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                ₹{plot.total_plot_amount?.toLocaleString('en-IN') || '0'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                ₹{((plot.total_plot_amount || 0) - (plot.remaining_amount || 0)).toLocaleString('en-IN')}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={plot.paid_percentage >= 50 ? 'default' : 'secondary'}>
                                                    {plot.paid_percentage?.toFixed(1) || '0'}%
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">{plot.tenure_months} months</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex gap-2 justify-center">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleViewDetails(plot)}
                                                        className="gap-2"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        Details
                                                    </Button>
                                                    {(plot.paid_percentage === null || plot.paid_percentage === undefined || plot.paid_percentage < 50) && (
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleCancelClick(plot)}
                                                            className="gap-2"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Plot Details Dialog */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Plot #{selectedPlot?.plot_number} - {selectedPlot?.project_name}
                        </DialogTitle>
                        <DialogDescription>
                            Booked Plot Details & Payment History
                        </DialogDescription>
                    </DialogHeader>

                    {selectedPlot && (
                        <div className="space-y-6">
                            {/* Plot Information */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-lg">Plot Information</h3>
                                <Separator />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Project Name</p>
                                        <p className="font-medium">{selectedPlot.project_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Plot Number</p>
                                        <p className="font-medium">#{selectedPlot.plot_number}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Buyer Name</p>
                                        <p className="font-medium">{selectedPlot.buyer_name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Status</p>
                                        <Badge className="mt-1">Booked</Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Financial Information */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-lg">Financial Information</h3>
                                <Separator />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Amount</p>
                                        <p className="font-medium text-lg">
                                            ₹{selectedPlot.total_plot_amount?.toLocaleString('en-IN') || '0'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Amount Received</p>
                                        <p className="font-medium text-lg text-green-600">
                                            ₹{((selectedPlot.total_plot_amount || 0) - (selectedPlot.remaining_amount || 0)).toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Remaining Amount</p>
                                        <p className="font-medium text-lg text-orange-600">
                                            ₹{(selectedPlot.remaining_amount || 0).toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">% Paid</p>
                                        <p className="font-medium text-lg">
                                            <Badge variant={selectedPlot.paid_percentage >= 50 ? 'default' : 'secondary'}>
                                                {selectedPlot.paid_percentage?.toFixed(2) || '0'}%
                                            </Badge>
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Booking Amount</p>
                                        <p className="font-medium">
                                            ₹{selectedPlot.booking_amount?.toLocaleString('en-IN') || '0'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Tenure (Months)</p>
                                        <p className="font-medium">{selectedPlot.tenure_months} months</p>
                                    </div>
                                </div>
                            </div>

                            {/* Payment History */}
                            {selectedPlot.payment_history && selectedPlot.payment_history.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-lg">Payment History</h3>
                                    <Separator />
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {selectedPlot.payment_history.map((payment: any, index: number) => (
                                            <div key={payment.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-md">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-sm font-medium">
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">₹{payment.amount_received?.toLocaleString('en-IN') || '0'}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                                                        </p>
                                                    </div>
                                                </div>
                                                {payment.notes && (
                                                    <p className="text-xs text-muted-foreground text-right">{payment.notes}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Cancel Booking Dialog */}
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel this booking for Plot #{selectedPlot?.plot_number}?
                            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                    <strong>⚠️ This action will:</strong>
                                </p>
                                <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-2 space-y-1 ml-4">
                                    <li>• Reset the plot status to "Available"</li>
                                    <li>• Clear all booking information</li>
                                    <li>• Make it available for other buyers</li>
                                    <li>• Cancel can only be done before 50% payment</li>
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
