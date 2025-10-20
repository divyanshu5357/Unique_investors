
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Banknote, ArrowUpRight, ArrowDownRight, Calendar, Loader2, Receipt } from "lucide-react";
import { getBrokerWallets, getBrokerTransactions } from "@/lib/actions";
import type { Wallet } from "@/lib/schema";
import { format } from "date-fns";

interface TransactionRecord {
    id: string;
    walletId: string;
    walletType: 'direct' | 'downline';
    type: 'credit' | 'debit' | 'withdrawal';
    amount: number;
    description: string;
    paymentMode: string | null;
    transactionId: string | null;
    status: string;
    date: string;
}

export default function WalletsPage() {
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'direct' | 'downline'>('direct');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [walletData, transactionsData] = await Promise.all([
                    getBrokerWallets(),
                    getBrokerTransactions()
                ]);
                setWallet(walletData);
                setTransactions(transactionsData as TransactionRecord[]);
            } catch (error) {
                console.error('Error fetching wallet data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const formatCurrency = (amount: number = 0) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    };

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'dd MMM yyyy, hh:mm a');
        } catch {
            return dateString;
        }
    };

    const directTransactions = transactions.filter(t => t.walletType === 'direct');
    const downlineTransactions = transactions.filter(t => t.walletType === 'downline');

    const TransactionTable = ({ transactions }: { transactions: TransactionRecord[] }) => (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                No transactions found
                            </TableCell>
                        </TableRow>
                    ) : (
                        transactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{formatDate(transaction.date)}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div>
                                        <p className="font-medium">{transaction.description}</p>
                                        {transaction.transactionId && (
                                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                <Receipt className="h-3 w-3" />
                                                {transaction.transactionId}
                                            </p>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={transaction.type === 'credit' ? 'default' : 'destructive'} className="gap-1">
                                        {transaction.type === 'credit' ? (
                                            <ArrowDownRight className="h-3 w-3" />
                                        ) : (
                                            <ArrowUpRight className="h-3 w-3" />
                                        )}
                                        {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <span className={transaction.type === 'credit' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                        {transaction.type === 'credit' ? '+' : '-'} {formatCurrency(transaction.amount)}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={transaction.status === 'completed' ? 'outline' : 'secondary'}>
                                        {transaction.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">My Wallets</h1>
                <p className="text-muted-foreground">View your earnings and transaction history.</p>
            </div>

            {/* Wallet Overview Cards */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Direct Sale Wallet */}
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 dark:from-green-950 dark:to-green-900 dark:border-green-800">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between text-xl">
                            <span>Direct Sale Wallet</span>
                            <Banknote className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </CardTitle>
                        <CardDescription>Commission from your direct sales</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-green-700 dark:text-green-300">
                            {formatCurrency(wallet?.directSaleBalance)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            {directTransactions.length} transaction{directTransactions.length !== 1 ? 's' : ''}
                        </p>
                    </CardContent>
                </Card>

                {/* Downline Sale Wallet */}
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 dark:from-blue-950 dark:to-blue-900 dark:border-blue-800">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between text-xl">
                            <span>Downline Sale Wallet</span>
                            <Banknote className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </CardTitle>
                        <CardDescription>Commission from downline sales</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-blue-700 dark:text-blue-300">
                            {formatCurrency(wallet?.downlineSaleBalance)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            {downlineTransactions.length} transaction{downlineTransactions.length !== 1 ? 's' : ''}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Total Balance Card */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 dark:from-purple-950 dark:to-purple-900 dark:border-purple-800">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between text-2xl">
                        <span>Total Balance</span>
                        <Banknote className="h-10 w-10 text-purple-600 dark:text-purple-400" />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-5xl font-bold text-purple-700 dark:text-purple-300">
                        {formatCurrency(wallet?.totalBalance)}
                    </p>
                </CardContent>
            </Card>

            {/* Transaction History Tabs */}
            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>View all your wallet transactions</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'direct' | 'downline')}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="direct" className="gap-2">
                                <Banknote className="h-4 w-4" />
                                Direct Sale ({directTransactions.length})
                            </TabsTrigger>
                            <TabsTrigger value="downline" className="gap-2">
                                <Banknote className="h-4 w-4" />
                                Downline Sale ({downlineTransactions.length})
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="direct" className="mt-6">
                            <TransactionTable transactions={directTransactions} />
                        </TabsContent>
                        <TabsContent value="downline" className="mt-6">
                            <TransactionTable transactions={downlineTransactions} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
