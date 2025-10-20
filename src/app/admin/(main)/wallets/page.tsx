
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function WalletsPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Wallets Overview</h1>
                <p className="text-muted-foreground">View all transactions and manage withdrawals.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Coming Soon</CardTitle>
                    <CardDescription>
                        A detailed view of all transactions and withdrawal requests will be available here shortly.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p>We are currently building this section. Please check back later!</p>
                </CardContent>
            </Card>
        </div>
    );
}
