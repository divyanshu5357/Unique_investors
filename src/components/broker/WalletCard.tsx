
"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet as WalletIcon, ArrowDown, ArrowUp, Banknote } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import type { Wallet } from '@/lib/schema';
import Link from 'next/link';

interface WalletCardProps {
    wallet: Wallet | null;
}

const formatCurrency = (amount: number = 0) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

export function WalletCard({ wallet }: WalletCardProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <Card>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                            <WalletIcon className="h-8 w-8 text-primary" />
                            <div>
                                <h2 className="text-lg font-semibold">Total Earnings</h2>
                                <p className="text-2xl font-bold">{formatCurrency(wallet?.totalBalance)}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm">
                            {isOpen ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                            <span className="sr-only">Toggle details</span>
                        </Button>
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="border-t p-6 grid gap-6 md:grid-cols-2">
                        {/* Direct Sale Wallet */}
                        <Card className="bg-green-500/10 border-green-500">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between text-lg">
                                    <span>Direct Sale Wallet</span>
                                    <Banknote className="h-6 w-6 text-green-700" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold text-green-900">{formatCurrency(wallet?.directSaleBalance)}</p>
                                <Link href="/broker/wallets?type=direct">
                                     <Button variant="link" className="px-0 h-auto text-green-800">View History</Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* Downline Sale Wallet */}
                        <Card className="bg-blue-500/10 border-blue-500">
                             <CardHeader>
                                <CardTitle className="flex items-center justify-between text-lg">
                                    <span>Downline Sale Wallet</span>
                                    <Banknote className="h-6 w-6 text-blue-700" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold text-blue-900">{formatCurrency(wallet?.downlineSaleBalance)}</p>
                                <Link href="/broker/wallets?type=downline">
                                     <Button variant="link" className="px-0 h-auto text-blue-800">View History</Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
