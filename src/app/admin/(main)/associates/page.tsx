"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getBrokers, deleteBroker, getTransactions, getDownlineTreeForBroker } from "@/lib/actions";
import type { Broker } from "@/lib/types";
import { ManageWalletDialog } from "@/components/admin/ManageWalletDialog";
import { AddAssociateDialog } from "@/components/admin/AddAssociateDialog";
import { ChangePasswordDialog } from "@/components/admin/ChangePasswordDialog";
import { 
    Loader2, 
    Search, 
    Wallet, 
    Trash2, 
    Eye, 
    Users, 
    TrendingUp,
    Receipt,
    ArrowUpDown,
    UserPlus,
    Lock
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DownlineTree } from '@/components/dashboard/DownlineTree';
import type { DownlineTreeData, TransactionRecord } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formatCurrency = (amount?: number) => {
    if (typeof amount !== 'number') return '₹0.00';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

export default function AssociatesPage() {
    const [brokers, setBrokers] = useState<Broker[]>([]);
    const [filteredBrokers, setFilteredBrokers] = useState<Broker[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBroker, setSelectedBroker] = useState<Broker | null>(null);
    const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
    const [isDownlineDialogOpen, setIsDownlineDialogOpen] = useState(false);
    const [isTransactionsDialogOpen, setIsTransactionsDialogOpen] = useState(false);
    const [isAddAssociateDialogOpen, setIsAddAssociateDialogOpen] = useState(false);
    const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
    const [brokerToDelete, setBrokerToDelete] = useState<Broker | null>(null);
    const [downlineData, setDownlineData] = useState<DownlineTreeData | null>(null);
    const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
    const [loadingDownline, setLoadingDownline] = useState(false);
    const [loadingTransactions, setLoadingTransactions] = useState(false);
    const [sortField, setSortField] = useState<'name' | 'balance' | 'plots'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [isPending, startTransition] = useTransition();
    const [isRecalculating, setIsRecalculating] = useState(false);
    const { toast } = useToast();

    const handleRecalculateAllCommissions = async () => {
        setIsRecalculating(true);
        try {
            const response = await fetch('/api/recalculate-commission');
            const result = await response.json();
            
            if (result.success) {
                toast({
                    title: "Success",
                    description: result.message || "Commissions recalculated successfully",
                });
                // Wait a moment for database to commit, then refresh
                await new Promise(resolve => setTimeout(resolve, 500));
                await fetchBrokers(); // Refresh the data
            } else {
                toast({
                    title: "Error",
                    description: result.message || "Failed to recalculate commissions",
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: (error as Error).message || "Failed to recalculate commissions",
                variant: "destructive"
            });
        } finally {
            setIsRecalculating(false);
        }
    };

    const fetchBrokers = async () => {
        setLoading(true);
        try {
            const data = await getBrokers();
            setBrokers(data);
            setFilteredBrokers(data);
        } catch (error) {
            console.error("Failed to fetch brokers:", error);
            toast({
                title: "Error",
                description: (error as Error).message || "Could not load associates.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBrokers();
    }, []);

    useEffect(() => {
        const filtered = brokers.filter(broker =>
            broker.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            broker.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredBrokers(filtered);
    }, [searchTerm, brokers]);

    const handleSort = (field: 'name' | 'balance' | 'plots') => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedBrokers = [...filteredBrokers].sort((a, b) => {
        let comparison = 0;
        
        if (sortField === 'name') {
            comparison = (a.full_name || '').localeCompare(b.full_name || '');
        } else if (sortField === 'balance') {
            comparison = (a.totalBalance || 0) - (b.totalBalance || 0);
        } else if (sortField === 'plots') {
            comparison = (a.soldPlots?.length || 0) - (b.soldPlots?.length || 0);
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
    });

    const handleDelete = (broker: Broker) => {
        setBrokerToDelete(broker);
    };

    const confirmDelete = async () => {
        if (!brokerToDelete) return;
        
        startTransition(async () => {
            try {
                await deleteBroker(brokerToDelete.id);
                toast({
                    title: "Success",
                    description: `Associate ${brokerToDelete.full_name} has been deleted.`
                });
                setBrokerToDelete(null);
                fetchBrokers();
            } catch (error) {
                toast({
                    title: "Error",
                    description: (error as Error).message || "Could not delete the associate.",
                    variant: "destructive"
                });
            }
        });
    };

    const handleViewDetails = (broker: Broker) => {
        setSelectedBroker(broker);
        setIsDetailsDialogOpen(true);
    };

    const handleViewDownline = async (broker: Broker) => {
        setSelectedBroker(broker);
        setIsDownlineDialogOpen(true);
        setLoadingDownline(true);
        try {
            const data = await getDownlineTreeForBroker(broker.id);
            setDownlineData(data);
        } catch (error) {
            console.error("Failed to fetch downline:", error);
            toast({
                title: "Error",
                description: "Could not load downline data.",
                variant: "destructive"
            });
        } finally {
            setLoadingDownline(false);
        }
    };

    const handleViewTransactions = async (broker: Broker) => {
        setSelectedBroker(broker);
        setIsTransactionsDialogOpen(true);
        setLoadingTransactions(true);
        try {
            const data = await getTransactions(broker.id);
            setTransactions(data);
        } catch (error) {
            console.error("Failed to fetch transactions:", error);
            toast({
                title: "Error",
                description: "Could not load transactions.",
                variant: "destructive"
            });
        } finally {
            setLoadingTransactions(false);
        }
    };

    const handleManageWallet = (broker: Broker) => {
        setSelectedBroker(broker);
        setIsWalletDialogOpen(true);
    };

    const totalStats = {
        totalBrokers: brokers.length,
        totalBalance: brokers.reduce((sum, b) => sum + (b.totalBalance || 0), 0),
        totalPlotsSold: brokers.reduce((sum, b) => sum + (b.soldPlots?.length || 0), 0),
        totalDirectSales: brokers.reduce((sum, b) => sum + (b.directSaleBalance || 0), 0),
        totalDownlineSales: brokers.reduce((sum, b) => sum + (b.downlineSaleBalance || 0), 0),
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold font-headline">Associates Management</h1>
                    <p className="text-muted-foreground">
                        Manage your network of associates (brokers/sales team members) and their wallets
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        <strong>Note:</strong> Associates and Brokers refer to the same people - your sales team members who sell plots
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setIsAddAssociateDialogOpen(true)}
                        variant="default"
                        size="sm"
                    >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add New Associate
                    </Button>
                    <Button
                        onClick={handleRecalculateAllCommissions}
                        disabled={isRecalculating}
                        variant="outline"
                        size="sm"
                    >
                        {isRecalculating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Recalculating...
                            </>
                        ) : (
                            <>
                                <TrendingUp className="mr-2 h-4 w-4" />
                                Recalculate All Commissions
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Brokers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalStats.totalBrokers}</div>
                        <p className="text-xs text-muted-foreground">Sales team members</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalStats.totalBalance)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Plots Sold</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalStats.totalPlotsSold}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Direct Sales</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalStats.totalDirectSales)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Downline Sales</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalStats.totalDownlineSales)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>All Brokers/Associates</CardTitle>
                            <CardDescription>View and manage all brokers in your sales network</CardDescription>
                        </div>
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : sortedBrokers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {searchTerm ? "No brokers found matching your search." : "No brokers found."}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleSort('name')}
                                                className="h-8 px-2 lg:px-3"
                                            >
                                                Name
                                                <ArrowUpDown className="ml-2 h-4 w-4" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleSort('plots')}
                                                className="h-8 px-2 lg:px-3"
                                            >
                                                Plots Sold
                                                <ArrowUpDown className="ml-2 h-4 w-4" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>Direct Balance</TableHead>
                                        <TableHead>Downline Balance</TableHead>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleSort('balance')}
                                                className="h-8 px-2 lg:px-3"
                                            >
                                                Total Balance
                                                <ArrowUpDown className="ml-2 h-4 w-4" />
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedBrokers.map((broker) => (
                                        <TableRow key={broker.id}>
                                            <TableCell className="font-medium">{broker.full_name}</TableCell>
                                            <TableCell>{broker.email}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {broker.soldPlots?.length || 0}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{formatCurrency(broker.directSaleBalance)}</TableCell>
                                            <TableCell>{formatCurrency(broker.downlineSaleBalance)}</TableCell>
                                            <TableCell className="font-semibold">{formatCurrency(broker.totalBalance)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleViewDetails(broker)}
                                                        title="View Details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleManageWallet(broker)}
                                                        title="Manage Wallet"
                                                    >
                                                        <Wallet className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleViewDownline(broker)}
                                                        title="View Downline"
                                                    >
                                                        <Users className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleViewTransactions(broker)}
                                                        title="View Transactions"
                                                    >
                                                        <Receipt className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelectedBroker(broker);
                                                            setIsChangePasswordDialogOpen(true);
                                                        }}
                                                        title="Change Password"
                                                    >
                                                        <Lock className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleDelete(broker)}
                                                        title="Delete Associate"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Manage Wallet Dialog */}
            <ManageWalletDialog
                isOpen={isWalletDialogOpen}
                onClose={() => setIsWalletDialogOpen(false)}
                broker={selectedBroker}
                onTransactionSuccess={fetchBrokers}
            />

            {/* Details Dialog */}
            <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Broker Details</DialogTitle>
                        <DialogDescription>
                            Detailed information about {selectedBroker?.full_name}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedBroker && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                                    <p className="text-base font-semibold">{selectedBroker.full_name}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                                    <p className="text-base">{selectedBroker.email}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Direct Sale Balance</p>
                                    <p className="text-base font-semibold">{formatCurrency(selectedBroker.directSaleBalance)}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Downline Balance</p>
                                    <p className="text-base font-semibold">{formatCurrency(selectedBroker.downlineSaleBalance)}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Balance</p>
                                    <p className="text-base font-bold text-green-600">{formatCurrency(selectedBroker.totalBalance)}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Plots Sold</p>
                                    <p className="text-base font-semibold">{selectedBroker.soldPlots?.length || 0}</p>
                                </div>
                            </div>
                            
                            {selectedBroker.soldPlots && selectedBroker.soldPlots.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Sold Plots</h3>
                                    <div className="border rounded-lg overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Project</TableHead>
                                                    <TableHead>Plot #</TableHead>
                                                    <TableHead>Buyer</TableHead>
                                                    <TableHead>Sale Price</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedBroker.soldPlots.map((plot) => (
                                                    <TableRow key={plot.id}>
                                                        <TableCell>{plot.projectName}</TableCell>
                                                        <TableCell>{plot.plotNumber}</TableCell>
                                                        <TableCell>{plot.buyerName || 'N/A'}</TableCell>
                                                        <TableCell>{formatCurrency(plot.salePrice)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Downline Dialog */}
            <Dialog open={isDownlineDialogOpen} onOpenChange={setIsDownlineDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Downline Network</DialogTitle>
                        <DialogDescription>
                            Network tree for {selectedBroker?.full_name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="min-h-[400px] flex items-center justify-center">
                        {loadingDownline ? (
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        ) : downlineData && downlineData.children.length > 0 ? (
                            <DownlineTree data={downlineData} />
                        ) : (
                            <p className="text-sm text-muted-foreground">No downline network found.</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Transactions Dialog */}
            <Dialog open={isTransactionsDialogOpen} onOpenChange={setIsTransactionsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Transaction History</DialogTitle>
                        <DialogDescription>
                            All transactions for {selectedBroker?.full_name}
                        </DialogDescription>
                    </DialogHeader>
                    <Tabs defaultValue="all" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="direct">Direct Sales</TabsTrigger>
                            <TabsTrigger value="downline">Downline</TabsTrigger>
                        </TabsList>
                        <TabsContent value="all" className="mt-4">
                            {loadingTransactions ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : transactions.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No transactions found.</p>
                            ) : (
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Wallet</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {transactions.map((transaction) => (
                                                <TableRow key={transaction.id}>
                                                    <TableCell className="text-sm">{formatDate(transaction.date)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={transaction.type === 'credit' ? 'default' : 'destructive'}>
                                                            {transaction.type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">
                                                            {transaction.walletType}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm">{transaction.description}</TableCell>
                                                    <TableCell className={`text-right font-semibold ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </TabsContent>
                        <TabsContent value="direct" className="mt-4">
                            {loadingTransactions ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {transactions.filter(t => t.walletType === 'direct').map((transaction) => (
                                                <TableRow key={transaction.id}>
                                                    <TableCell className="text-sm">{formatDate(transaction.date)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={transaction.type === 'credit' ? 'default' : 'destructive'}>
                                                            {transaction.type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm">{transaction.description}</TableCell>
                                                    <TableCell className={`text-right font-semibold ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </TabsContent>
                        <TabsContent value="downline" className="mt-4">
                            {loadingTransactions ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {transactions.filter(t => t.walletType === 'downline').map((transaction) => (
                                                <TableRow key={transaction.id}>
                                                    <TableCell className="text-sm">{formatDate(transaction.date)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={transaction.type === 'credit' ? 'default' : 'destructive'}>
                                                            {transaction.type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm">{transaction.description}</TableCell>
                                                    <TableCell className={`text-right font-semibold ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!brokerToDelete} onOpenChange={() => setBrokerToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete {brokerToDelete?.full_name} and all associated data. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} disabled={isPending}>
                            {isPending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Add Associate Dialog */}
            <AddAssociateDialog
                isOpen={isAddAssociateDialogOpen}
                onClose={() => setIsAddAssociateDialogOpen(false)}
                onSuccess={fetchBrokers}
                brokers={brokers}
            />

            {/* Change Password Dialog */}
            <ChangePasswordDialog
                isOpen={isChangePasswordDialogOpen}
                onClose={() => {
                    setIsChangePasswordDialogOpen(false);
                    setSelectedBroker(null);
                }}
                brokerId={selectedBroker?.id || null}
                brokerName={selectedBroker?.full_name || ''}
            />
        </div>
    );
}
