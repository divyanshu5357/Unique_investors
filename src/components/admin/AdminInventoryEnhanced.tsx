"use client"

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { getPlots, addPlot, updatePlot, deletePlot, cancelBookedPlot } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle2, HelpingHand, XCircle, PlusCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Plot } from '@/lib/schema';
import { PlotForm, PlotFormValues } from '@/components/inventory/PlotForm';
import { PlotDetailDrawer } from '@/components/admin/PlotDetailDrawer';
import { PlotFilter } from '@/components/admin/PlotFilter';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

const statusConfig = {
    available: {
        label: 'Available',
        icon: <CheckCircle2 className="h-4 w-4" />,
        badgeClass: 'bg-green-100 text-green-800 border-green-300',
        gridClass: 'bg-green-500/20 border-green-500 hover:bg-green-500/40 text-green-900',
    },
    booked: {
        label: 'Booked',
        icon: <HelpingHand className="h-4 w-4" />,
        badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        gridClass: 'bg-yellow-500/20 border-yellow-500 hover:bg-yellow-500/40 text-yellow-900',
    },
    sold: {
        label: 'Sold',
        icon: <XCircle className="h-4 w-4" />,
        badgeClass: 'bg-red-100 text-red-800 border-red-300',
        gridClass: 'bg-red-500/20 border-red-500 hover:bg-red-500/40 text-red-900',
    },
    cancelled: {
        label: 'Cancelled',
        icon: <XCircle className="h-4 w-4" />,
        badgeClass: 'bg-gray-100 text-gray-800 border-gray-300',
        gridClass: 'bg-gray-500/20 border-gray-500 hover:bg-gray-500/40 text-gray-900',
    },
};

interface InventoryState {
    allPlots: Plot[];
    filteredPlots: Plot[];
    selectedProject: string;
}

export default function AdminInventoryEnhanced() {
    const [state, setState] = useState<InventoryState>({
        allPlots: [],
        filteredPlots: [],
        selectedProject: '',
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPlot, setEditingPlot] = useState<Plot | null>(null);
    const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Load plots
    useEffect(() => {
        startTransition(async () => {
            try {
                const plots = await getPlots();
                setState(prev => ({
                    ...prev,
                    allPlots: plots || [],
                    filteredPlots: plots || [],
                }));
            } catch (error) {
                console.error('Error loading plots:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load plots',
                    variant: 'destructive',
                });
            }
        });
    }, []);

    // Group plots by project
    const projectGroups = useMemo(() => {
        const grouped = new Map<string, Plot[]>();
        state.filteredPlots.forEach(plot => {
            const project = plot.projectName || 'Unknown';
            if (!grouped.has(project)) {
                grouped.set(project, []);
            }
            grouped.get(project)!.push(plot);
        });
        return grouped;
    }, [state.filteredPlots]);

    // Get unique projects
    const projects = Array.from(new Set(state.allPlots.map(p => p.projectName).filter(Boolean)));

    const handleAddPlot = async (values: PlotFormValues) => {
        setIsSubmitting(true);
        try {
            await addPlot(values);
            toast({
                title: 'Success',
                description: 'Plot added successfully',
            });
            setIsDialogOpen(false);
            
            // Refresh plots
            const plots = await getPlots();
            setState(prev => ({
                ...prev,
                allPlots: plots || [],
                filteredPlots: plots || [],
            }));
        } catch (error) {
            console.error('Error adding plot:', error);
            toast({
                title: 'Error',
                description: (error as Error).message || 'Failed to add plot',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditPlot = async (values: PlotFormValues) => {
        if (!editingPlot) return;
        setIsSubmitting(true);
        try {
            await updatePlot(editingPlot.id, values);
            toast({
                title: 'Success',
                description: 'Plot updated successfully',
            });
            setIsDialogOpen(false);
            setEditingPlot(null);
            
            // Refresh plots
            const plots = await getPlots();
            setState(prev => ({
                ...prev,
                allPlots: plots || [],
                filteredPlots: plots || [],
            }));
        } catch (error) {
            console.error('Error updating plot:', error);
            toast({
                title: 'Error',
                description: (error as Error).message || 'Failed to update plot',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeletePlot = async () => {
        if (!editingPlot) return;
        setIsSubmitting(true);
        try {
            await deletePlot(editingPlot.id);
            toast({
                title: 'Success',
                description: 'Plot deleted successfully',
            });
            setShowDeleteConfirm(false);
            setIsDrawerOpen(false);
            setEditingPlot(null);
            
            // Refresh plots
            const plots = await getPlots();
            setState(prev => ({
                ...prev,
                allPlots: plots || [],
                filteredPlots: plots || [],
            }));
        } catch (error) {
            console.error('Error deleting plot:', error);
            toast({
                title: 'Error',
                description: (error as Error).message || 'Failed to delete plot',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelBooking = async () => {
        if (!editingPlot) return;
        setIsSubmitting(true);
        try {
            const result = await cancelBookedPlot(editingPlot.id);
            if (result.success) {
                toast({
                    title: 'Success',
                    description: result.message,
                });
                setIsDrawerOpen(false);
                setEditingPlot(null);
                
                // Refresh plots
                const plots = await getPlots();
                setState(prev => ({
                    ...prev,
                    allPlots: plots || [],
                    filteredPlots: plots || [],
                }));
            } else {
                toast({
                    title: 'Error',
                    description: result.message,
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error cancelling booking:', error);
            toast({
                title: 'Error',
                description: (error as Error).message || 'Failed to cancel booking',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePlotClick = (plot: Plot) => {
        setEditingPlot(plot);
        setSelectedPlot(plot);
        setIsDrawerOpen(true);
    };

    const handleFilterChange = (filtered: Plot[]) => {
        setState(prev => ({
            ...prev,
            filteredPlots: filtered,
        }));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Inventory Management</h1>
                    <p className="text-muted-foreground mt-1">
                        Total Plots: {state.allPlots.length} | Available: {state.allPlots.filter(p => p.status === 'available').length} | Booked: {state.allPlots.filter(p => p.status === 'booked').length} | Sold: {state.allPlots.filter(p => p.status === 'sold').length}
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) setEditingPlot(null);
                }}>
                    <DialogTrigger asChild>
                        <Button onClick={() => {
                            setEditingPlot(null);
                            setIsDialogOpen(true);
                        }}>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Add New Plot
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingPlot ? 'Edit Plot' : 'Add New Plot'}</DialogTitle>
                        </DialogHeader>
                        <PlotForm
                            isOpen={isDialogOpen}
                            onClose={() => setIsDialogOpen(false)}
                            onSubmit={editingPlot ? handleEditPlot : handleAddPlot}
                            initialData={editingPlot}
                            isSubmitting={isSubmitting}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filter Component */}
            <PlotFilter 
                plots={state.allPlots} 
                onFilter={handleFilterChange}
            />

            {/* Plot Grid by Project */}
            {isPending ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : projectGroups.size === 0 ? (
                <Card className="p-12 text-center">
                    <p className="text-muted-foreground">No plots found</p>
                </Card>
            ) : (
                Array.from(projectGroups.entries()).map(([project, plots]) => (
                    <div key={project} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">{project}</h2>
                            <Badge variant="secondary">{plots.length} plots</Badge>
                        </div>

                        {/* Project Stats */}
                        <div className="grid grid-cols-4 gap-4">
                            <Card className="p-4">
                                <p className="text-xs text-muted-foreground mb-1">Available</p>
                                <p className="text-2xl font-bold text-green-600">{plots.filter(p => p.status === 'available').length}</p>
                            </Card>
                            <Card className="p-4">
                                <p className="text-xs text-muted-foreground mb-1">Booked</p>
                                <p className="text-2xl font-bold text-yellow-600">{plots.filter(p => p.status === 'booked').length}</p>
                            </Card>
                            <Card className="p-4">
                                <p className="text-xs text-muted-foreground mb-1">Sold</p>
                                <p className="text-2xl font-bold text-red-600">{plots.filter(p => p.status === 'sold').length}</p>
                            </Card>
                            <Card className="p-4">
                                <p className="text-xs text-muted-foreground mb-1">Total Value</p>
                                <p className="text-lg font-bold">₹{(plots.reduce((sum, p) => sum + (p.totalPlotAmount || p.salePrice || 0), 0) / 10000000).toFixed(1)}Cr</p>
                            </Card>
                        </div>

                        {/* Plots Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {plots.map(plot => (
                                <button
                                    key={plot.id}
                                    onClick={() => handlePlotClick(plot)}
                                    className={cn(
                                        "p-3 rounded-lg border-2 font-bold text-center cursor-pointer transition-all hover:shadow-md",
                                        statusConfig[plot.status as keyof typeof statusConfig]?.gridClass || 'bg-gray-100'
                                    )}
                                >
                                    <div className="font-bold text-lg">#{plot.plotNumber}</div>
                                    <div className="text-xs mt-1 opacity-75">
                                        {plot.area} gaj
                                    </div>
                                    {plot.status === 'booked' && (
                                        <div className="text-xs mt-1 font-semibold">
                                            {plot.paidPercentage || 0}% paid
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                ))
            )}

            {/* Plot Detail Drawer */}
            {selectedPlot && (
                <PlotDetailDrawer
                    isOpen={isDrawerOpen}
                    onClose={() => {
                        setIsDrawerOpen(false);
                        setEditingPlot(null);
                    }}
                    plot={editingPlot || selectedPlot}
                    onEdit={(plot) => {
                        setEditingPlot(plot);
                        setIsDrawerOpen(false);
                        setIsDialogOpen(true);
                    }}
                    onDelete={(plotId) => {
                        setShowDeleteConfirm(true);
                    }}
                    onCancel={() => handleCancelBooking()}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Plot</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete Plot #{editingPlot?.plotNumber}? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeletePlot}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
