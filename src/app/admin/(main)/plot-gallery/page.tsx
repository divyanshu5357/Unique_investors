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
import { Eye, DollarSign, Loader2, AlertCircle, HelpingHand, XCircle, Search } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { getPlots, getPaymentHistory } from '@/lib/actions';

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

const PlotCard = ({ plot, onViewDetails, onViewPayments }: { plot: Plot; onViewDetails: () => void; onViewPayments: () => void; }) => (
    <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
                <div>
                    <CardTitle className="text-base">Plot #{plot.plotNumber}</CardTitle>
                    <p className="text-xs text-muted-foreground">{plot.projectName} • {plot.block}</p>
                </div>
                <Badge variant="outline" className={cn("text-xs flex items-center gap-1", statusConfig[plot.status as keyof typeof statusConfig]?.badgeClass)}>
                    {statusConfig[plot.status as keyof typeof statusConfig]?.icon}
                    {statusConfig[plot.status as keyof typeof statusConfig]?.label}
                </Badge>
            </div>
        </CardHeader>
        <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                    <p className="text-muted-foreground text-xs">Type</p>
                    <p className="font-medium">{plot.type}</p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs">Area</p>
                    <p className="font-medium">{plot.area} gaj</p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs">Dimension</p>
                    <p className="font-medium text-sm">{plot.dimension}</p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs">Facing</p>
                    <p className="font-medium">{plot.facing || 'N/A'}</p>
                </div>
            </div>

            {/* Buyer Info */}
            <div className="border-t pt-2">
                <p className="text-xs text-muted-foreground mb-0.5">Buyer</p>
                <p className="font-medium text-sm">{plot.buyerName || 'N/A'}</p>
            </div>

            {/* Amount Section */}
            <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
                <p className="text-xs text-muted-foreground mb-1">
                    {plot.status === 'booked' ? 'Total Amount' : 'Sale Price'}
                </p>
                <p className="text-lg font-bold text-blue-600">
                    ₹{getPlotAmount(plot).toLocaleString('en-IN')}
                </p>
            </div>

            {/* Booked Specific Info */}
            {plot.status === 'booked' && (
                <div className="text-xs">
                    <p className="text-muted-foreground">Paid: <span className="font-semibold text-gray-900">{plot.paidPercentage || 0}%</span></p>
                </div>
            )}

            {/* Broker Info */}
            {plot.brokerName && (
                <div className="text-xs">
                    <p className="text-muted-foreground">Associate</p>
                    <p className="font-medium">{plot.brokerName}</p>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
                <Button
                    variant="default"
                    size="sm"
                    onClick={onViewDetails}
                    className="flex-1 text-xs h-8"
                >
                    <Eye className="h-3 w-3 mr-1" />
                    Details
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onViewPayments}
                    className="text-xs h-8 px-2"
                >
                    <DollarSign className="h-3 w-3" />
                </Button>
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
    
    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [projectFilter, setProjectFilter] = useState<string>('all');
    const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);

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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold mb-1">Plot History</h1>
                <p className="text-sm text-muted-foreground">
                    View all booked and sold plots with payment tracking
                </p>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <p className="text-red-800">{error}</p>
                </div>
            )}

            {/* Filters Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Filters</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Select filters to view plot history.</p>
                </CardHeader>
                <CardContent className="space-y-4">
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
                <Card>
                    <CardContent className="pt-6 text-center">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">No plots found matching your criteria</p>
                    </CardContent>
                </Card>
            )}

            {/* Plots Grid */}
            {filteredPlots.length > 0 && (
                <div>
                    <h2 className="text-base font-semibold mb-4">Plot History Grid</h2>
                    <p className="text-xs text-muted-foreground mb-4">View all your booked and sold plots. Click a plot to see details.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPlots.map(plot => (
                            <PlotCard 
                                key={plot.id} 
                                plot={plot}
                                onViewDetails={() => handleViewPlot(plot)}
                                onViewPayments={() => handleViewPayments(plot)}
                            />
                        ))}
                    </div>
                </div>
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
                onPrint={(plot) => {
                    window.print();
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
                onPrint={(plot) => {
                    window.print();
                }}
            />
        </div>
    );
}
