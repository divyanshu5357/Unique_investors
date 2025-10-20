"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function BrokersPage() {
    const router = useRouter();
    
    useEffect(() => {
        // Redirect to associates page after 2 seconds
        const timer = setTimeout(() => {
            router.push('/admin/associates');
        }, 2000);
        
        return () => clearTimeout(timer);
    }, [router]);
    
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Page Moved</CardTitle>
                    <CardDescription>
                        The Brokers page has been moved to Associates
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        You will be automatically redirected in 2 seconds...
                    </p>
                    <Button 
                        onClick={() => router.push('/admin/associates')}
                        className="w-full"
                    >
                        Go to Associates Page
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
