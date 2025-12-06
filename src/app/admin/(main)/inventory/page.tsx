
"use client";

import React, { useState, useEffect, useMemo, useTransition } from 'react';
// Firebase imports removed - now using Supabase actions
import { getPlots, canDeletePlot } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle2, HelpingHand, XCircle, Home, Loader2, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Plot, PlotSchema } from '@/lib/schema';
import { PlotForm, PlotFormValues } from '@/components/inventory/PlotForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { addPlot, updatePlot, deletePlot, removeDuplicatePlots } from '@/lib/actions';

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
};

const PlotCard = ({ plot, onEdit, onDelete, canDelete, deleteReason }: { plot: Plot; onEdit: () => void; onDelete: () => void; canDelete: boolean; deleteReason?: string }) => (
    <Dialog>
        <DialogTrigger asChild>
            <div
                className={cn(
                    "relative group flex items-center justify-center p-2 rounded-md border-2 font-bold cursor-pointer transition-colors",
                    statusConfig[plot.status].gridClass,
                    plot.status === 'sold' && 'cursor-not-allowed opacity-80'
                )}
                onClick={(e) => {
                    if (plot.status === 'sold') {
                        e.preventDefault();
                        toast({ title: 'Sold Plot', description: 'Sold plots cannot be edited.', variant: 'destructive' });
                        return;
                    }
                }}
            >
                {plot.plotNumber}
                {plot.status === 'available' && (
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                            <Pencil className="h-3 w-3" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            disabled={!canDelete}
                            title={deleteReason || 'Delete plot'}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                )}
            </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Plot #{plot.plotNumber} Details</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col space-y-3 text-sm py-4">
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline" className={cn("text-xs flex items-center gap-1", statusConfig[plot.status].badgeClass)}>
                       {statusConfig[plot.status].icon}
                       {statusConfig[plot.status].label}
                    </Badge>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Project:</span> <strong>{plot.projectName}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Block:</span> <strong>{plot.block}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Dimension:</span> <strong>{plot.dimension}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Area:</span> <strong>{plot.area} gaj</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Buyer:</span> <strong>{plot.buyerName || 'N/A'}</strong></div>
                
                {plot.status === 'sold' && (
                    <>
                        <div className="border-t pt-3 mt-3">
                            <h4 className="text-sm font-medium mb-2 text-muted-foreground">Sale Details</h4>
                            <div className="flex justify-between"><span className="text-muted-foreground">Sale Price:</span> <strong>₹{plot.salePrice?.toLocaleString('en-IN') || 'N/A'}</strong></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Sold Amount:</span> <strong>₹{plot.soldAmount?.toLocaleString('en-IN') || 'N/A'}</strong></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Seller:</span> <strong>{plot.sellerName || 'N/A'}</strong></div>
                        </div>
                        
                        <div className="border-t pt-3">
                            <h4 className="text-sm font-medium mb-2 text-muted-foreground">Commission Details</h4>
                            <div className="flex justify-between"><span className="text-muted-foreground">Associate:</span> <strong>{plot.brokerName || 'N/A'}</strong></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Commission Rate:</span> <strong>{plot.commissionRate?.toFixed(2)}%</strong></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Commission Amount:</span> <strong className="text-green-600">₹{plot.salePrice && plot.commissionRate ? ((plot.salePrice * plot.commissionRate) / 100).toLocaleString('en-IN') : 'N/A'}</strong></div>
                        </div>
                    </>
                )}
            </div>
        </DialogContent>
    </Dialog>
);

export default function PlotInventoryPage() {
    const [isPending, startTransition] = useTransition();
    const [allPlots, setAllPlots] = useState<Plot[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletableStatus, setDeletableStatus] = useState<Map<string, { canDelete: boolean; reason?: string }>>(new Map());

    const [selectedProject, setSelectedProject] = useState('');
    const [selectedType, setSelectedType] = useState('');
    // use empty string to indicate no block selected and show 'Select Block' placeholder
    const [selectedBlock, setSelectedBlock] = useState('');
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPlot, setEditingPlot] = useState<Plot | null>(null);

    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [deletingPlotId, setDeletingPlotId] = useState<string | null>(null);


    useEffect(() => {
        const fetchPlots = async () => {
            try {
                setLoading(true);
                const fetchedPlots = await getPlots();
                
                // Validate and parse plots
                const validPlots: Plot[] = [];
                fetchedPlots.forEach((plotData: any) => {
                    const parseResult = PlotSchema.safeParse(plotData);
                    if (parseResult.success) {
                        validPlots.push(parseResult.data);
                    } else {
                        console.warn(`Invalid plot data for plot ${plotData.id}:`, parseResult.error.issues);
                    }
                });
                
                setAllPlots(validPlots);
                
                // Auto-select first project if none is selected
                if (validPlots.length > 0 && !selectedProject) {
                    const projectNames = [...new Set(validPlots.map(p => p.projectName))].sort();
                    if (projectNames.length > 0) {
                        setSelectedProject(projectNames[0]);
                    }
                }
                
            } catch (error) {
                console.error("Error fetching plots: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPlots();
    }, []);

    // Check deletability status for all plots
    useEffect(() => {
        if (allPlots.length === 0) return;

        const checkDeletability = async () => {
            const statusMap = new Map<string, { canDelete: boolean; reason?: string }>();
            
            for (const plot of allPlots) {
                try {
                    const result = await canDeletePlot(plot.id);
                    statusMap.set(plot.id, result);
                } catch (error) {
                    console.error(`Error checking deletability for plot ${plot.id}:`, error);
                    statusMap.set(plot.id, { canDelete: false, reason: 'Could not verify deletion eligibility' });
                }
            }
            
            setDeletableStatus(statusMap);
        };

        checkDeletability();
    }, [allPlots]);
    
    const projectNames = useMemo(() => [...new Set(allPlots.map(p => p.projectName))].sort(), [allPlots]);
    
    const types = useMemo(() => {
        if (!selectedProject) return [];
        const availableTypes = [...new Set(allPlots.filter(p => p.projectName === selectedProject).map(p => p.type))].sort();
        // Auto-select first type if current selection is invalid
        if (availableTypes.length > 0 && !availableTypes.includes(selectedType)) {
            setSelectedType(availableTypes[0]);
        } else if (availableTypes.length === 0) {
            setSelectedType('');
        }
        return availableTypes;
    }, [allPlots, selectedProject, selectedType]);

    const blocks = useMemo(() => {
        if (!selectedProject || !selectedType) return [];
        const availableBlocks = [...new Set(allPlots.filter(p => p.projectName === selectedProject && p.type === selectedType).map(p => p.block))].sort();
        if (selectedBlock && !availableBlocks.includes(selectedBlock)) {
            setSelectedBlock('');
        }
        return availableBlocks;
    }, [allPlots, selectedProject, selectedType, selectedBlock]);

    const filteredPlots = useMemo(() => {
        return allPlots
            .filter(plot =>
                plot.projectName === selectedProject &&
                plot.type === selectedType &&
                (selectedBlock === '' || plot.block === selectedBlock)
            )
            .sort((a, b) => Number(a.plotNumber) - Number(b.plotNumber));
    }, [allPlots, selectedProject, selectedType, selectedBlock]);

    const summaryCounts = useMemo(() => {
        return filteredPlots.reduce((acc, plot) => {
            acc[plot.status] = (acc[plot.status] || 0) + 1;
            return acc;
        }, {} as Record<'available' | 'booked' | 'sold', number>);
    }, [filteredPlots]);


    const handleAddNew = () => {
        setEditingPlot(null);
        setIsFormOpen(true);
    };

    const handleEdit = (plot: Plot) => {
        if (plot.status === 'booked') {
            toast({ title: 'Booked Plot', description: 'Booked plots cannot be edited directly. Cancel the booking first to make it available, then edit.', variant: 'destructive' });
            return;
        }
        if (plot.status === 'sold') {
            toast({ title: 'Sold Plot', description: 'Sold plots cannot be edited.', variant: 'destructive' });
            return;
        }
        setEditingPlot(plot);
        setIsFormOpen(true);
    };

    const handleDelete = (plotId: string) => {
        setDeletingPlotId(plotId);
        setIsAlertOpen(true);
    }

    const confirmDelete = async () => {
        if (deletingPlotId) {
            startTransition(async () => {
                try {
                    await deletePlot(deletingPlotId);
                    toast({ title: "Plot Deleted", description: "The plot has been removed successfully." });
                } catch (error) {
                    console.error("Error deleting plot: ", error);
                    toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
                } finally {
                    setDeletingPlotId(null);
                    setIsAlertOpen(false);
                }
            });
        }
    };


    const onFormSubmit = async (values: PlotFormValues) => {
        startTransition(async () => {
             try {
                if (editingPlot) {
                    await updatePlot(editingPlot.id, values);
                    toast({ title: "Plot Updated", description: "The plot details have been saved." });
                } else {
                    await addPlot(values);
                    toast({ title: "Plot Added", description: "The new plot has been created." });
                }
                setIsFormOpen(false);
                setEditingPlot(null);
            } catch (error) {
                console.error("Form submission error:", error);
                toast({ title: "Error", description: (error as Error).message || "Something went wrong.", variant: "destructive" });
            }
        });
    }

    return (
        <div className="space-y-8">
             <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Plot Inventory</h1>
                    <p className="text-muted-foreground">Manage and view plot availability in real-time.</p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => {
                            startTransition(async () => {
                                try {
                                    const result = await removeDuplicatePlots();
                                    toast({ 
                                        title: "Duplicates Removed", 
                                        description: result.message 
                                    });
                                } catch (error) {
                                    toast({ 
                                        title: "Failed to Remove Duplicates", 
                                        description: (error as Error).message, 
                                        variant: "destructive" 
                                    });
                                }
                            });
                        }}
                        disabled={isPending}
                    >
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Remove Duplicates
                    </Button>
                    <Button onClick={handleAddNew}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Add New Plot
                    </Button>
                </div>
            </div>


            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>Select a project to view its plot inventory.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="project-name">Project Name</Label>
                            <Select value={selectedProject} onValueChange={setSelectedProject} disabled={loading}>
                                <SelectTrigger id="project-name">
                                    <SelectValue placeholder={loading ? "Loading..." : "Select Project"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {projectNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="type">Type</Label>
                            <Select value={selectedType} onValueChange={setSelectedType} disabled={!selectedProject}>
                                <SelectTrigger id="type">
                                    <SelectValue placeholder="Select Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {types.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="block">Block</Label>
                            <Select value={selectedBlock} onValueChange={setSelectedBlock} disabled={!selectedType}>
                                <SelectTrigger id="block">
                                    <SelectValue placeholder="Select Block" />
                                </SelectTrigger>
                                <SelectContent>
                                    {blocks.map(block => <SelectItem key={block} value={block}>{block}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                 <Card>
                    <CardContent className="pt-6">
                        <div className="text-center text-muted-foreground h-40 flex items-center justify-center">
                            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                            <p>Loading Inventory...</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (selectedProject && filteredPlots.length > 0) ? (
                 <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Plots</CardTitle>
                                <Home className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{filteredPlots.length}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Available</CardTitle>
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{summaryCounts.available || 0}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Booked</CardTitle>
                                <HelpingHand className="h-4 w-4 text-yellow-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{summaryCounts.booked || 0}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Sold</CardTitle>
                                <XCircle className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{summaryCounts.sold || 0}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Inventory Grid</CardTitle>
                            <CardDescription>Visual representation of the plot inventory for {selectedProject}. Click a plot to see details.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3">
                                {filteredPlots.map(plot => {
                                    const deleteStatus = deletableStatus.get(plot.id) || { canDelete: true };
                                    return (
                                        <PlotCard 
                                            key={plot.id} 
                                            plot={plot} 
                                            onEdit={() => handleEdit(plot)} 
                                            onDelete={() => {
                                                if (!deleteStatus.canDelete) {
                                                    toast({ 
                                                        title: "Cannot Delete Plot", 
                                                        description: deleteStatus.reason || 'This plot cannot be deleted.',
                                                        variant: 'destructive'
                                                    });
                                                    return;
                                                }
                                                handleDelete(plot.id);
                                            }}
                                            canDelete={deleteStatus.canDelete}
                                            deleteReason={deleteStatus.reason}
                                        />
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center text-muted-foreground h-40 flex items-center justify-center">
                            <p>{selectedProject ? "No plots found for the selected filters." : "Please select a project to view inventory."}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <PlotForm 
                isOpen={isFormOpen} 
                onClose={() => setIsFormOpen(false)}
                onSubmit={onFormSubmit}
                initialData={editingPlot}
                isSubmitting={isPending}
            />

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the plot
                        and remove its data from our servers.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} disabled={isPending}>
                        {isPending ? 'Deleting...' : 'Continue'}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


        </div>
    );
}

    