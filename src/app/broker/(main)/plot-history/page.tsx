"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Eye, Calendar, IndianRupee, Archive, TrendingUp, Home, CheckCircle2, XCircle, RotateCcw, Grid3X3, List } from 'lucide-react';
import { getBrokerPlotHistory } from '@/lib/actions';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { ReceiptPrintWrapper } from '@/components/receipt';
import type { PrintableReceiptProps } from '@/components/receipt';

interface PlotHistoryRecord {
    id: string;
    plot_id: string;
    project_name: string;
    plot_number: number;
    plot_size_gaj: number;
    status: 'available' | 'booked' | 'sold' | 'cancelled';
    buyer_name: string | null;
    broker_name: string | null;
    booking_date: string | null;
    sale_date: string | null;
    total_amount: number | null;
    paid_percentage: number | null;
    cancel_reason: string | null;
    cancelled_date: string | null;
    payment_history: Array<{ amount: number; date: string }>;
    created_at: string;
    updated_at: string;
}

export default function BrokerPlotHistoryPage() {
    const [plots, setPlots] = useState<PlotHistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlot, setSelectedPlot] = useState<PlotHistoryRecord | null>(null);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [receiptProps, setReceiptProps] = useState<PrintableReceiptProps | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const data = await getBrokerPlotHistory();
                setPlots(data || []);
            } catch (error) {
                console.error('Error fetching plot history:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load plot history',
                    variant: 'destructive'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleViewDetails = (plot: PlotHistoryRecord) => {
        setSelectedPlot(plot);
        setShowDetailsDialog(true);
    };

    const handlePrintReceipt = (plot: PlotHistoryRecord) => {
        if (plot.status === 'booked' || plot.status === 'sold') {
            const receipt: PrintableReceiptProps = {
                plotType: plot.status,
                paymentDetails: {
                    id: plot.id,
                    receiptNumber: `${1000 + parseInt(plot.plot_id || '1', 10)}`,
                    date: new Date().toLocaleDateString('en-IN'),
                    paymentMode: 'bank_transfer',
                    transactionId: `TXN-${Date.now()}`,
                },
                buyerDetails: {
                    name: plot.buyer_name || 'N/A',
                    mobile: '+91 XXXX XXXX',
                    address: 'Property Address',
                },
                projectDetails: {
                    projectName: plot.project_name,
                    plotNumber: plot.plot_number.toString(),
                    block: 'N/A',
                    area: plot.plot_size_gaj || 0,
                    facing: 'N/A',
                    dimension: `${plot.plot_size_gaj} Gaj`,
                },
                financialDetails: {
                    totalAmount: plot.total_amount || 0,
                    bookingAmount: (plot.total_amount || 0) * 0.2,
                    totalPaidTillDate: (plot.total_amount || 0) * ((plot.paid_percentage || 0) / 100),
                    outstandingBalance: (plot.total_amount || 0) - ((plot.total_amount || 0) * ((plot.paid_percentage || 0) / 100)),
                },
                salesExecutive: plot.broker_name || 'Broker',
            };
            setReceiptProps(receipt);
            setIsReceiptModalOpen(true);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'booked':
                return <Badge className="bg-blue-100 text-blue-800">Booked</Badge>;
            case 'sold':
                return <Badge className="bg-green-100 text-green-800">Sold</Badge>;
            case 'cancelled':
                return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
            case 'available':
                return <Badge className="bg-gray-100 text-gray-800">Available</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'booked':
                return <Home className="h-4 w-4 text-blue-600" />;
            case 'sold':
                return <CheckCircle2 className="h-4 w-4 text-green-600" />;
            case 'cancelled':
                return <XCircle className="h-4 w-4 text-red-600" />;
            case 'available':
                return <Archive className="h-4 w-4 text-gray-600" />;
            default:
                return <TrendingUp className="h-4 w-4" />;
        }
    };

    const filteredPlots = plots.filter(plot => {
        if (activeTab === 'all') return true;
        if (activeTab === 'booked') return plot.status === 'booked';
        if (activeTab === 'sold') return plot.status === 'sold';
        if (activeTab === 'cancelled') return plot.status === 'cancelled';
        return true;
    });

    const stats = {
        total: plots.length,
        booked: plots.filter(p => p.status === 'booked').length,
        sold: plots.filter(p => p.status === 'sold').length,
        cancelled: plots.filter(p => p.status === 'cancelled').length,
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Plot History / Audit</h1>
                <p className="text-muted-foreground">Complete immutable record of all plot transactions and status changes</p>
            </div>

            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Plots</CardTitle>
                        <Archive className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">All plot records</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Booked</CardTitle>
                        <Home className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.booked}</div>
                        <p className="text-xs text-muted-foreground">Currently booked</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sold</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.sold}</div>
                        <p className="text-xs text-muted-foreground">Completed sales</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
                        <p className="text-xs text-muted-foreground">Cancelled bookings</p>
                    </CardContent>
                </Card>
            </div>

            {/* Plot History Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Plot Transaction History</CardTitle>
                            <CardDescription>Immutable audit trail - Read-only records with no edits or deletions</CardDescription>
                        </div>
                        {/* View Mode Toggle */}
                        <div className="flex gap-2">
                            <Button
                                variant={viewMode === 'table' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('table')}
                                className="gap-2"
                            >
                                <List className="h-4 w-4" />
                                Table
                            </Button>
                            <Button
                                variant={viewMode === 'grid' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('grid')}
                                className="gap-2"
                            >
                                <Grid3X3 className="h-4 w-4" />
                                Grid
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                        <TabsList>
                            <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                            <TabsTrigger value="booked">Booked ({stats.booked})</TabsTrigger>
                            <TabsTrigger value="sold">Sold ({stats.sold})</TabsTrigger>
                            <TabsTrigger value="cancelled">Cancelled ({stats.cancelled})</TabsTrigger>
                        </TabsList>

                        <TabsContent value={activeTab} className="mt-6">
                            {loading ? (
                                <div className="text-center text-muted-foreground h-40 flex items-center justify-center">
                                    <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                                    <p>Loading plot history...</p>
                                </div>
                            ) : filteredPlots.length === 0 ? (
                                <div className="text-center text-muted-foreground h-40 flex items-center justify-center">
                                    <p>No records found</p>
                                </div>
                            ) : viewMode === 'table' ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-3 px-4 font-medium">Project</th>
                                                <th className="text-left py-3 px-4 font-medium">Plot #</th>
                                                <th className="text-left py-3 px-4 font-medium">Size (Gaj)</th>
                                                <th className="text-left py-3 px-4 font-medium">Buyer</th>
                                                <th className="text-left py-3 px-4 font-medium">Status</th>
                                                <th className="text-center py-3 px-4 font-medium">% Paid</th>
                                                <th className="text-left py-3 px-4 font-medium">Amount</th>
                                                <th className="text-left py-3 px-4 font-medium">Date</th>
                                                <th className="text-center py-3 px-4 font-medium">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredPlots.map((plot) => (
                                                <tr key={plot.id} className="border-b hover:bg-muted/50 transition-colors">
                                                    <td className="py-3 px-4 font-medium">{plot.project_name}</td>
                                                    <td className="py-3 px-4">#{plot.plot_number}</td>
                                                    <td className="py-3 px-4">{plot.plot_size_gaj}</td>
                                                    <td className="py-3 px-4">{plot.buyer_name || 'N/A'}</td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2">
                                                            {getStatusIcon(plot.status)}
                                                            {getStatusBadge(plot.status)}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        {plot.paid_percentage !== null ? `${plot.paid_percentage?.toFixed(1)}%` : 'N/A'}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {plot.total_amount ? `₹${(plot.total_amount).toLocaleString('en-IN')}` : 'N/A'}
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-muted-foreground">
                                                        {plot.status === 'sold' && plot.sale_date
                                                            ? format(new Date(plot.sale_date), 'dd MMM yyyy')
                                                            : plot.status === 'booked' && plot.booking_date
                                                            ? format(new Date(plot.booking_date), 'dd MMM yyyy')
                                                            : plot.status === 'cancelled' && plot.cancelled_date
                                                            ? format(new Date(plot.cancelled_date), 'dd MMM yyyy')
                                                            : format(new Date(plot.created_at), 'dd MMM yyyy')
                                                        }
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleViewDetails(plot)}
                                                            className="gap-2"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                            View
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredPlots.map(plot => (
                                        <Card key={plot.id} className="hover:shadow-xl transition-all duration-300 cursor-pointer border-0 overflow-hidden">
                                            {/* Gradient Header */}
                                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <CardTitle className="text-xl font-bold text-gray-900">Plot #{plot.plot_number}</CardTitle>
                                                        <CardDescription className="text-sm font-medium text-gray-600">{plot.project_name}</CardDescription>
                                                    </div>
                                                    <Badge className={`${plot.status === 'booked' ? 'bg-blue-100 text-blue-800' : plot.status === 'sold' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-xs font-semibold px-3 py-1`}>
                                                        {plot.status === 'booked' && '🟡 Booked'}
                                                        {plot.status === 'sold' && '🟢 Sold'}
                                                        {plot.status === 'cancelled' && '🔴 Cancelled'}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <CardContent className="p-5 space-y-4">
                                                {/* Plot Details Grid */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-gray-50 rounded-lg p-3">
                                                        <p className="text-xs font-semibold text-gray-500 uppercase">Size</p>
                                                        <p className="text-lg font-bold text-gray-900 mt-1">{plot.plot_size_gaj} Gaj</p>
                                                    </div>
                                                    <div className="bg-gray-50 rounded-lg p-3">
                                                        <p className="text-xs font-semibold text-gray-500 uppercase">Status</p>
                                                        <p className="text-sm font-bold text-gray-900 mt-1 capitalize">{plot.status}</p>
                                                    </div>
                                                </div>

                                                {/* Price Section */}
                                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                                                    <p className="text-xs font-semibold text-green-700 uppercase">Amount</p>
                                                    <p className="text-2xl font-bold text-green-900 mt-1">₹{(plot.total_amount || 0).toLocaleString('en-IN')}</p>
                                                </div>

                                                {/* Payment Progress */}
                                                {plot.status === 'booked' && (
                                                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <p className="text-xs font-semibold text-yellow-700 uppercase">Payment Progress</p>
                                                            <span className="text-sm font-bold text-yellow-900">{plot.paid_percentage || 0}%</span>
                                                        </div>
                                                        <div className="w-full h-2.5 bg-yellow-200 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all duration-500"
                                                                style={{ width: `${plot.paid_percentage || 0}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Buyer Info */}
                                                {plot.buyer_name && (
                                                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                                        <p className="text-xs font-semibold text-blue-700 uppercase">Buyer</p>
                                                        <p className="text-sm font-bold text-blue-900 mt-1">{plot.buyer_name}</p>
                                                    </div>
                                                )}

                                                {/* Action Buttons */}
                                                <div className="flex gap-2 pt-2">
                                                    <Button
                                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                                        size="sm"
                                                        onClick={() => handleViewDetails(plot)}
                                                    >
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        Details
                                                    </Button>
                                                    {(plot.status === 'booked' || plot.status === 'sold') && (
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700 text-white"
                                                            onClick={() => handlePrintReceipt(plot)}
                                                            title="Print Receipt"
                                                        >
                                                            🖨️ Print
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Plot Details Dialog */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Plot #{selectedPlot?.plot_number} - {selectedPlot?.project_name}
                        </DialogTitle>
                        <DialogDescription>
                            Complete Immutable Record - Read Only
                        </DialogDescription>
                    </DialogHeader>

                    {selectedPlot && (
                        <div className="space-y-6">
                            {/* Status Timeline */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-lg">Plot Status History</h3>
                                <Separator />
                                <div className="space-y-4">
                                    {selectedPlot.status === 'booked' && selectedPlot.booking_date && (
                                        <div className="flex gap-4 pb-4 border-b">
                                            <div className="flex flex-col items-center">
                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                    <Home className="h-5 w-5 text-blue-600" />
                                                </div>
                                                <div className="h-12 w-0.5 bg-gray-300"></div>
                                            </div>
                                            <div className="pt-1">
                                                <p className="font-semibold">Booked</p>
                                                <p className="text-sm text-muted-foreground">{format(new Date(selectedPlot.booking_date), 'PPP p')}</p>
                                                {selectedPlot.buyer_name && <p className="text-sm">Buyer: <strong>{selectedPlot.buyer_name}</strong></p>}
                                                {selectedPlot.broker_name && <p className="text-sm">Broker: <strong>{selectedPlot.broker_name}</strong></p>}
                                            </div>
                                        </div>
                                    )}

                                    {selectedPlot.status === 'sold' && selectedPlot.sale_date && (
                                        <>
                                            {selectedPlot.booking_date && (
                                                <div className="flex gap-4 pb-4 border-b">
                                                    <div className="flex flex-col items-center">
                                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                            <Home className="h-5 w-5 text-blue-600" />
                                                        </div>
                                                        <div className="h-12 w-0.5 bg-gray-300"></div>
                                                    </div>
                                                    <div className="pt-1">
                                                        <p className="font-semibold">Booked</p>
                                                        <p className="text-sm text-muted-foreground">{format(new Date(selectedPlot.booking_date), 'PPP p')}</p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex gap-4 pb-4">
                                                <div className="flex flex-col items-center">
                                                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                    </div>
                                                </div>
                                                <div className="pt-1">
                                                    <p className="font-semibold">Sold (50% Payment Received)</p>
                                                    <p className="text-sm text-muted-foreground">{format(new Date(selectedPlot.sale_date), 'PPP p')}</p>
                                                    {selectedPlot.buyer_name && <p className="text-sm">Buyer: <strong>{selectedPlot.buyer_name}</strong></p>}
                                                    {selectedPlot.broker_name && <p className="text-sm">Broker: <strong>{selectedPlot.broker_name}</strong></p>}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {selectedPlot.status === 'cancelled' && selectedPlot.cancelled_date && (
                                        <>
                                            {selectedPlot.booking_date && (
                                                <div className="flex gap-4 pb-4 border-b">
                                                    <div className="flex flex-col items-center">
                                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                            <Home className="h-5 w-5 text-blue-600" />
                                                        </div>
                                                        <div className="h-12 w-0.5 bg-gray-300"></div>
                                                    </div>
                                                    <div className="pt-1">
                                                        <p className="font-semibold">Booked</p>
                                                        <p className="text-sm text-muted-foreground">{format(new Date(selectedPlot.booking_date), 'PPP p')}</p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex gap-4 pb-4">
                                                <div className="flex flex-col items-center">
                                                    <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                                                        <XCircle className="h-5 w-5 text-red-600" />
                                                    </div>
                                                </div>
                                                <div className="pt-1">
                                                    <p className="font-semibold">Cancelled</p>
                                                    <p className="text-sm text-muted-foreground">{format(new Date(selectedPlot.cancelled_date), 'PPP p')}</p>
                                                    {selectedPlot.cancel_reason && (
                                                        <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                                                            <p className="text-sm"><strong>Reason:</strong> {selectedPlot.cancel_reason}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

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
                                        <p className="text-sm text-muted-foreground">Plot Size</p>
                                        <p className="font-medium">{selectedPlot.plot_size_gaj} Gaj</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Current Status</p>
                                        <div className="mt-1">{getStatusBadge(selectedPlot.status)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Transaction Details */}
                            {(selectedPlot.status === 'booked' || selectedPlot.status === 'sold') && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-lg">Transaction Details</h3>
                                    <Separator />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Buyer Name</p>
                                            <p className="font-medium">{selectedPlot.buyer_name || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Broker Name</p>
                                            <p className="font-medium">{selectedPlot.broker_name || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total Amount</p>
                                            <p className="font-medium text-lg">₹{(selectedPlot.total_amount || 0).toLocaleString('en-IN')}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Payment Status</p>
                                            <Badge variant={selectedPlot.paid_percentage && selectedPlot.paid_percentage >= 50 ? 'default' : 'secondary'}>
                                                {selectedPlot.paid_percentage?.toFixed(1) || '0'}% Paid
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Payment History */}
                            {selectedPlot.payment_history && selectedPlot.payment_history.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-lg">Payment History</h3>
                                    <Separator />
                                    <div className="space-y-2">
                                        {selectedPlot.payment_history.map((payment, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-md">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 text-sm font-medium">
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">₹{payment.amount.toLocaleString('en-IN')}</p>
                                                        <p className="text-xs text-muted-foreground">{format(new Date(payment.date), 'dd MMM yyyy')}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Audit Info */}
                            <div className="space-y-3 pt-4 border-t">
                                <h3 className="font-semibold text-lg">Audit Information</h3>
                                <Separator />
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Record Created</p>
                                        <p className="font-medium">{format(new Date(selectedPlot.created_at), 'PPP p')}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Last Updated</p>
                                        <p className="font-medium">{format(new Date(selectedPlot.updated_at), 'PPP p')}</p>
                                    </div>
                                </div>
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                                    <p className="text-xs text-blue-800 dark:text-blue-200">
                                        <strong>📋 Immutable Record:</strong> This is a read-only audit record. No edits or deletions are permitted to maintain transaction integrity.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Receipt Print Modal */}
            {isReceiptModalOpen && receiptProps && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-lg max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Receipt - Plot #{receiptProps.projectDetails.plotNumber}</h2>
                            <button
                                onClick={() => {
                                    setIsReceiptModalOpen(false);
                                    setReceiptProps(null);
                                }}
                                className="text-gray-500 hover:text-gray-700 font-bold text-xl"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-8">
                            <ReceiptPrintWrapper
                                {...receiptProps}
                                onClose={() => {
                                    setIsReceiptModalOpen(false);
                                    setReceiptProps(null);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
