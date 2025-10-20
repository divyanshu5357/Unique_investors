"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, History, IndianRupee, TrendingUp, Clock } from 'lucide-react';
import { getBookedPlots } from '@/lib/actions';
import { Loader2 } from 'lucide-react';
import { AddPaymentDialog } from '@/components/admin/AddPaymentDialog';
import { PaymentHistoryDialog } from '@/components/admin/PaymentHistoryDialog';

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
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

    const handleCloseHistory = () => {
        setIsHistoryDialogOpen(false);
        // Refresh plots to reflect any backfilled initial booking payment
        fetchPlots();
    };

    const fetchPlots = async () => {
        setLoading(true);
        try {
            const data = await getBookedPlots();
            console.log('🎨 Client received plots data:', data);
            if (data && data.length > 0) {
                console.log('🎨 First plot in client:', {
                    id: data[0].id,
                    project_name: data[0].project_name,
                    plot_number: data[0].plot_number,
                    total_plot_amount: data[0].total_plot_amount,
                    booking_amount: data[0].booking_amount,
                    remaining_amount: data[0].remaining_amount,
                    paid_percentage: data[0].paid_percentage,
                });
            }
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

    const totalBookedAmount = plots.reduce((sum, plot) => sum + (plot.total_plot_amount || 0), 0);
    const totalReceived = plots.reduce((sum, plot) => {
        const received = (plot.total_plot_amount || 0) - (plot.remaining_amount || 0);
        return sum + received;
    }, 0);
    const totalPending = plots.reduce((sum, plot) => sum + (plot.remaining_amount || 0), 0);

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
                        Manage payments for booked plots. Commission will be distributed automatically when 75% payment is received.
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
                                        const received = (plot.total_plot_amount || 0) - (plot.remaining_amount || 0);
                                        const percentage = plot.paid_percentage || 0;
                                        
                                        console.log('🎨 Rendering plot:', {
                                            plot_number: plot.plot_number,
                                            total_plot_amount: plot.total_plot_amount,
                                            remaining_amount: plot.remaining_amount,
                                            received,
                                            percentage,
                                        });
                                        
                                        return (
                                            <TableRow key={plot.id}>
                                                <TableCell className="font-medium">{plot.project_name}</TableCell>
                                                <TableCell>{plot.plot_number}</TableCell>
                                                <TableCell>{plot.buyer_name || 'N/A'}</TableCell>
                                                <TableCell>{plot.broker?.full_name || 'N/A'}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(plot.total_plot_amount)}
                                                </TableCell>
                                                <TableCell className="text-right text-green-600">
                                                    {formatCurrency(received)}
                                                </TableCell>
                                                <TableCell className="text-right text-orange-600">
                                                    {formatCurrency(plot.remaining_amount)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-semibold">{percentage.toFixed(1)}%</span>
                                                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                                            <div
                                                                className={`h-2 rounded-full ${
                                                                    percentage >= 75 ? 'bg-green-600' : 'bg-blue-600'
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
        </div>
    );
}
