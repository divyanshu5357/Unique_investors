"use client";

import React, { useEffect, useState } from 'react';
import { getPlotHistory, getBrokerHistory } from '@/lib/actions';
import { PlotHistoryRecord, BrokerHistoryRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const formatDate = (d: string) => new Date(d).toLocaleString('en-IN');

export default function HistoryPage() {
  const [plotHistory, setPlotHistory] = useState<PlotHistoryRecord[]>([]);
  const [brokerHistory, setBrokerHistory] = useState<BrokerHistoryRecord[]>([]);
  const [loadingPlots, setLoadingPlots] = useState(true);
  const [loadingBrokers, setLoadingBrokers] = useState(true);
  const [plotFilter, setPlotFilter] = useState('');
  const [plotAction, setPlotAction] = useState('');
  const [brokerFilter, setBrokerFilter] = useState('');
  const [brokerAction, setBrokerAction] = useState('');

  useEffect(() => {
    const loadPlotHistory = async () => {
      setLoadingPlots(true);
      try {
        const data = await getPlotHistory({ limit: 200, action: plotAction || undefined });
        setPlotHistory(data);
      } catch (e) {
        console.error('Failed to load plot history', e);
      } finally {
        setLoadingPlots(false);
      }
    };
    loadPlotHistory();
  }, [plotAction]);

  useEffect(() => {
    const loadBrokerHistory = async () => {
      setLoadingBrokers(true);
      try {
        const data = await getBrokerHistory({ limit: 200, action: brokerAction || undefined });
        setBrokerHistory(data);
      } catch (e) {
        console.error('Failed to load broker history', e);
      } finally {
        setLoadingBrokers(false);
      }
    };
    loadBrokerHistory();
  }, [brokerAction]);

  const filteredPlotHistory = plotHistory.filter(h =>
    (!plotFilter || h.plot_id.includes(plotFilter))
  );
  const filteredBrokerHistory = brokerHistory.filter(h =>
    (!brokerFilter || h.broker_id.includes(brokerFilter))
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">History / Audit Center</h1>
      <p className="text-muted-foreground text-sm">View immutable audit trails for plot lifecycle events and broker onboarding/deletions.</p>

      <Tabs defaultValue="plots" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="plots">Plot History</TabsTrigger>
          <TabsTrigger value="brokers">Broker History</TabsTrigger>
        </TabsList>

        <TabsContent value="plots" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">Plot History
                <span className="text-xs font-normal text-muted-foreground">Latest 200 events</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4 flex-wrap">
                <Input placeholder="Filter by Plot ID" value={plotFilter} onChange={e => setPlotFilter(e.target.value)} className="w-60" />
                <Select value={plotAction} onValueChange={setPlotAction}>
                  <option value="">All Actions</option>
                  <option value="created">Created</option>
                  <option value="updated">Updated</option>
                  <option value="status_change">Status Change</option>
                  <option value="booked">Booked</option>
                  <option value="sold">Sold</option>
                  <option value="canceled">Canceled</option>
                  <option value="deleted">Deleted</option>
                </Select>
              </div>
              {loadingPlots ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <div className="overflow-x-auto max-h-[520px] border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="text-left p-2">Time</th>
                        <th className="text-left p-2">Plot ID</th>
                        <th className="text-left p-2">Action</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Changed By</th>
                        <th className="text-left p-2">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPlotHistory.map(ev => {
                        // Pretty print details with better wrapping & overpayment formatting
                        let detailNodes: React.ReactNode = '—';
                        const formatNumeric = (field: string, value: any, isNew = true) => {
                          // Normalize numeric display, capping percentages and handling negatives
                          if (value == null || value === '') return '∅';
                          const num = Number(value);
                          if (isNaN(num)) return String(value);
                          if (field === 'paid_percentage') {
                            if (num > 100) return `100% (Overpaid by ${num - 100}%)`;
                            if (num < 0) return `0% (Invalid: ${num})`;
                            return `${num}%`;
                          }
                          if (field === 'remaining_amount') {
                            if (num < 0) return `0 (Overpaid by ${Math.abs(num)})`;
                            return num.toString();
                          }
                          return num.toString();
                        };
                        if (ev.details) {
                          try {
                            const raw = typeof ev.details === 'string' ? JSON.parse(ev.details) : ev.details;
                            const changed = raw.changed_fields;
                            if (changed && typeof changed === 'object') {
                              const entries = Object.entries(changed).filter(([_, v]) => v !== null && v !== undefined);
                              if (entries.length > 0) {
                                detailNodes = (
                                  <div className="space-y-1">
                                    {entries.map(([field, value]) => {
                                      const label = field.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
                                      let content: React.ReactNode;
                                      if (value && typeof value === 'object' && 'old' in (value as any) && 'new' in (value as any)) {
                                        const oldVal = (value as any).old;
                                        const newVal = (value as any).new;
                                        const oldDisplay = typeof oldVal === 'number' ? formatNumeric(field, oldVal, false) : (String(oldVal) || '∅');
                                        const newDisplay = typeof newVal === 'number' ? formatNumeric(field, newVal, true) : (String(newVal));
                                        content = (
                                          <span className="whitespace-normal break-words">
                                            <span className="text-muted-foreground">{oldDisplay}</span>
                                            <span className="px-1">→</span>
                                            <span className="font-medium">{newDisplay}</span>
                                          </span>
                                        );
                                      } else {
                                        const valDisplay = typeof value === 'number' ? formatNumeric(field, value, true) : String(value);
                                        content = <span className="font-medium whitespace-normal break-words">{valDisplay}</span>;
                                      }
                                      return (
                                        <div key={field} className="flex gap-2 text-xs items-start">
                                          <span className="min-w-[110px] text-muted-foreground">{label}:</span>
                                          <span className="whitespace-normal break-words">{content}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              } else {
                                detailNodes = <span className="text-xs text-muted-foreground">No field changes</span>;
                              }
                            } else {
                              // Fallback: show raw object keys
                              const entries = Object.entries(raw).filter(([k]) => k !== 'changed_fields');
                              detailNodes = (
                                <div className="space-y-1 text-xs">
                                  {entries.map(([k,v]) => (
                                    <div key={k} className="flex gap-2 items-start">
                                      <span className="text-muted-foreground">{k}:</span>
                                      <span className="font-medium whitespace-normal break-words">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                          } catch (e) {
                            detailNodes = <span className="text-xs text-red-600">Bad JSON</span>;
                          }
                        }
                        return (
                          <tr key={ev.id} className="border-t align-top">
                            <td className="p-2 whitespace-nowrap">{formatDate(ev.created_at)}</td>
                            <td className="p-2 font-mono text-xs">{ev.plot_id}</td>
                            <td className="p-2"><Badge>{ev.action}</Badge></td>
                            <td className="p-2">{ev.old_status || '–'} → {ev.new_status || '–'}</td>
                            <td className="p-2 text-xs font-mono">{ev.changed_by || 'system'}</td>
                            <td className="p-2 max-w-[340px]">{detailNodes}</td>
                          </tr>
                        );
                      })}
                      {filteredPlotHistory.length === 0 && (
                        <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No events found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brokers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">Broker History
                <span className="text-xs font-normal text-muted-foreground">Latest 200 events</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4 flex-wrap">
                <Input placeholder="Filter by Broker ID" value={brokerFilter} onChange={e => setBrokerFilter(e.target.value)} className="w-60" />
                <Select value={brokerAction} onValueChange={setBrokerAction}>
                  <option value="">All Actions</option>
                  <option value="created">Created</option>
                  <option value="updated">Updated</option>
                  <option value="soft_deleted">Soft Deleted</option>
                  <option value="restored">Restored</option>
                </Select>
              </div>
              {loadingBrokers ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <div className="overflow-x-auto max-h-[520px] border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="text-left p-2">Time</th>
                        <th className="text-left p-2">Broker ID</th>
                        <th className="text-left p-2">Action</th>
                        <th className="text-left p-2">Actor</th>
                        <th className="text-left p-2">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBrokerHistory.map(ev => {
                        let detailNodes: React.ReactNode = '—';
                        if (ev.details) {
                          try {
                            const raw = typeof ev.details === 'string' ? JSON.parse(ev.details) : ev.details;
                            const entries = Object.entries(raw);
                            detailNodes = (
                              <div className="space-y-1 text-xs">
                                {entries.map(([k,v]) => (
                                  <div key={k} className="flex gap-2">
                                    <span className="text-muted-foreground min-w-[100px]">{k.replace(/_/g,' ')}</span>
                                    <span className="truncate font-medium">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          } catch (e) {
                            detailNodes = <span className="text-xs text-red-600">Bad JSON</span>;
                          }
                        }
                        return (
                          <tr key={ev.id} className="border-t align-top">
                            <td className="p-2 whitespace-nowrap">{formatDate(ev.occurred_at)}</td>
                            <td className="p-2 font-mono text-xs">{ev.broker_id}</td>
                            <td className="p-2"><Badge>{ev.action}</Badge></td>
                            <td className="p-2 text-xs font-mono">{ev.actor_id || 'self'}</td>
                            <td className="p-2 max-w-[340px]">{detailNodes}</td>
                          </tr>
                        );
                      })}
                      {filteredBrokerHistory.length === 0 && (
                        <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No events found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
