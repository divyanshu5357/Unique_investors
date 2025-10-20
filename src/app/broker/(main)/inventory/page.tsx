
"use client";

import React, { useState, useEffect, useMemo, useTransition } from 'react';
// Firebase imports removed - now using Supabase actions
import { getPlots } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle2, HelpingHand, XCircle, Home, Loader2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Plot, PlotSchema } from '@/lib/schema';
import { PlotForm, PlotFormValues } from '@/components/inventory/PlotForm';
import { toast } from '@/hooks/use-toast';
import { updatePlot } from '@/lib/actions';
import { Button } from '@/components/ui/button';

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

const PlotCard = ({ plot, onEdit }: { plot: Plot; onEdit: () => void; }) => (
    <Dialog>
        <DialogTrigger asChild>
            <div className={cn(
                "relative group flex items-center justify-center p-2 rounded-md border-2 font-bold cursor-pointer transition-colors",
                statusConfig[plot.status].gridClass
            )}>
                {plot.plotNumber}
                 <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {e.stopPropagation(); onEdit();}}><Pencil className="h-3 w-3" /></Button>
                </div>
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
            </div>
        </DialogContent>
    </Dialog>
);

export default function PlotInventoryPage() {
    const [isPending, startTransition] = useTransition();
    const [allPlots, setAllPlots] = useState<Plot[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedProject, setSelectedProject] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [selectedBlock, setSelectedBlock] = useState('All');
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPlot, setEditingPlot] = useState<Plot | null>(null);

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
        const availableBlocks = ['All', ...[...new Set(allPlots.filter(p => p.projectName === selectedProject && p.type === selectedType).map(p => p.block))].sort()];
        if (!availableBlocks.includes(selectedBlock)) {
            setSelectedBlock('All');
        }
        return availableBlocks;
    }, [allPlots, selectedProject, selectedType, selectedBlock]);

    const filteredPlots = useMemo(() => {
        return allPlots
            .filter(plot =>
                plot.projectName === selectedProject &&
                plot.type === selectedType &&
                (selectedBlock === 'All' || plot.block === selectedBlock)
            )
            .sort((a, b) => Number(a.plotNumber) - Number(b.plotNumber));
    }, [allPlots, selectedProject, selectedType, selectedBlock]);

    const summaryCounts = useMemo(() => {
        return filteredPlots.reduce((acc, plot) => {
            acc[plot.status] = (acc[plot.status] || 0) + 1;
            return acc;
        }, {} as Record<'available' | 'booked' | 'sold', number>);
    }, [filteredPlots]);

    const handleEdit = (plot: Plot) => {
        setEditingPlot(plot);
        setIsFormOpen(true);
    };

    const onFormSubmit = async (values: PlotFormValues) => {
        startTransition(async () => {
             try {
                if (editingPlot) {
                    await updatePlot(editingPlot.id, values);
                    toast({ title: "Plot Updated", description: "The plot details have been saved." });
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
                                {filteredPlots.map(plot => <PlotCard key={plot.id} plot={plot} onEdit={() => handleEdit(plot)} />)}
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
        </div>
    );
}

    