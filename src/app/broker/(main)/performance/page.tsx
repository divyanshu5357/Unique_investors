'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Download, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { withdrawalRequestSchema } from '@/lib/schema';
import { z } from 'zod';
import { requestWithdrawal, getBrokerWallets, getBrokerAllPlots } from '@/lib/actions';
import type { Wallet } from '@/lib/schema';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

type WithdrawalFormValues = z.infer<typeof withdrawalRequestSchema>;

interface Plot {
  id: string;
  project_name: string;
  plot_number: string;
  total_plot_amount: number;
  remaining_amount: number;
  paid_percentage: number;
  status: string;
  commission_status: string;
}

export default function BrokerPerformancePage() {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<WithdrawalFormValues>({
    resolver: zodResolver(withdrawalRequestSchema),
    defaultValues: {
      amount: 0,
      note: '',
    },
  });

  useEffect(() => {
    setLoading(true);
    
    Promise.all([
      getBrokerAllPlots(),
      getBrokerWallets()
    ])
    .then(([plotsData, walletData]) => {
      setPlots(plotsData || []);
      setWallet(walletData);
      setLoading(false);
    })
    .catch((err) => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  const onWithdrawalSubmit = (values: WithdrawalFormValues) => {
    startTransition(async () => {
      try {
        await requestWithdrawal(values);
        toast({
          title: 'Success!',
          description: 'Withdrawal request submitted successfully. Admin will review your request.',
        });
        setIsWithdrawalDialogOpen(false);
        form.reset();
        // Refresh wallet data
        const walletData = await getBrokerWallets();
        setWallet(walletData);
      } catch (error) {
        toast({
          title: 'Failed to submit withdrawal request',
          description: (error as Error).message,
          variant: 'destructive',
        });
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const soldCount = plots.filter(p => p.status === 'sold').length;
  const totalPlots = plots.length;

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Performance Summary</h1>
          <p className="text-muted-foreground mt-1">
            Track your sales performance and commission status
          </p>
        </div>
        <Link href="/broker/transactions">
          <Button variant="outline" className="gap-2">
            View All Transactions
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Performance Overview
          </CardTitle>
          <CardDescription>Summary of your plot sales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            Plots Sold: {soldCount} / {totalPlots}
          </div>
        </CardContent>
      </Card>

      {/* Plots Table */}
      <Card>
        <CardHeader>
          <CardTitle>My Plots</CardTitle>
          <CardDescription>
            View payment status and commission details for each plot
          </CardDescription>
        </CardHeader>
        <CardContent>
          {plots.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No plots found. Start selling to see your performance here!</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Plot No.</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-center">Payment %</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Commission</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plots.map((plot) => {
                    const received = plot.total_plot_amount - (plot.remaining_amount || 0);
                    const canWithdraw = plot.paid_percentage >= 75 && plot.commission_status === 'paid';
                    
                    return (
                      <TableRow key={plot.id}>
                        <TableCell className="font-medium">{plot.project_name}</TableCell>
                        <TableCell>{plot.plot_number}</TableCell>
                        <TableCell className="text-right">
                          ₹{plot.total_plot_amount?.toLocaleString('en-IN') || '0'}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{received.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-center">
                          {plot.status === 'sold' ? (
                            <Badge variant="default">
                              {(plot.paid_percentage || 100).toFixed(1)}%
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              {plot.paid_percentage?.toFixed(1) || '0'}%
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={plot.status === 'sold' ? 'default' : 'outline'}>
                            {plot.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {plot.status === 'sold' ? (
                            <div className="space-y-1">
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Paid
                              </Badge>
                              <div className="text-sm font-semibold text-green-700">
                                ₹{(plot.total_plot_amount * 0.06).toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Dialog open={isWithdrawalDialogOpen} onOpenChange={(isOpen) => {
                            setIsWithdrawalDialogOpen(isOpen);
                            if (!isOpen) {
                              form.reset();
                            }
                          }}>
                            <Button
                              size="sm"
                              disabled={!canWithdraw || isPending}
                              variant={canWithdraw ? 'default' : 'secondary'}
                              onClick={() => setIsWithdrawalDialogOpen(true)}
                            >
                              <Download className="mr-1 h-3 w-3" />
                              Withdraw
                            </Button>
                            
                            <DialogContent className="sm:max-w-[425px] mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Request Withdrawal</DialogTitle>
                                <DialogDescription>
                                  Request to withdraw commission from your available balance of ₹{wallet?.totalBalance.toLocaleString('en-IN') || '0'}
                                </DialogDescription>
                              </DialogHeader>
                              <Form {...form}>
                                <form onSubmit={form.handleSubmit(onWithdrawalSubmit)} className="space-y-4">
                                  <FormField
                                    control={form.control}
                                    name="amount"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Amount (₹)</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="Enter amount"
                                            {...field}
                                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Available Balance: ₹{wallet?.totalBalance.toLocaleString('en-IN') || '0'}
                                        </p>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="note"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Note (Optional)</FormLabel>
                                        <FormControl>
                                          <Textarea
                                            placeholder="Add any notes or payment preferences..."
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                      ℹ️ Your withdrawal request will be sent to admin for approval. Once approved, the amount will be transferred to your registered account.
                                    </p>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => setIsWithdrawalDialogOpen(false)}
                                      disabled={isPending}
                                    >
                                      Cancel
                                    </Button>
                                    <Button type="submit" disabled={isPending}>
                                      {isPending ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Submitting...
                                        </>
                                      ) : (
                                        'Submit Request'
                                      )}
                                    </Button>
                                  </div>
                                </form>
                              </Form>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
