

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle2, HelpingHand, XCircle, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Plot } from '@/lib/schema';
import { Button } from '../ui/button';

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

const PlotCard = ({ plot }: { plot: Plot }) => (
    <Dialog>
        <DialogTrigger asChild>
            <div className={cn(
                "relative group flex items-center justify-center p-2 rounded-md border-2 font-bold cursor-pointer transition-colors",
                statusConfig[plot.status].gridClass
            )}>
                {plot.plotNumber}
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

export function PlotExplorer({ allPlots, onPlotClick }: { allPlots: Plot[], onPlotClick?: (plot: Plot) => void }) {
    const projectNames = useMemo(() => [...new Set(allPlots.map(p => p.projectName))].sort(), [allPlots]);
    
    const [selectedProject, setSelectedProject] = useState('');
    // use empty string to denote "no block selected" and show "Select" placeholder
    const [selectedBlock, setSelectedBlock] = useState('');

    useEffect(() => {
        if (projectNames.length > 0 && !selectedProject) {
            setSelectedProject(projectNames[0]);
        }
    }, [projectNames, selectedProject]);
    
    const blocks = useMemo(() => {
        if (!selectedProject) return [];
        const availableBlocks = [...new Set(allPlots.filter(p => p.projectName === selectedProject).map(p => p.block))].sort();
        // If currently selected block is not in available list, clear selection
        if (selectedBlock && !availableBlocks.includes(selectedBlock)) {
            setSelectedBlock('');
        }
        return availableBlocks;
    }, [allPlots, selectedProject, selectedBlock]);

    const filteredPlots = useMemo(() => {
        if (!selectedProject) return [];
        return allPlots
            .filter(plot =>
                plot.projectName === selectedProject &&
                // when selectedBlock is empty string, do not filter by block
                (selectedBlock === '' || plot.block === selectedBlock)
            )
            .sort((a, b) => Number(a.plotNumber) - Number(b.plotNumber));
    }, [allPlots, selectedProject, selectedBlock]);

    const summaryCounts = useMemo(() => {
        if (!filteredPlots) return { available: 0, booked: 0, sold: 0 };
        return filteredPlots.reduce((acc, plot) => {
            acc[plot.status] = (acc[plot.status] || 0) + 1;
            return acc;
        }, {} as Record<'available' | 'booked' | 'sold', number>);
    }, [filteredPlots]);


    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>Select a project and block to view its plot inventory.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="project-name">Project Name</Label>
                            <Select value={selectedProject} onValueChange={setSelectedProject}>
                                <SelectTrigger id="project-name">
                                    <SelectValue placeholder="--Select Project--" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projectNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="block">Block</Label>
                            <Select value={selectedBlock} onValueChange={setSelectedBlock} disabled={!selectedProject}>
                                <SelectTrigger id="block">
                                    <SelectValue placeholder="--Select Block--" />
                                </SelectTrigger>
                                <SelectContent>
                                    {blocks.map(block => <SelectItem key={block} value={block}>{block}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {selectedProject && filteredPlots.length > 0 ? (
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
                                    const isClickable = plot.status === 'booked' || plot.status === 'sold';
                                    return (
                                        <div 
                                            key={plot.id} 
                                            className={cn(
                                                "p-2 border rounded-md text-center transition-colors",
                                                statusConfig[plot.status].gridClass,
                                                isClickable ? 'cursor-pointer' : 'cursor-default opacity-90'
                                            )}
                                            onClick={() => (onPlotClick && isClickable) ? onPlotClick(plot) : undefined}
                                        >
                                            <p className="font-medium">{plot.plotNumber}</p>
                                        </div>
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
        </div>
    );
}
