'use client';

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

interface ChartProps {
  data: number[];
  labels: string[];
  type: 'bar';
}

export function Chart({ data, labels = [], type }: ChartProps) {
  const chartData = labels.map((label, i) => ({
    name: label,
    value: data[i]
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#0ea5e9" />
      </BarChart>
    </ResponsiveContainer>
  );
} 