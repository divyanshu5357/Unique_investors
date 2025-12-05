"use client"

import React, { useState } from 'react';
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
    Pencil, 
    Trash2, 
    CreditCard, 
    X, 
    CheckCircle2, 
    AlertCircle,
    FileText,
    Clock,
    User,
    DollarSign,
    Briefcase,
    TrendingUp,
    History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface PlotDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    plot: Plot | null;
    onEdit?: (plot: Plot) => void;
    onDelete?: (plotId: string) => void;
    onAddPayment?: (plot: Plot) => void;
    onCancel?: (plotId: string) => void;
    onConvertToSold?: (plot: Plot) => void;
}

const statusConfig = {
    available: {
        label: 'Available',
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: CheckCircle2,
    },
    booked: {
        label: 'Booked',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: AlertCircle,
    },
    sold: {
        label: 'Sold',
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: CheckCircle2,
    },
    cancelled: {
        label: 'Cancelled',
        color: 'bg-gray-100 text-gray-800 border-gray-300',
        icon: X,
    },
};

export function PlotDetailDrawer({
    isOpen,
    onClose,
    plot,
    onEdit,
    onDelete,
    onAddPayment,
    onCancel,
    onConvertToSold,
}: PlotDetailDrawerProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    if (!plot) return null;

    const statusInfo = statusConfig[plot.status as keyof typeof statusConfig];
    const StatusIcon = statusInfo?.icon || AlertCircle;

    const paidAmount = plot.bookingAmount ? Math.floor((plot.paidPercentage || 0) * plot.bookingAmount / 100) : 0;
    const remainingAmount = plot.bookingAmount ? (plot.bookingAmount - paidAmount) : 0;

    return (
        <>
            <Sheet open={isOpen} onOpenChange={onClose}>
                <SheetContent side="right" className="w-full sm:w-[600px] md:w-[700px] flex flex-col p-0">
                    {/* Sticky Header */}
                    <div className="sticky top-0 z-10 bg-background border-b p-6">
                        <SheetHeader className="mb-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <SheetTitle className="text-2xl mb-2">
                                        Plot #{plot.plotNumber}
                                    </SheetTitle>
                                    <SheetDescription className="text-base">
                                        {plot.projectName} • {plot.block}
                                    </SheetDescription>
                                </div>
                                <Badge className={cn(
                                    "flex items-center gap-2",
                                    statusInfo?.color
                                )}>
                                    <StatusIcon className="h-3 w-3" />
                                    {statusInfo?.label}
                                </Badge>
                            </div>
                        </SheetHeader>
                        
                        {plot.updatedAt && (
                            <p className="text-xs text-muted-foreground">
                                Last updated: {format(new Date(plot.updatedAt), 'MMM dd, yyyy HH:mm')}
                            </p>
                        )}
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto">
                        <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="sticky top-0 z-10 w-full justify-start border-b bg-background rounded-none px-6 h-12">
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="specs">Specifications</TabsTrigger>
                                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                                {plot.status === 'booked' && <TabsTrigger value="booking">Booking</TabsTrigger>}
                                {plot.status === 'booked' && <TabsTrigger value="payment">Payment</TabsTrigger>}
                                {plot.status === 'sold' && <TabsTrigger value="sale">Sale</TabsTrigger>}
                                <TabsTrigger value="history">History</TabsTrigger>
                            </TabsList>

                            {/* Overview Tab */}
                            <TabsContent value="overview" className="space-y-4 p-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Basic Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Project</p>
                                                <p className="font-medium">{plot.projectName}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Block</p>
                                                <p className="font-medium">{plot.block}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Plot Number</p>
                                                <p className="font-medium">{plot.plotNumber}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Status</p>
                                                <Badge variant="outline" className={cn(statusInfo?.color)}>
                                                    {statusInfo?.label}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {plot.status !== 'available' && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base">Current Owner</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Buyer Name</p>
                                                    <p className="font-medium">{plot.buyerName || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </TabsContent>

                            {/* Specifications Tab */}
                            <TabsContent value="specs" className="space-y-4 p-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Plot Specifications</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Size (Gaj)</p>
                                                <p className="font-medium">{plot.area || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Dimension</p>
                                                <p className="font-medium">{plot.dimension || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Type</p>
                                                <p className="font-medium">{plot.type || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Plot Number</p>
                                                <p className="font-medium">#{plot.plotNumber}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Pricing Tab */}
                            <TabsContent value="pricing" className="space-y-4 p-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <DollarSign className="h-4 w-4" />
                                            Pricing Breakdown
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {plot.status === 'booked' && plot.totalPlotAmount && (
                                            <>
                                                <div className="flex justify-between pb-2 border-b">
                                                    <span className="text-sm text-muted-foreground">Total Plot Amount</span>
                                                    <span className="font-semibold">₹{plot.totalPlotAmount.toLocaleString('en-IN')}</span>
                                                </div>
                                                <div className="flex justify-between pb-2 border-b">
                                                    <span className="text-sm text-muted-foreground">Booking Amount</span>
                                                    <span className="font-semibold">₹{plot.bookingAmount?.toLocaleString('en-IN') || 0}</span>
                                                </div>
                                            </>
                                        )}
                                        {plot.status === 'sold' && (
                                            <>
                                                <div className="flex justify-between pb-2 border-b">
                                                    <span className="text-sm text-muted-foreground">Sale Price</span>
                                                    <span className="font-semibold">₹{plot.salePrice?.toLocaleString('en-IN') || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between pb-2 border-b">
                                                    <span className="text-sm text-muted-foreground">Sold Amount</span>
                                                    <span className="font-semibold">₹{plot.soldAmount?.toLocaleString('en-IN') || 'N/A'}</span>
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Booking Tab */}
                            {plot.status === 'booked' && (
                                <TabsContent value="booking" className="space-y-4 p-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Briefcase className="h-4 w-4" />
                                                Booking Details
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Buyer Name</p>
                                                <p className="font-medium">{plot.buyerName || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Booking Amount</p>
                                                <p className="font-medium text-lg">₹{plot.bookingAmount?.toLocaleString('en-IN') || 0}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Tenure (Months)</p>
                                                <p className="font-medium">{plot.tenureMonths || 'N/A'} months</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Associate/Broker</p>
                                                <p className="font-medium">{plot.brokerName || 'N/A'}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            )}

                            {/* Payment Tab */}
                            {plot.status === 'booked' && (
                                <TabsContent value="payment" className="space-y-4 p-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <CreditCard className="h-4 w-4" />
                                                Payment Tracking
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
                                                <p className="text-xs text-muted-foreground mb-1">Payment Progress</p>
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-2xl font-bold">{plot.paidPercentage || 0}%</p>
                                                    <Badge variant="outline">{plot.paidPercentage || 0}% Paid</Badge>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div 
                                                        className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all" 
                                                        style={{width: `${plot.paidPercentage || 0}%`}}
                                                    ></div>
                                                </div>
                                            </div>

                                            <Separator />

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                                                    <p className="font-semibold">₹{plot.totalPlotAmount?.toLocaleString('en-IN') || 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Received</p>
                                                    <p className="font-semibold text-green-600">₹{paidAmount.toLocaleString('en-IN')}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Balance</p>
                                                    <p className="font-semibold text-orange-600">₹{remainingAmount.toLocaleString('en-IN')}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Commission Status</p>
                                                    <Badge variant="outline" className={plot.commissionStatus === 'pending' ? 'bg-yellow-50' : 'bg-green-50'}>
                                                        {plot.commissionStatus || 'N/A'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            )}

                            {/* Sale Tab */}
                            {plot.status === 'sold' && (
                                <TabsContent value="sale" className="space-y-4 p-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <FileText className="h-4 w-4" />
                                                Sale Details
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Sale Price</p>
                                                <p className="font-medium">₹{plot.salePrice?.toLocaleString('en-IN') || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Sold Amount</p>
                                                <p className="font-medium">₹{plot.soldAmount?.toLocaleString('en-IN') || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Buyer Name</p>
                                                <p className="font-medium">{plot.buyerName || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Seller</p>
                                                <p className="font-medium">{plot.sellerName || 'N/A'}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            )}

                            {/* History Tab */}
                            <TabsContent value="history" className="space-y-4 p-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <History className="h-4 w-4" />
                                            Audit & History Log
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <div className="flex gap-3">
                                                <Clock className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Created</p>
                                                    <p className="text-sm font-medium">{plot.createdAt ? format(new Date(plot.createdAt), 'MMM dd, yyyy HH:mm') : 'N/A'}</p>
                                                </div>
                                            </div>
                                            <Separator />
                                            <div className="flex gap-3">
                                                <TrendingUp className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Last Updated</p>
                                                    <p className="text-sm font-medium">{plot.updatedAt ? format(new Date(plot.updatedAt), 'MMM dd, yyyy HH:mm') : 'N/A'}</p>
                                                </div>
                                            </div>
                                            <Separator />
                                            <div className="flex gap-3">
                                                <AlertCircle className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Current Status</p>
                                                    <p className="text-sm font-medium capitalize">{plot.status}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-4 italic">Full edit history tracking coming soon...</p>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Sticky Action Bar */}
                    <div className="sticky bottom-0 z-10 border-t bg-background p-6 space-y-3">
                        <div className="flex gap-2 flex-wrap">
                            {plot.status === 'available' && (
                                <>
                                    <Button 
                                        size="sm" 
                                        variant="default"
                                        onClick={() => onEdit?.(plot)}
                                    >
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Edit
                                    </Button>
                                </>
                            )}

                            {plot.status === 'booked' && (plot.paidPercentage === null || plot.paidPercentage === undefined || plot.paidPercentage < 50) && (
                                <>
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => setShowCancelConfirm(true)}
                                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Cancel Booking
                                    </Button>
                                </>
                            )}

                            {plot.status === 'booked' && (
                                <>
                                    <Button 
                                        size="sm" 
                                        variant="default"
                                        onClick={() => onAddPayment?.(plot)}
                                    >
                                        <CreditCard className="h-4 w-4 mr-2" />
                                        Add Payment
                                    </Button>
                                    {(plot.paidPercentage !== null && plot.paidPercentage !== undefined && plot.paidPercentage >= 50) && (
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => onConvertToSold?.(plot)}
                                        >
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            Mark as Sold
                                        </Button>
                                    )}
                                </>
                            )}

                            {plot.status === 'available' && (
                                <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                </Button>
                            )}
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

            {/* Delete Confirmation */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Plot</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete Plot #{plot.plotNumber}? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => {
                                onDelete?.(plot.id);
                                setShowDeleteConfirm(false);
                                onClose();
                            }}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Cancel Confirmation */}
            <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel the booking for Plot #{plot.plotNumber}? This will reset it to available status and clear all booking data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => {
                                onCancel?.(plot.id);
                                setShowCancelConfirm(false);
                                onClose();
                            }}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            Yes, Cancel Booking
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
