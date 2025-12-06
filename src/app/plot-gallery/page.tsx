"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RoleBasedPlotDetailDrawer } from '@/components/admin/RoleBasedPlotDetailDrawer';
import { PaymentInstallmentDrawer } from '@/components/admin/PaymentInstallmentDrawer';
import { Eye, DollarSign, Grid3X3, List, Search, Filter, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { Plot } from '@/lib/schema';

/**
 * Plot Gallery Page
 * 
 * Displays all plots with filtering, search, and role-based access
 * Integrates RoleBasedPlotDetailDrawer for viewing plot details
 * Integrates PaymentInstallmentDrawer for payment details (booked/sold plots)
 */

// Mock data - replace with actual API calls
const mockPlots: Plot[] = [
    {
        id: '1',
        projectName: 'Sunset Heights',
        block: 'A',
        plotNumber: 101,
        status: 'available',
        type: 'Residential',
        dimension: '25x40',
        area: 1000,
        price: 5000,
        facing: 'East',
        createdAt: new Date('2024-11-01'),
        updatedAt: new Date('2024-12-01'),
    },
    {
        id: '2',
        projectName: 'Sunset Heights',
        block: 'A',
        plotNumber: 102,
        status: 'booked',
        type: 'Residential',
        dimension: '25x40',
        area: 1000,
        price: 5000,
        facing: 'West',
        buyerName: 'John Doe',
        bookingAmount: 100000,
        totalPlotAmount: 500000,
        paidPercentage: 60,
        brokerName: 'Broker A',
        bookingDate: '2024-10-15',
        createdAt: new Date('2024-10-15'),
        updatedAt: new Date('2024-12-01'),
    },
    {
        id: '3',
        projectName: 'Sunset Heights',
        block: 'B',
        plotNumber: 201,
        status: 'sold',
        type: 'Commercial',
        dimension: '30x50',
        area: 1500,
        price: 7500,
        facing: 'North',
        buyerName: 'Jane Smith',
        salePrice: 1125000,
        soldAmount: 1125000,
        saleDate: '2024-09-20',
        brokerName: 'Broker B',
        createdAt: new Date('2024-09-20'),
        updatedAt: new Date('2024-12-01'),
    },
    {
        id: '4',
        projectName: 'Green Valley',
        block: 'C',
        plotNumber: 301,
        status: 'available',
        type: 'Residential',
        dimension: '20x30',
        area: 600,
        price: 4000,
        facing: 'South',
        createdAt: new Date('2024-11-10'),
        updatedAt: new Date('2024-12-01'),
    },
    {
        id: '5',
        projectName: 'Green Valley',
        block: 'D',
        plotNumber: 401,
        status: 'booked',
        type: 'Residential',
        dimension: '25x40',
        area: 1000,
        price: 5000,
        facing: 'East',
        buyerName: 'Robert Johnson',
        bookingAmount: 150000,
        totalPlotAmount: 600000,
        paidPercentage: 40,
        brokerName: 'Broker C',
        bookingDate: '2024-11-05',
        createdAt: new Date('2024-11-05'),
        updatedAt: new Date('2024-12-01'),
    },
];

export default function PlotGalleryPage() {
    // State management
    const [plots, setPlots] = useState<Plot[]>(mockPlots);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
    const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
    const [isPlotDrawerOpen, setIsPlotDrawerOpen] = useState(false);
    const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
    const [userRole, setUserRole] = useState<'admin' | 'broker'>('admin');
    const [loading, setLoading] = useState(false);

    // Filters
    const [searchPlotNumber, setSearchPlotNumber] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterProject, setFilterProject] = useState<string>('all');
    const [filterBlock, setFilterBlock] = useState<string>('all');

    // Get unique values for filters
    const projects = useMemo(
        () => [...new Set(plots.map(p => p.projectName))],
        [plots]
    );
    const blocks = useMemo(
        () => [...new Set(plots.map(p => p.block))],
        [plots]
    );

    // Filter plots based on criteria
    const filteredPlots = useMemo(() => {
        return plots.filter(plot => {
            const matchesSearch = plot.plotNumber.toString().includes(searchPlotNumber);
            const matchesStatus = filterStatus === 'all' || plot.status === filterStatus;
            const matchesProject = filterProject === 'all' || plot.projectName === filterProject;
            const matchesBlock = filterBlock === 'all' || plot.block === filterBlock;

            // For brokers: only show booked and sold plots
            const brokerAccess = userRole === 'admin' || ['booked', 'sold'].includes(plot.status);

            return (
                matchesSearch &&
                matchesStatus &&
                matchesProject &&
                matchesBlock &&
                brokerAccess
            );
        });
    }, [plots, searchPlotNumber, filterStatus, filterProject, filterBlock, userRole]);

    // Load plots from API (mock for now)
    useEffect(() => {
        // Replace with actual API call: const data = await getPlots();
        setLoading(false);
    }, []);

    // Handle view plot details
    const handleViewPlot = (plot: Plot) => {
        setSelectedPlot(plot);
        setIsPlotDrawerOpen(true);
    };

    // Handle view payment details (for booked/sold plots)
    const handleViewPayments = (plot: Plot) => {
        setSelectedPlot(plot);
        setIsPaymentDrawerOpen(true);
    };

    // Status badge styling
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available':
                return 'bg-green-100 text-green-800 hover:bg-green-200';
            case 'booked':
                return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
            case 'sold':
                return 'bg-red-100 text-red-800 hover:bg-red-200';
            case 'cancelled':
                return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const stats = {
        total: filteredPlots.length,
        available: filteredPlots.filter(p => p.status === 'available').length,
        booked: filteredPlots.filter(p => p.status === 'booked').length,
        sold: filteredPlots.filter(p => p.status === 'sold').length,
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold mb-2">Plot Gallery</h1>
                <p className="text-muted-foreground">
                    Browse and manage all plots with detailed information
                </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Plots
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Available
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.available}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Booked
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats.booked}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Sold
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.sold}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Controls Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filters & Search
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Search and Role Toggle */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <label className="text-sm font-medium mb-2 block">Search by Plot Number</label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="e.g., 101, 202..."
                                    value={searchPlotNumber}
                                    onChange={(e) => setSearchPlotNumber(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">View As</label>
                            <Select value={userRole} onValueChange={(value) => setUserRole(value as 'admin' | 'broker')}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin View</SelectItem>
                                    <SelectItem value="broker">Broker View</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Filter Dropdowns */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Status</label>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="available">Available</SelectItem>
                                    <SelectItem value="booked">Booked</SelectItem>
                                    <SelectItem value="sold">Sold</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Project</label>
                            <Select value={filterProject} onValueChange={setFilterProject}>
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

                        <div>
                            <label className="text-sm font-medium mb-2 block">Block</label>
                            <Select value={filterBlock} onValueChange={setFilterBlock}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Blocks</SelectItem>
                                    {blocks.map(block => (
                                        <SelectItem key={block} value={block}>
                                            Block {block}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex gap-2 pt-2">
                        <Button
                            variant={viewMode === 'table' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setViewMode('table')}
                            className="gap-2"
                        >
                            <List className="h-4 w-4" />
                            Table View
                        </Button>
                        <Button
                            variant={viewMode === 'grid' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setViewMode('grid')}
                            className="gap-2"
                        >
                            <Grid3X3 className="h-4 w-4" />
                            Grid View
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Table View */}
            {viewMode === 'table' && (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            Plots ({filteredPlots.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {filteredPlots.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">No plots found matching your filters</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Plot #</TableHead>
                                            <TableHead>Project</TableHead>
                                            <TableHead>Block</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Area (Gaj)</TableHead>
                                            <TableHead>Status</TableHead>
                                            {userRole === 'admin' && <TableHead>Owner/Buyer</TableHead>}
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
                                                <TableCell>{plot.type}</TableCell>
                                                <TableCell>{plot.area}</TableCell>
                                                <TableCell>
                                                    <Badge className={getStatusColor(plot.status)}>
                                                        {plot.status.charAt(0).toUpperCase() + plot.status.slice(1)}
                                                    </Badge>
                                                </TableCell>
                                                {userRole === 'admin' && (
                                                    <TableCell>
                                                        {plot.buyerName || 'N/A'}
                                                    </TableCell>
                                                )}
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleViewPlot(plot)}
                                                            title="View details"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        {(plot.status === 'booked' || plot.status === 'sold') && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleViewPayments(plot)}
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
            )}

            {/* Grid View */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPlots.length === 0 ? (
                        <div className="col-span-full text-center py-8">
                            <p className="text-muted-foreground">No plots found matching your filters</p>
                        </div>
                    ) : (
                        filteredPlots.map(plot => (
                            <Card key={plot.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-lg">Plot #{plot.plotNumber}</CardTitle>
                                            <CardDescription>{plot.projectName}</CardDescription>
                                        </div>
                                        <Badge className={getStatusColor(plot.status)}>
                                            {plot.status.charAt(0).toUpperCase() + plot.status.slice(1)}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Block</p>
                                            <p className="font-medium">{plot.block}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Area</p>
                                            <p className="font-medium">{plot.area} Gaj</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Type</p>
                                            <p className="font-medium">{plot.type}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Facing</p>
                                            <p className="font-medium">{plot.facing || 'N/A'}</p>
                                        </div>
                                    </div>

                                    {plot.status === 'booked' && (
                                        <div className="bg-yellow-50 p-3 rounded">
                                            <p className="text-xs text-muted-foreground mb-1">Payment Progress</p>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-gray-200 rounded-full">
                                                    <div
                                                        className="h-2 bg-yellow-500 rounded-full"
                                                        style={{ width: `${plot.paidPercentage || 0}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs font-medium">
                                                    {plot.paidPercentage || 0}%
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            className="flex-1"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleViewPlot(plot)}
                                        >
                                            <Eye className="h-4 w-4 mr-2" />
                                            Details
                                        </Button>
                                        {(plot.status === 'booked' || plot.status === 'sold') && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleViewPayments(plot)}
                                            >
                                                <DollarSign className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
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
                userRole={userRole}
                onEdit={(plot) => console.log('Edit plot:', plot)}
                onDelete={(plotId) => console.log('Delete plot:', plotId)}
                onAddPayment={(plot) => console.log('Add payment for:', plot)}
                onCancel={(plotId) => console.log('Cancel booking:', plotId)}
                onConvertToSold={(plot) => console.log('Convert to sold:', plot)}
                onPrint={(plot) => window.print()}
            />

            {/* Payment Installment Drawer */}
            <PaymentInstallmentDrawer
                isOpen={isPaymentDrawerOpen}
                onClose={() => {
                    setIsPaymentDrawerOpen(false);
                    setSelectedPlot(null);
                }}
                plot={selectedPlot}
                installments={[
                    {
                        id: '1',
                        installmentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                        amount: 100000,
                        paymentMethod: 'Bank Transfer',
                        receiptNumber: 'REC-001-2024',
                        status: 'paid',
                        lateFee: 0,
                    },
                    {
                        id: '2',
                        installmentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                        amount: 100000,
                        paymentMethod: 'Cheque',
                        receiptNumber: 'REC-002-2024',
                        status: 'paid',
                        lateFee: 0,
                    },
                    {
                        id: '3',
                        installmentDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
                        amount: 100000,
                        paymentMethod: undefined,
                        receiptNumber: undefined,
                        status: 'unpaid',
                        lateFee: 5000,
                    },
                ]}
                userRole={userRole}
                onDownloadReceipt={(installmentId) => console.log('Download receipt:', installmentId)}
                onPrint={(plot) => window.print()}
            />
        </div>
    );
}
