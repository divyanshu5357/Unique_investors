"use client"

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Filter } from 'lucide-react';
import { Plot } from '@/lib/schema';

export interface PlotFilterOptions {
    projectName?: string;
    block?: string;
    status?: string;
    minPrice?: number;
    maxPrice?: number;
    minSize?: number;
    maxSize?: number;
    searchText?: string;
}

interface PlotFilterProps {
    plots: Plot[];
    onFilter: (filtered: Plot[]) => void;
    onFilterChange?: (filters: PlotFilterOptions) => void;
}

export function PlotFilter({ plots, onFilter, onFilterChange }: PlotFilterProps) {
    const [filters, setFilters] = useState<PlotFilterOptions>({});
    const [isOpen, setIsOpen] = useState(false);

    // Get unique values for filters
    const projects = Array.from(new Set(plots.map(p => p.projectName).filter(Boolean)));
    const blocks = Array.from(new Set(plots.map(p => p.block).filter(Boolean)));
    const statuses = ['available', 'booked', 'sold', 'cancelled'];

    const applyFilters = (newFilters: PlotFilterOptions) => {
        let filtered = plots;

        if (newFilters.projectName) {
            filtered = filtered.filter(p => p.projectName === newFilters.projectName);
        }

        if (newFilters.block) {
            filtered = filtered.filter(p => p.block === newFilters.block);
        }

        if (newFilters.status) {
            filtered = filtered.filter(p => p.status === newFilters.status);
        }

        if (newFilters.minPrice !== undefined) {
            filtered = filtered.filter(p => {
                const price = p.totalPlotAmount || p.salePrice || 0;
                return price >= newFilters.minPrice!;
            });
        }

        if (newFilters.maxPrice !== undefined) {
            filtered = filtered.filter(p => {
                const price = p.totalPlotAmount || p.salePrice || 0;
                return price <= newFilters.maxPrice!;
            });
        }

        if (newFilters.minSize !== undefined) {
            filtered = filtered.filter(p => (p.area || 0) >= newFilters.minSize!);
        }

        if (newFilters.maxSize !== undefined) {
            filtered = filtered.filter(p => (p.area || 0) <= newFilters.maxSize!);
        }

        if (newFilters.searchText) {
            const searchLower = newFilters.searchText.toLowerCase();
            filtered = filtered.filter(p =>
                p.plotNumber?.toString().toLowerCase().includes(searchLower) ||
                p.buyerName?.toLowerCase().includes(searchLower) ||
                p.projectName?.toLowerCase().includes(searchLower) ||
                p.block?.toLowerCase().includes(searchLower)
            );
        }

        onFilter(filtered);
        onFilterChange?.(newFilters);
    };

    const handleFilterChange = (key: keyof PlotFilterOptions, value: any) => {
        const newFilters = { ...filters, [key]: value || undefined };
        setFilters(newFilters);
        applyFilters(newFilters);
    };

    const clearFilters = () => {
        setFilters({});
        onFilter(plots);
        onFilterChange?.({});
    };

    const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== '').length;

    return (
        <div className="space-y-4">
            {/* Filter Toggle */}
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsOpen(!isOpen)}
                    className="gap-2"
                >
                    <Filter className="h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-2">
                            {activeFilterCount}
                        </Badge>
                    )}
                </Button>
                {activeFilterCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="gap-1"
                    >
                        <X className="h-4 w-4" />
                        Clear All
                    </Button>
                )}
            </div>

            {/* Filter Panel */}
            {isOpen && (
                <Card className="p-4 space-y-4">
                    {/* Search */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">
                            Search (Plot, Buyer, Project, Block)
                        </label>
                        <Input
                            placeholder="Search plots..."
                            value={filters.searchText || ''}
                            onChange={(e) => handleFilterChange('searchText', e.target.value)}
                        />
                    </div>

                    {/* Project Filter */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">Project</label>
                        <Select
                            value={filters.projectName || ''}
                            onValueChange={(value) => handleFilterChange('projectName', value || undefined)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Projects" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All Projects</SelectItem>
                                {projects.map(project => (
                                    <SelectItem key={project} value={project}>
                                        {project}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Block Filter */}
                    {filters.projectName && (
                        <div>
                            <label className="text-sm font-medium mb-2 block">Block</label>
                            <Select
                                value={filters.block || ''}
                                onValueChange={(value) => handleFilterChange('block', value || undefined)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Blocks" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All Blocks</SelectItem>
                                    {blocks
                                        .filter(b => plots.some(p => p.block === b && p.projectName === filters.projectName))
                                        .map(block => (
                                            <SelectItem key={block} value={block}>
                                                {block}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Status Filter */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">Status</label>
                        <Select
                            value={filters.status || ''}
                            onValueChange={(value) => handleFilterChange('status', value || undefined)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All Statuses</SelectItem>
                                {statuses.map(status => (
                                    <SelectItem key={status} value={status}>
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Price Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Min Price (₹)</label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={filters.minPrice || ''}
                                onChange={(e) => handleFilterChange('minPrice', e.target.value ? Number(e.target.value) : undefined)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Max Price (₹)</label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={filters.maxPrice || ''}
                                onChange={(e) => handleFilterChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
                            />
                        </div>
                    </div>

                    {/* Size Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Min Size (Gaj)</label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={filters.minSize || ''}
                                onChange={(e) => handleFilterChange('minSize', e.target.value ? Number(e.target.value) : undefined)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Max Size (Gaj)</label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={filters.maxSize || ''}
                                onChange={(e) => handleFilterChange('maxSize', e.target.value ? Number(e.target.value) : undefined)}
                            />
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
