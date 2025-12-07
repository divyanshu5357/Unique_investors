"use client"

import React, { useState, useEffect } from 'react';
import { Plot } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RoleBasedPlotDetailDrawer } from '@/components/admin/RoleBasedPlotDetailDrawer';
import { PaymentInstallmentDrawer } from '@/components/admin/PaymentInstallmentDrawer';
import { Eye, DollarSign, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Sample Integration Component
 * 
 * This component demonstrates how to use both the RoleBasedPlotDetailDrawer
 * and PaymentInstallmentDrawer in a real application.
 * 
 * Usage:
 * - Admin can view all plots and perform all actions
 * - Brokers can only view booked and sold plots in read-only mode
 * - Payment details drawer focuses on installment tracking
 */

// Utility: Generate sample dates (moved outside component to avoid purity issues)
const NOW = new Date();
const SAMPLE_INSTALLMENT_DATES = {
    past30Days: new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    past15Days: new Date(NOW.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    future15Days: new Date(NOW.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
};

interface SampleIntegrationProps {
    plots: Plot[];
    userRole: 'admin' | 'broker';
    onActionComplete?: () => void;
}

export function PlotDetailDrawersSampleIntegration({
    plots,
    userRole,
    onActionComplete,
}: SampleIntegrationProps) {
    // Drawer state
    const [isPlotDrawerOpen, setIsPlotDrawerOpen] = useState(false);
    const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
    const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
    const [activeTab, setActiveTab] = useState<'booked' | 'sold' | 'all'>('all');

    // Filter plots based on user role
    const filteredPlots = plots.filter(plot => {
        if (userRole === 'admin') {
            return activeTab === 'all' || plot.status === activeTab;
        }
        // Brokers can only see booked and sold plots
        return ['booked', 'sold'].includes(plot.status);
    });

    // Sample mock data for installments (in real app, this would come from API)
    const mockInstallments = [
        {
            id: '1',
            installmentDate: SAMPLE_INSTALLMENT_DATES.past30Days,
            amount: 100000,
            paymentMethod: 'Bank Transfer',
            receiptNumber: 'REC-001-2024',
            status: 'paid' as const,
            lateFee: 0,
        },
        {
            id: '2',
            installmentDate: SAMPLE_INSTALLMENT_DATES.past15Days,
            amount: 100000,
            paymentMethod: 'Cheque',
            receiptNumber: 'REC-002-2024',
            status: 'paid' as const,
            lateFee: 0,
        },
        {
            id: '3',
            installmentDate: SAMPLE_INSTALLMENT_DATES.future15Days,
            amount: 100000,
            paymentMethod: undefined,
            receiptNumber: undefined,
            status: 'unpaid' as const,
            lateFee: 5000,
        },
    ];

    const handleViewPlot = (plot: Plot) => {
        setSelectedPlot(plot);
        setIsPlotDrawerOpen(true);
    };

    const handleViewPayments = (plot: Plot) => {
        setSelectedPlot(plot);
        setIsPaymentDrawerOpen(true);
    };

    const handleEditPlot = (plot: Plot) => {
        console.log('Edit plot:', plot);
        // Open edit dialog
    };

    const handleDeletePlot = (plotId: string) => {
        console.log('Delete plot:', plotId);
        // Confirm and delete
        onActionComplete?.();
    };

    const handleAddPayment = (plot: Plot) => {
        console.log('Add payment for plot:', plot);
        // Open payment dialog
    };

    const handleCancelBooking = (plotId: string) => {
        console.log('Cancel booking for plot:', plotId);
        // Confirm and cancel
        onActionComplete?.();
    };

    const handleConvertToSold = (plot: Plot) => {
        console.log('Convert plot to sold:', plot);
        // Confirm and convert
        onActionComplete?.();
    };

    const handlePrint = (plot: Plot) => {
        console.log('Print plot details:', plot);
        window.print();
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'available':
                return 'bg-green-100 text-green-800';
            case 'booked':
                return 'bg-yellow-100 text-yellow-800';
            case 'sold':
                return 'bg-red-100 text-red-800';
            case 'cancelled':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold mb-2">
                    {userRole === 'admin' ? 'Plot Management' : 'My Plots'}
                </h1>
                <p className="text-muted-foreground">
                    {userRole === 'admin'
                        ? 'Manage all plots in the inventory'
                        : 'View your booked and sold plots'}
                </p>
            </div>

            {/* Filter Tabs - Admin Only */}
            {userRole === 'admin' && (
                <div className="flex gap-2 border-b">
                    {['all', 'booked', 'sold'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                                activeTab === tab
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            )}

            {/* Plots Table */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        {userRole === 'admin' ? 'Plots' : 'Your Plots'} ({filteredPlots.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredPlots.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">No plots available</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Plot No.</TableHead>
                                        <TableHead>Project</TableHead>
                                        <TableHead>Block</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Area (Gaj)</TableHead>
                                        {userRole === 'admin' && (
                                            <>
                                                <TableHead>Owner/Buyer</TableHead>
                                                <TableHead>Price</TableHead>
                                            </>
                                        )}
                                        {userRole === 'broker' && (
                                            <>
                                                <TableHead>Payment</TableHead>
                                                <TableHead>Updated</TableHead>
                                            </>
                                        )}
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPlots.map(plot => (
                                        <TableRow key={plot.id}>
                                            <TableCell className="font-semibold">
                                                #{plot.plotNumber}
                                            </TableCell>
                                            <TableCell>{plot.projectName}</TableCell>
                                            <TableCell>{plot.block}</TableCell>
                                            <TableCell>
                                                <Badge className={getStatusBadgeColor(plot.status)}>
                                                    {plot.status.charAt(0).toUpperCase() +
                                                        plot.status.slice(1)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{plot.area}</TableCell>
                                            {userRole === 'admin' && (
                                                <>
                                                    <TableCell>
                                                        {plot.buyerName || 'N/A'}
                                                    </TableCell>
                                                    <TableCell>
                                                        ₹
                                                        {(plot.totalPlotAmount ||
                                                            plot.salePrice ||
                                                            0
                                                        ).toLocaleString('en-IN')}
                                                    </TableCell>
                                                </>
                                            )}
                                            {userRole === 'broker' && (
                                                <>
                                                    <TableCell>
                                                        {plot.status === 'booked' ? (
                                                            <div className="flex items-center gap-1">
                                                                <div className="w-16 h-2 bg-gray-200 rounded-full">
                                                                    <div
                                                                        className="h-2 bg-green-500 rounded-full"
                                                                        style={{
                                                                            width: `${plot.paidPercentage || 0}%`,
                                                                        }}
                                                                    ></div>
                                                                </div>
                                                                <span className="text-xs font-medium">
                                                                    {plot.paidPercentage || 0}%
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            'Completed'
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {plot.updatedAt
                                                            ? format(
                                                                new Date(plot.updatedAt),
                                                                'dd MMM yyyy'
                                                            )
                                                            : 'N/A'}
                                                    </TableCell>
                                                </>
                                            )}
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleViewPlot(plot)}
                                                        title="View plot details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {userRole === 'broker' &&
                                                        plot.status === 'booked' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    handleViewPayments(plot)
                                                                }
                                                                title="View payment details"
                                                            >
                                                                <DollarSign className="h-4 w-4" />
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

            {/* Plot Detail Drawer */}
            <RoleBasedPlotDetailDrawer
                isOpen={isPlotDrawerOpen}
                onClose={() => {
                    setIsPlotDrawerOpen(false);
                    setSelectedPlot(null);
                }}
                plot={selectedPlot}
                userRole={userRole}
                onEdit={handleEditPlot}
                onDelete={handleDeletePlot}
                onAddPayment={handleAddPayment}
                onCancel={handleCancelBooking}
                onConvertToSold={handleConvertToSold}
            />

            {/* Payment Installment Drawer */}
            <PaymentInstallmentDrawer
                isOpen={isPaymentDrawerOpen}
                onClose={() => {
                    setIsPaymentDrawerOpen(false);
                    setSelectedPlot(null);
                }}
                plot={selectedPlot}
                installments={mockInstallments}
                userRole={userRole}
                onDownloadReceipt={(installmentId) => {
                    console.log('Download receipt for:', installmentId);
                    // Implement receipt download logic
                }}
            />
        </div>
    );
}

/**
 * Alternative: Export as a Page Component for Next.js
 * 
 * Usage:
 * Create a file: src/app/admin/plots-drawer-demo/page.tsx
 * 
 * "use client"
 * import { PlotDetailDrawersSampleIntegration } from '@/components/admin/PlotDetailDrawersSampleIntegration';
 * import { useEffect, useState } from 'react';
 * import { getPlots } from '@/lib/actions';
 * 
 * export default function PlotsDrawerDemoPage() {
 *     const [plots, setPlots] = useState([]);
 * 
 *     useEffect(() => {
 *         const fetchPlots = async () => {
 *             const data = await getPlots();
 *             setPlots(data);
 *         };
 *         fetchPlots();
 *     }, []);
 * 
 *     return (
 *         <div className="container py-8">
 *             <PlotDetailDrawersSampleIntegration
 *                 plots={plots}
 *                 userRole="admin"
 *                 onActionComplete={() => {
 *                     // Refresh plots
 *                 }}
 *             />
 *         </div>
 *     );
 * }
 */
