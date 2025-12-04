
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
        <Card className="border-0 shadow-md overflow-hidden">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 sm:p-6 cursor-pointer bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 hover:bg-opacity-80 transition-all">
                        <div className="flex items-center gap-3 sm:gap-4 flex-1">
                            <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                                <WalletIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200">Total Earnings</h2>
                                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(wallet?.totalBalance)}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="ml-2">
                            {isOpen ? <ArrowUp className="h-4 w-4 sm:h-5 sm:w-5" /> : <ArrowDown className="h-4 w-4 sm:h-5 sm:w-5" />}
                            <span className="sr-only">Toggle details</span>
                        </Button>
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="border-t border-slate-200 dark:border-slate-800 p-3 sm:p-4 md:p-6 grid gap-3 sm:gap-4 md:gap-6 md:grid-cols-2 bg-gradient-to-b from-blue-50/30 to-white dark:from-blue-950/10 dark:to-slate-900">
                        {/* Direct Sale Wallet */}
                        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                                    <span>Direct Sale</span>
                                    <div className="p-2 bg-emerald-200 dark:bg-emerald-800 rounded-lg">
                                        <Banknote className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-700 dark:text-emerald-300" />
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl sm:text-3xl font-bold text-emerald-900 dark:text-emerald-100 mb-3">{formatCurrency(wallet?.directSaleBalance)}</p>
                                <Link href="/broker/wallets?type=direct">
                                     <Button variant="link" className="px-0 h-auto text-emerald-700 dark:text-emerald-400 font-medium text-sm hover:text-emerald-800 dark:hover:text-emerald-300">View History →</Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* Downline Sale Wallet */}
                        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 hover:shadow-lg transition-shadow">
                             <CardHeader className="pb-3">
                                <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                                    <span>Downline Sale</span>
                                    <div className="p-2 bg-blue-200 dark:bg-blue-800 rounded-lg">
                                        <Banknote className="h-5 w-5 sm:h-6 sm:w-6 text-blue-700 dark:text-blue-300" />
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-blue-100 mb-3">{formatCurrency(wallet?.downlineSaleBalance)}</p>
                                <Link href="/broker/wallets?type=downline">
                                     <Button variant="link" className="px-0 h-auto text-blue-700 dark:text-blue-400 font-medium text-sm hover:text-blue-800 dark:hover:text-blue-300">View History →</Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
