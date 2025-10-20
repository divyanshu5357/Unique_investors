

"use client";

import React, { useState, useEffect } from 'react';
import { Plot } from '@/lib/schema';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { getPublicPlots } from '@/lib/publicActions';
import { PlotExplorer } from '@/components/investor/PlotExplorer';
import { Loader2 } from 'lucide-react';


export default function PlotAvailabilityPage() {
    const [plots, setPlots] = useState<Plot[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    
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


    return (
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-40 w-full border-b bg-background">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
              <Link href="/">
                <Logo />
              </Link>
              <Button asChild variant="outline">
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </header>
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="container mx-auto space-y-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold font-headline">Plot Availability</h1>
                         <p className="text-muted-foreground mt-2">Explore our projects and see what's available in real-time.</p>
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
                        <PlotExplorer allPlots={plots} />
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
