/**
 * Dashboard Chart Component
 * Reusable component for rendering sales and commission analytics charts
 */

'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { MonthlyData } from '@/lib/schema';

interface DashboardChartProps {
    data: MonthlyData[];
    height?: number;
}

export function DashboardChart({ data, height = 400 }: DashboardChartProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatChartCurrency = (value: number) => {
        if (value >= 10000000) {
            return `₹${(value / 10000000).toFixed(1)}Cr`;
        } else if (value >= 100000) {
            return `₹${(value / 100000).toFixed(1)}L`;
        } else if (value >= 1000) {
            return `₹${(value / 1000).toFixed(1)}K`;
        }
        return `₹${value}`;
    };

    const customTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                    <p className="font-semibold text-foreground mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ color: entry.color }} className="text-sm">
                            {entry.name}: {formatCurrency(entry.value)}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                        dataKey="monthName" 
                        fontSize={12}
                        tickMargin={5}
                        stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                        fontSize={12}
                        tickFormatter={formatChartCurrency}
                        tickMargin={5}
                        stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip content={customTooltip} />
                    <Legend />
                    <Line 
                        type="monotone" 
                        dataKey="totalSales" 
                        stroke="#2563eb" 
                        strokeWidth={3}
                        name="Total Sales"
                        dot={{ fill: '#2563eb', strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 7, stroke: '#2563eb', strokeWidth: 2 }}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="commissionPaid" 
                        stroke="#dc2626" 
                        strokeWidth={3}
                        name="Commission Paid"
                        dot={{ fill: '#dc2626', strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 7, stroke: '#dc2626', strokeWidth: 2 }}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="companyTurnover" 
                        stroke="#16a34a" 
                        strokeWidth={3}
                        name="Company Turnover"
                        dot={{ fill: '#16a34a', strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 7, stroke: '#16a34a', strokeWidth: 2 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export default DashboardChart;