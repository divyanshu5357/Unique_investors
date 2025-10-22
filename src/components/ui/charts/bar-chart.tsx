import React from 'react';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface BarChartProps {
  data: Array<{ [key: string]: any }>;
  xField: string;
  yField: string;
  height?: number;
  tooltipTitle?: string;
}

export function BarChart({ data, xField, yField, height = 300, tooltipTitle = '' }: BarChartProps) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <RechartsBarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey={xField}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: 'none',
              borderRadius: '4px',
              padding: '12px',
            }}
            labelStyle={{
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '4px',
            }}
            itemStyle={{
              color: 'white',
              fontSize: '13px',
            }}
          />
          <Bar
            dataKey={yField}
            name={tooltipTitle}
            fill="rgba(34, 197, 94, 0.5)"
            stroke="rgb(34, 197, 94)"
            strokeWidth={1}
            radius={[4, 4, 0, 0]}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}