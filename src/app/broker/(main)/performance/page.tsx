'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp } from 'lucide-react';

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
  const supabase = createClient();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brokerId, setBrokerId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch broker id from session/profile
    async function fetchBrokerId() {
      const { data: { user } } = await supabase.auth.getUser();
      setBrokerId(user?.id || null);
    }
    fetchBrokerId();
  }, [supabase]);

  useEffect(() => {
    if (!brokerId) return;
    setLoading(true);
    supabase
      .from('plots')
      .select('*')
      .eq('broker_id', brokerId)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setPlots(data || []);
        setLoading(false);
      });
  }, [brokerId, supabase]);

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
                    <TableHead className="text-center">% Paid</TableHead>
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
                          <Badge variant={plot.paid_percentage >= 75 ? 'default' : 'secondary'}>
                            {plot.paid_percentage?.toFixed(1) || '0'}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={plot.status === 'sold' ? 'default' : 'outline'}>
                            {plot.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {plot.paid_percentage < 75 ? (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              Pending
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              Withdrawable
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            disabled={!canWithdraw}
                            variant={canWithdraw ? 'default' : 'secondary'}
                            onClick={() => {
                              // TODO: Implement withdrawal request
                              alert('Withdrawal request functionality coming soon!');
                            }}
                          >
                            Withdraw
                          </Button>
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
