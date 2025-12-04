"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Eye, Calendar, IndianRupee, CheckCircle2 } from 'lucide-react';
import { getBrokerSoldPlots } from '@/lib/actions';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

export default function BrokerSoldPlotsPage() {
    const [soldPlots, setSoldPlots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlot, setSelectedPlot] = useState<any>(null);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);

    useEffect(() => {
        const fetchSoldPlots = async () => {
            try {
                setLoading(true);
                const plots = await getBrokerSoldPlots();
                setSoldPlots(plots || []);
            } catch (error) {
                console.error('Error fetching sold plots:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load sold plots',
                    variant: 'destructive'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchSoldPlots();
    }, []);

    const handleViewDetails = (plot: any) => {
        setSelectedPlot(plot);
        setShowDetailsDialog(true);
    };

    const totalAmount = soldPlots.reduce((sum, plot) => sum + (plot.total_plot_amount || 0), 0);
    const paidCommissionsCount = soldPlots.filter(p => p.commission_status === 'paid').length;
    const pendingCommissionsCount = soldPlots.filter(p => p.commission_status === 'pending').length;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Sold Plots History</h1>
                <p className="text-muted-foreground">View all your sold plots with commission status</p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sold</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{soldPlots.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                        <IndianRupee className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{totalAmount.toLocaleString('en-IN')}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Commission Paid</CardTitle>
                        <div className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{paidCommissionsCount}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Commission Pending</CardTitle>
                        <div className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{pendingCommissionsCount}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Sold Plots Table */}
            <Card>
                <CardHeader>
                    <CardTitle>My Sold Plots</CardTitle>
                    <CardDescription>Complete list of all your sold plots with commission status</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center text-muted-foreground h-40 flex items-center justify-center">
                            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                            <p>Loading sold plots...</p>
                        </div>
                    ) : soldPlots.length === 0 ? (
                        <div className="text-center text-muted-foreground h-40 flex items-center justify-center">
                            <p>No sold plots found</p>
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
                                        <TableHead className="text-right">Amount Received</TableHead>
                                        <TableHead className="text-center">Commission Status</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-center">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {soldPlots.map((plot: any) => (
                                        <TableRow key={plot.id}>
                                            <TableCell className="font-medium">{plot.project_name}</TableCell>
                                            <TableCell>#{plot.plot_number}</TableCell>
                                            <TableCell>{plot.buyer_name || 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                ₹{plot.total_plot_amount?.toLocaleString('en-IN') || '0'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                ₹{plot.total_plot_amount?.toLocaleString('en-IN') || '0'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={plot.commission_status === 'paid' ? 'default' : 'secondary'}>
                                                    {plot.commission_status === 'paid' ? 'Paid' : 'Pending'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                {format(new Date(plot.updated_at), 'dd MMM yyyy')}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewDetails(plot)}
                                                    className="gap-2"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    Details
                                                </Button>
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
                            Sold Plot Details & Payment History
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
                                        <Badge className="mt-1">Sold</Badge>
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
                                            ₹{selectedPlot.total_plot_amount?.toLocaleString('en-IN') || '0'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Commission Status */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-lg">Commission Status</h3>
                                <Separator />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Commission Status</p>
                                        <Badge className="mt-1" variant={selectedPlot.commission_status === 'paid' ? 'default' : 'secondary'}>
                                            {selectedPlot.commission_status === 'paid' ? 'Paid' : 'Pending'}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Sale Date</p>
                                        <p className="font-medium">
                                            {format(new Date(selectedPlot.updated_at), 'dd MMM yyyy HH:mm')}
                                        </p>
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
        </div>
    );
}
