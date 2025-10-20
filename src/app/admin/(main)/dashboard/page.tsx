
"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Users, 
    Building2, 
    Loader2, 
    TrendingUp, 
    DollarSign, 
    PieChart,
    Calendar,
    Filter,
    Download
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import CommissionCalculatorButton from '@/components/admin/CommissionCalculatorButton';
import { getDashboardAnalytics, getBrokersList } from '@/lib/actions';
import type { DashboardAnalytics, DashboardFilters } from '@/lib/schema';

interface BrokerOption {
    id: string;
    full_name: string;
    email: string;
}

export default function AdminDashboardPage() {
    const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
    const [brokers, setBrokers] = useState<BrokerOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<DashboardFilters>({});
    const [showFilters, setShowFilters] = useState(false);

    // Date inputs for filtering
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedBrokerId, setSelectedBrokerId] = useState('');

    useEffect(() => {
        fetchDashboardData();
        fetchBrokersList();
    }, []);

    const fetchDashboardData = async (appliedFilters?: DashboardFilters) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getDashboardAnalytics(appliedFilters);
            setAnalytics(data);
        } catch (err: any) {
            console.error("Error fetching dashboard analytics:", err);
            setError(err.message || "Failed to load dashboard data.");
        } finally {
            setLoading(false);
        }
    };

    const fetchBrokersList = async () => {
        try {
            const brokersList = await getBrokersList();
            setBrokers(brokersList);
        } catch (err) {
            console.error("Error fetching brokers list:", err);
        }
    };

    const applyFilters = async () => {
        const appliedFilters: DashboardFilters = {};
        
        if (startDate) appliedFilters.startDate = startDate;
        if (endDate) appliedFilters.endDate = endDate;
        if (selectedBrokerId) {
            appliedFilters.brokerId = selectedBrokerId;
            const selectedBroker = brokers.find(b => b.id === selectedBrokerId);
            if (selectedBroker) {
                appliedFilters.brokerName = selectedBroker.full_name;
            }
        }
        
        setFilters(appliedFilters);
        await fetchDashboardData(appliedFilters);
    };

    const clearFilters = async () => {
        setStartDate('');
        setEndDate('');
        setSelectedBrokerId('');
        setFilters({});
        await fetchDashboardData();
    };

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

    const renderStat = (value: number | undefined, isLoading: boolean = loading) => {
        if (isLoading) {
            return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;
        }
        return <div className="text-2xl font-bold">{value ?? 0}</div>;
    };
    
    if (error) {
        return (
            <div className="space-y-8">
                <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
                <Card className="bg-destructive/10 border-destructive">
                    <CardHeader>
                        <CardTitle>Error Loading Dashboard</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-destructive-foreground">{error}</p>
                        <p className="text-muted-foreground mt-2">Please check your network connection and try again.</p>
                        <Button 
                            onClick={() => fetchDashboardData(filters)} 
                            className="mt-4"
                            variant="outline"
                        >
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
                    <p className="text-muted-foreground">Sales analytics and commission tracking</p>
                </div>
                
                <div className="flex gap-2">
                    <CommissionCalculatorButton />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                    </Button>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Filter Dashboard Data</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="endDate">End Date</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="broker">Broker</Label>
                                <Select value={selectedBrokerId} onValueChange={setSelectedBrokerId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select broker" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {brokers.map((broker) => (
                                            <SelectItem key={broker.id} value={broker.id}>
                                                {broker.full_name} ({broker.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="flex items-end gap-2">
                                <Button onClick={applyFilters} disabled={loading}>
                                    Apply
                                </Button>
                                <Button onClick={clearFilters} variant="outline" disabled={loading}>
                                    Clear
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                            <div className="text-xl font-bold">
                                {formatCurrency(analytics?.summary.totalSales || 0)}
                            </div>
                        )}
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Commission Paid</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                            <div className="text-xl font-bold">
                                {formatCurrency(analytics?.summary.totalCommissionPaid || 0)}
                            </div>
                        )}
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Company Turnover</CardTitle>
                        <PieChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                            <div className="text-xl font-bold">
                                {formatCurrency(analytics?.summary.companyTurnover || 0)}
                            </div>
                        )}
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Plots Sold</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {renderStat(analytics?.summary.totalPlotsSold)}
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Brokers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {renderStat(analytics?.summary.activeBrokers)}
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Monthly Sales & Commission Analysis
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Track sales performance, commission distribution, and company turnover by month
                    </p>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center h-[400px]">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : analytics?.monthlyData && analytics.monthlyData.length > 0 ? (
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={analytics.monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="monthName" 
                                        fontSize={12}
                                        tickMargin={5}
                                    />
                                    <YAxis 
                                        fontSize={12}
                                        tickFormatter={formatChartCurrency}
                                        tickMargin={5}
                                    />
                                    <Tooltip 
                                        formatter={(value: number) => [formatCurrency(value), '']}
                                        labelStyle={{ color: '#000' }}
                                        contentStyle={{ 
                                            backgroundColor: 'hsl(var(--background))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Legend />
                                    <Line 
                                        type="monotone" 
                                        dataKey="totalSales" 
                                        stroke="#2563eb" 
                                        strokeWidth={2}
                                        name="Total Sales"
                                        dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="commissionPaid" 
                                        stroke="#dc2626" 
                                        strokeWidth={2}
                                        name="Commission Paid"
                                        dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="companyTurnover" 
                                        stroke="#16a34a" 
                                        strokeWidth={2}
                                        name="Company Turnover"
                                        dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                            <PieChart className="h-12 w-12 mb-4" />
                            <p className="text-lg font-medium">No data available</p>
                            <p className="text-sm">No sales data found for the selected period</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Applied Filters Info */}
            {Object.keys(filters).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Applied Filters</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {filters.startDate && (
                                <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">
                                    Start: {new Date(filters.startDate).toLocaleDateString()}
                                </div>
                            )}
                            {filters.endDate && (
                                <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">
                                    End: {new Date(filters.endDate).toLocaleDateString()}
                                </div>
                            )}
                            {filters.brokerName && (
                                <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-md text-sm">
                                    Broker: {filters.brokerName}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
