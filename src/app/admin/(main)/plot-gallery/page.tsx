"use client"

import React, { useState, useEffect } from 'react';
import { Plot } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RoleBasedPlotDetailDrawer } from '@/components/admin/RoleBasedPlotDetailDrawer';
import { PaymentInstallmentDrawer } from '@/components/admin/PaymentInstallmentDrawer';
import { ReceiptPrintWrapper } from '@/components/receipt';
import type { PrintableReceiptProps } from '@/components/receipt';
import { Eye, DollarSign, Loader2, AlertCircle, HelpingHand, XCircle, Search, Grid3X3, List } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { getPlots, getPaymentHistory } from '@/lib/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PaymentInstallment {
    id: string;
    installmentDate: string;
    amount: number;
    paymentMethod?: string;
    receiptNumber?: string;
    status: 'paid' | 'unpaid' | 'partial';
    lateFee?: number;
}

const statusConfig = {
    booked: {
        label: 'Booked',
        icon: <HelpingHand className="h-4 w-4" />,
        badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    },
    sold: {
        label: 'Sold',
        icon: <XCircle className="h-4 w-4" />,
        badgeClass: 'bg-red-100 text-red-800 border-red-300',
    },
};

// Get the amount for a plot based on status
const getPlotAmount = (plot: Plot): number => {
  // ✅ If plot is currently booked, show its total amount
  if (plot.status === 'booked') {
    return (
      plot.totalPlotAmount ||
      plot.bookingAmount ||
      0
    );
  }

  // ✅ If plot is sold and sale price is available (direct sold)
  if (plot.status === 'sold' && plot.salePrice && plot.salePrice > 0) {
    return plot.salePrice;
  }

  // ✅ If plot was booked first and later sold (salePrice is 0)
  if (plot.status === 'sold') {
    return (
      plot.totalPlotAmount ||   // ✅ this still contains the real amount
      plot.bookingAmount ||
      0
    );
  }

  return 0;
};

// Generate installment schedule based on tenure
const generateInstallmentSchedule = (plot: Plot, paidPayments: any[]): PaymentInstallment[] => {
    if (plot.status !== 'booked' || !plot.tenureMonths || !plot.createdAt) {
        return [];
    }

    const installments: PaymentInstallment[] = [];
    const monthlyAmount = plot.totalPlotAmount ? Math.floor(plot.totalPlotAmount / plot.tenureMonths) : 0;
    const bookingDate = new Date(plot.createdAt);

    // Create installment for each month
    for (let i = 0; i < plot.tenureMonths; i++) {
        const installmentDate = addMonths(bookingDate, i + 1);
        const dateStr = installmentDate.toISOString().split('T')[0];

        // Check if this installment was paid
        const payment = paidPayments.find(p => {
            const paymentDate = new Date(p.payment_date).toISOString().split('T')[0];
            return paymentDate === dateStr;
        });

        installments.push({
            id: `${plot.id}-${i}`,
            installmentDate: dateStr,
            amount: monthlyAmount,
            status: payment ? 'paid' : 'unpaid',
            receiptNumber: payment?.id,
        });
    }

    return installments;
};

const PlotCard = ({ plot, onViewDetails, onViewPayments, onPrint }: { plot: Plot; onViewDetails: () => void; onViewPayments: () => void; onPrint: (plot: Plot) => void; }) => (
    <Card className={cn(
        "overflow-hidden border-slate-200 hover:shadow-xl transition-all duration-300",
        plot.status === 'booked' ? 'hover:border-yellow-300' : 'hover:border-red-300'
    )}>
        <CardHeader className={cn(
            'pb-3 text-white',
            plot.status === 'booked' 
                ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' 
                : 'bg-gradient-to-r from-red-400 to-red-500'
        )}>
            <div className="flex items-start justify-between">
                <div>
                    <CardTitle className="text-lg text-white">Plot #{plot.plotNumber}</CardTitle>
                    <p className="text-xs opacity-90 mt-1">{plot.projectName} • {plot.block}</p>
                </div>
                <Badge className={cn(
                    "text-xs font-bold",
                    plot.status === 'booked' 
                        ? 'bg-white text-yellow-600' 
                        : 'bg-white text-red-600'
                )}>
                    {plot.status === 'booked' ? '🔄 Booked' : '✅ Sold'}
                </Badge>
            </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
            {/* Plot Details Grid */}
            <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 hover:border-slate-300 transition">
                    <p className="text-xs text-slate-600 font-medium">Type</p>
                    <p className="text-sm font-semibold text-slate-900">{plot.type}</p>
                </div>
                <div className="bg-blue-50 p-2.5 rounded border border-blue-200 hover:border-blue-300 transition">
                    <p className="text-xs text-blue-700 font-medium">Area</p>
                    <p className="text-sm font-semibold text-blue-900">{plot.area} Gaj</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 hover:border-slate-300 transition">
                    <p className="text-xs text-slate-600 font-medium">Dimension</p>
                    <p className="text-sm font-semibold text-slate-900">{plot.dimension}</p>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded border border-emerald-200 hover:border-emerald-300 transition">
                    <p className="text-xs text-emerald-700 font-medium">Block</p>
                    <p className="text-sm font-semibold text-emerald-900">{plot.block}</p>
                </div>
            </div>

            {/* Buyer Info */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-600 font-medium mb-1">Buyer Name</p>
                <p className="text-sm font-semibold text-slate-900">{plot.buyerName || 'N/A'}</p>
            </div>

            {/* Amount */}
            <div className={cn(
                'p-3 rounded-lg font-semibold text-lg text-white font-mono',
                'bg-gradient-to-r from-emerald-500 to-teal-500'
            )}>
                ₹{getPlotAmount(plot).toLocaleString('en-IN')}
            </div>

            {/* Booked Specific Info */}
            {plot.status === 'booked' && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-yellow-700 font-medium">Payment Progress</p>
                        <span className="text-xs font-bold text-yellow-900">{plot.paidPercentage || 0}%</span>
                    </div>
                    <div className="w-full bg-yellow-200 rounded-full h-2.5">
                        <div
                            className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2.5 rounded-full transition-all"
                            style={{ width: `${plot.paidPercentage || 0}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Broker Info */}
            {plot.brokerName && (
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-700 font-medium">Associate</p>
                    <p className="text-sm font-semibold text-purple-900">{plot.brokerName}</p>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-3 border-t border-slate-200">
                <Button
                    variant="default"
                    size="sm"
                    onClick={onViewDetails}
                    className="flex-1 text-xs h-9 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-sm"
                >
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    Details
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onViewPayments}
                    className="text-xs h-9 px-3 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                >
                    <DollarSign className="h-3.5 w-3.5" />
                </Button>
                {(plot.status === 'booked' || plot.status === 'sold') && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPrint(plot)}
                        className="text-xs h-9 px-3 border-purple-200 text-purple-600 hover:bg-purple-50"
                        title="Print Receipt"
                    >
                        🖨️
                    </Button>
                )}
            </div>
        </CardContent>
    </Card>
);

export default function AdminPlotHistoryPage() {
    const [plots, setPlots] = useState<Plot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Drawer state
    const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
    const [isPlotDrawerOpen, setIsPlotDrawerOpen] = useState(false);
    const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
    const [installments, setInstallments] = useState<PaymentInstallment[]>([]);
    
    // Receipt state
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [receiptProps, setReceiptProps] = useState<PrintableReceiptProps | null>(null);
    
    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [projectFilter, setProjectFilter] = useState<string>('all');
    const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // Load plots on mount
    useEffect(() => {
        const loadPlots = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // Fetch real plots from database
                const allPlots = await getPlots();
                
                // Filter to show ONLY booked or sold plots
                const filteredPlots = allPlots.filter(plot => 
                    plot.status === 'booked' || plot.status === 'sold'
                );
                
                setPlots(filteredPlots);
            } catch (err) {
                console.error('Error loading plots:', err);
                setError('Failed to load plots. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        loadPlots();
    }, []);

    // Filter plots based on search and filters
    const filteredPlots = plots.filter(plot => {
        const matchesSearch = 
            plot.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            plot.plotNumber.toString().includes(searchQuery) ||
            plot.buyerName?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || plot.status === statusFilter;
        const matchesProject = projectFilter === 'all' || plot.projectName === projectFilter;
        
        return matchesSearch && matchesStatus && matchesProject;
    });

    // Get unique projects and statuses
    const projects = Array.from(new Set(plots.map(p => p.projectName))).sort();
    const statuses = Array.from(new Set(plots.map(p => p.status)));

    const handleViewPlot = (plot: Plot) => {
        setSelectedPlot(plot);
        setIsPlotDrawerOpen(true);
    };

    const handleViewPayments = async (plot: Plot) => {
        setSelectedPlot(plot);
        
        // Fetch payment history for this plot
        try {
            const payments = await getPaymentHistory(plot.id);
            setPaymentHistory(payments);
            
            // Generate installment schedule based on tenure
            const generatedInstallments = generateInstallmentSchedule(plot, payments);
            setInstallments(generatedInstallments);
        } catch (err) {
            console.error('Error fetching payment history:', err);
            setPaymentHistory([]);
            setInstallments([]);
        }
        
        setIsPaymentDrawerOpen(true);
    };

    const handlePrintReceipt = (plot: Plot) => {
        if (plot.status === 'booked') {
            const receipt: PrintableReceiptProps = {
                plotType: 'booked',
                paymentDetails: {
                    id: plot.id || '',
                    receiptNumber: `${1000 + parseInt(plot.id || '1', 10)}`,
                    date: new Date().toLocaleDateString('en-IN'),
                    paymentMode: 'bank_transfer',
                    transactionId: `TXN-${Date.now()}`,
                },
                buyerDetails: {
                    name: plot.buyerName || 'N/A',
                    mobile: '+91 XXXX XXXX',
                    address: 'Property Address',
                },
                projectDetails: {
                    projectName: plot.projectName,
                    plotNumber: plot.plotNumber.toString(),
                    block: plot.block,
                    area: plot.area || 0,
                    facing: plot.facing || 'N/A',
                    dimension: plot.dimension,
                },
                financialDetails: {
                    totalAmount: plot.totalPlotAmount || 0,
                    bookingAmount: plot.bookingAmount || 0,
                    totalPaidTillDate: (plot.totalPlotAmount || 0) * (plot.paidPercentage || 0) / 100,
                    outstandingBalance: (plot.totalPlotAmount || 0) - ((plot.totalPlotAmount || 0) * (plot.paidPercentage || 0) / 100),
                },
                salesExecutive: plot.brokerName || 'Sales Executive',
            };
            setReceiptProps(receipt);
        } else if (plot.status === 'sold') {
            const receipt: PrintableReceiptProps = {
                plotType: 'sold',
                paymentDetails: {
                    id: plot.id || '',
                    receiptNumber: `${1000 + parseInt(plot.id || '1', 10)}`,
                    date: new Date().toLocaleDateString('en-IN'),
                    paymentMode: 'bank_transfer',
                    transactionId: `TXN-${Date.now()}`,
                },
                buyerDetails: {
                    name: plot.buyerName || 'N/A',
                    mobile: '+91 XXXX XXXX',
                    address: 'Property Address',
                },
                projectDetails: {
                    projectName: plot.projectName,
                    plotNumber: plot.plotNumber.toString(),
                    block: plot.block,
                    area: plot.area || 0,
                    facing: plot.facing || 'N/A',
                    dimension: plot.dimension,
                },
                financialDetails: {
                    totalAmount: plot.salePrice || 0,
                    bookingAmount: 0,
                    totalPaidTillDate: plot.salePrice || 0,
                    outstandingBalance: 0,
                },
                salesExecutive: plot.brokerName || 'Sales Executive',
            };
            setReceiptProps(receipt);
        }
        setIsReceiptModalOpen(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
            <div className="container mx-auto p-6 space-y-6">
                {/* Header Section */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">📊 Plot History</h1>
                            <p className="text-slate-600">View all booked and sold plots with complete payment tracking</p>
                        </div>
                        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    'p-2 rounded transition-all',
                                    viewMode === 'grid' 
                                        ? 'bg-white text-blue-600 shadow-sm' 
                                        : 'text-slate-600 hover:text-slate-900'
                                )}
                            >
                                <Grid3X3 className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={cn(
                                    'p-2 rounded transition-all',
                                    viewMode === 'table' 
                                        ? 'bg-white text-emerald-600 shadow-sm' 
                                        : 'text-slate-600 hover:text-slate-900'
                                )}
                            >
                                <List className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <p className="text-red-800">{error}</p>
                </div>
            )}

            {/* Filters Card */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-t-lg">
                    <CardTitle className="text-white flex items-center gap-2">
                        🔍 Filter Results
                    </CardTitle>
                    <p className="text-blue-100 text-xs mt-1">Refine your search to find specific plots</p>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Status Filter */}
                        <div>
                            <label className="text-xs font-medium mb-2 block">Status</label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    {statuses.map(status => (
                                        <SelectItem key={status} value={status}>
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Project Filter */}
                        <div>
                            <label className="text-xs font-medium mb-2 block">Project</label>
                            <Select value={projectFilter} onValueChange={setProjectFilter}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Projects</SelectItem>
                                    {projects.map(project => (
                                        <SelectItem key={project} value={project}>
                                            {project}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Search Input */}
                        <div>
                            <label className="text-xs font-medium mb-2 block">Search Buyer</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buyer name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Empty State */}
            {filteredPlots.length === 0 && (
                <Card className="border-slate-200">
                    <CardContent className="pt-12 text-center">
                        <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">No plots found matching your criteria</p>
                        <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or search query</p>
                    </CardContent>
                </Card>
            )}

            {/* Plots Display - Grid View */}
            {filteredPlots.length > 0 && viewMode === 'grid' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                📦 Grid View
                            </h2>
                            <p className="text-xs text-slate-600 mt-1">Showing {filteredPlots.length} plot(s)</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredPlots.map(plot => (
                            <PlotCard 
                                key={plot.id} 
                                plot={plot}
                                onViewDetails={() => handleViewPlot(plot)}
                                onViewPayments={() => handleViewPayments(plot)}
                                onPrint={handlePrintReceipt}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Plots Display - Table View */}
            {filteredPlots.length > 0 && viewMode === 'table' && (
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                    📋 Table View
                                </h2>
                                <p className="text-xs text-slate-600 mt-1">Showing {filteredPlots.length} plot(s)</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-100 hover:bg-slate-100">
                                        <TableHead className="font-semibold text-slate-900">Plot #</TableHead>
                                        <TableHead className="font-semibold text-slate-900">Project</TableHead>
                                        <TableHead className="font-semibold text-slate-900">Buyer</TableHead>
                                        <TableHead className="font-semibold text-slate-900 text-right">Amount</TableHead>
                                        <TableHead className="font-semibold text-slate-900">Status</TableHead>
                                        <TableHead className="font-semibold text-slate-900">Progress</TableHead>
                                        <TableHead className="font-semibold text-slate-900 text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPlots.map((plot) => (
                                        <TableRow key={plot.id} className="hover:bg-blue-50 transition-colors">
                                            <TableCell className="font-semibold text-slate-900">
                                                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                                                    #{plot.plotNumber}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-slate-700">{plot.projectName}</TableCell>
                                            <TableCell className="text-slate-700">{plot.buyerName || 'N/A'}</TableCell>
                                            <TableCell className="text-right font-semibold text-emerald-600">
                                                ₹{(getPlotAmount(plot) || 0).toLocaleString('en-IN')}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn(
                                                    'text-xs font-semibold',
                                                    plot.status === 'booked' 
                                                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                                                        : 'bg-red-100 text-red-800 border border-red-300'
                                                )}>
                                                    {plot.status === 'booked' ? '🔄 Booked' : '✓ Sold'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {plot.status === 'booked' ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 bg-slate-200 rounded-full h-2">
                                                            <div
                                                                className="bg-gradient-to-r from-blue-500 to-emerald-500 h-2 rounded-full transition-all"
                                                                style={{ width: `${plot.paidPercentage || 0}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-semibold text-slate-700">
                                                            {plot.paidPercentage || 0}%
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-semibold text-emerald-600">Completed ✓</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2 justify-center">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleViewPlot(plot)}
                                                        className="text-xs h-8 border-blue-200 text-blue-600 hover:bg-blue-50"
                                                        title="View details"
                                                    >
                                                        <Eye className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleViewPayments(plot)}
                                                        className="text-xs h-8 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                                        title="View payments"
                                                    >
                                                        <DollarSign className="h-3 w-3" />
                                                    </Button>
                                                    {(plot.status === 'booked' || plot.status === 'sold') && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handlePrintReceipt(plot)}
                                                            className="text-xs h-8 border-purple-200 text-purple-600 hover:bg-purple-50"
                                                            title="Print receipt"
                                                        >
                                                            🖨️
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Plot Detail Drawer */}
            <RoleBasedPlotDetailDrawer
                isOpen={isPlotDrawerOpen}
                onClose={() => {
                    setIsPlotDrawerOpen(false);
                    setSelectedPlot(null);
                }}
                plot={selectedPlot}
                userRole="admin"
                onEdit={(plot) => {
                    console.log('Edit plot:', plot);
                }}
                onDelete={(plotId) => {
                    console.log('Delete plot:', plotId);
                }}
                onAddPayment={(plot) => {
                    console.log('Add payment for plot:', plot);
                }}
                onCancel={(plotId) => {
                    console.log('Cancel booking:', plotId);
                }}
                onConvertToSold={(plot) => {
                    console.log('Convert to sold:', plot);
                }}
            />

            {/* Payment Installment Drawer */}
            <PaymentInstallmentDrawer
                isOpen={isPaymentDrawerOpen}
                onClose={() => {
                    setIsPaymentDrawerOpen(false);
                    setSelectedPlot(null);
                    setPaymentHistory([]);
                    setInstallments([]);
                }}
                plot={selectedPlot}
                installments={installments}
                paymentHistory={paymentHistory}
                userRole="admin"
            />

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
        </div>
    );
}
