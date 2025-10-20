
"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DownlineTree } from '@/components/dashboard/DownlineTree';
import { getMyDownlineTree } from '@/lib/actions';
import type { DownlineTreeData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function MyDownlinePage() {
    const [downlineData, setDownlineData] = useState<DownlineTreeData | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchDownline = async () => {
            setLoading(true);
            try {
                const data = await getMyDownlineTree();
                setDownlineData(data);
            } catch (error) {
                console.error("Failed to fetch downline tree:", error);
                toast({
                    title: "Error",
                    description: (error as Error).message || "Could not load your downline.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchDownline();
    }, [toast]);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">My Downline</h1>
                <p className="text-muted-foreground">This is your network of associates.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Downline Tree</CardTitle>
                    <CardDescription>Hierarchical view of your downline network.</CardDescription>
                </CardHeader>
                <CardContent className="min-h-[400px] flex items-start justify-center p-6">
                     {loading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : downlineData && downlineData.children.length > 0 ? (
                        <DownlineTree data={downlineData} />
                    ) : (
                        <p className="text-sm text-muted-foreground">You do not have a downline yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
