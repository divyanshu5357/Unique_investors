"use client";

import React, { useState, useEffect } from 'react';
import { Plot } from '@/lib/schema';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { getPublicPlots } from '@/lib/actions';
import { PlotExplorer } from '@/components/investor/PlotExplorer';
import { Loader2 } from 'lucide-react';
import PublicHeader from '@/components/public/PublicHeader';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
// Local helpers (project doesn't export a central formatCurrency utility)
const formatCurrency = (amount?: number | null) => {
    if (amount === null || amount === undefined) return '-';
    try {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    } catch (e) {
        return `${amount}`;
    }
};

const formatDate = (iso?: string | null) => {
    if (!iso) return '-';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString();
    } catch (e) {
        return iso;
    }
};

export default function ExplorePlotsPage() {
    const [plots, setPlots] = useState<Plot[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
    
    useEffect(() => {
        const fetchPlots = async () => {
            setLoading(true);
            try {
                const fetchedPlots = await getPublicPlots();
                setPlots(fetchedPlots);
            } catch (e) {
                console.error("Failed to fetch plots on client:", e);
                setError("Could not load plot data. Please try again later.");
            } finally {
                setLoading(false);
            }
        };
        fetchPlots();
    }, []);

    const handlePlotClick = (plot: Plot) => {
        setSelectedPlot(plot);
    };

    return (

        <div className="flex flex-col min-h-screen">
            <PublicHeader />
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="container mx-auto space-y-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold font-headline">Available Properties</h1>
                        <p className="text-muted-foreground mt-2">
                            Explore our available plots and properties in real-time.
                        </p>
                    </div>
    
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : error ? (
                        <div className="text-center text-destructive-foreground bg-destructive/80 p-4 rounded-md">
                            <p>{error}</p>
                        </div>
                    ) : (
                        <PlotExplorer allPlots={plots} onPlotClick={handlePlotClick} showBuyer={false} />
                    )}
                </div>
            </main>


            {/* Legend bar for plot status colors */}
            <div className="w-full py-4 border-t border-gray-200 bg-white flex items-center justify-center gap-8">
                <div className="flex items-center gap-2">
                    <span className="inline-block w-6 h-6 rounded bg-green-200 border-2 border-green-500"></span>
                    <span className="text-green-900 font-medium">Available</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="inline-block w-6 h-6 rounded bg-yellow-100 border-2 border-yellow-500"></span>
                    <span className="text-yellow-900 font-medium">Booked</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="inline-block w-6 h-6 rounded bg-red-100 border-2 border-red-500"></span>
                    <span className="text-red-900 font-medium">Sold</span>
                </div>
            </div>

            <Footer />

            <Dialog open={!!selectedPlot} onOpenChange={() => setSelectedPlot(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Plot Details</DialogTitle>
                        <DialogDescription>
                            Detailed information about the selected plot
                        </DialogDescription>
                    </DialogHeader>
                    {selectedPlot && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Project</p>
                                    <p className="font-medium">{selectedPlot.projectName}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Plot Number</p>
                                    <p className="font-medium">{selectedPlot.plotNumber}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Type</p>
                                    <p className="font-medium">{selectedPlot.type}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Block</p>
                                    <p className="font-medium">{selectedPlot.block}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Dimension</p>
                                    <p className="font-medium">{selectedPlot.dimension}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Area</p>
                                    <p className="font-medium">{selectedPlot.area} sqft</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Status</p>
                                    <p className="font-medium capitalize">{selectedPlot.status}</p>
                                </div>
                                {selectedPlot.totalAmount && (
                                        <div>
                                            <p className="text-muted-foreground">Price</p>
                                            <p className="font-medium">{formatCurrency(selectedPlot.totalAmount)}</p>
                                        </div>
                                )}
                                    {/* Booking and sale info */}
                                    {(selectedPlot.status === 'booked' || selectedPlot.status === 'sold') && (
                                        <>
                                            <div>
                                                <p className="text-muted-foreground">Booking Date</p>
                                                <p className="font-medium">{formatDate(selectedPlot.bookingDate)}</p>
                                            </div>
                                            {selectedPlot.status === 'sold' && (
                                                <div>
                                                    <p className="text-muted-foreground">Sold Date</p>
                                                    <p className="font-medium">{formatDate(selectedPlot.saleDate)}</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}