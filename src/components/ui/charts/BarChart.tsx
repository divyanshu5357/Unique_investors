import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { cn } from '@/lib/utils';

interface BarChartProps {
  data: Array<{ [key: string]: any }>;
  xField: string;
  yField: string;
  height?: number;
  tooltipTitle?: string;
  className?: string;
}

export function BarChart({ 
  data, 
  xField, 
  yField, 
  height = 300, 
  tooltipTitle = '', 
  className 
}: BarChartProps) {
  // Memoize data formatting to prevent unnecessary recalculations
  const formattedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      [yField]: typeof item[yField] === 'string' ? parseFloat(item[yField]) : item[yField]
    }));
  }, [data, yField]);

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer>
        <RechartsBarChart
          data={formattedData}
          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false}
            stroke="rgb(var(--muted-foreground) / 0.2)"
          />
          <XAxis
            dataKey={xField}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: 'rgb(var(--muted-foreground) / 0.2)' }}
            stroke="rgb(var(--muted-foreground))"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: 'rgb(var(--muted-foreground) / 0.2)' }}
            stroke="rgb(var(--muted-foreground))"
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow)',
            }}
            labelStyle={{
              color: 'hsl(var(--popover-foreground))',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '4px',
            }}
            itemStyle={{
              color: 'hsl(var(--popover-foreground))',
              fontSize: '13px',
            }}
          />
          <Bar
            dataKey={yField}
            name={tooltipTitle}
            fill="hsl(var(--primary) / 0.2)"
            stroke="hsl(var(--primary))"
            strokeWidth={1}
            radius={[4, 4, 0, 0]}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}