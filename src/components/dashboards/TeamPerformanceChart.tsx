import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Agent {
  name: string;
  [key: string]: any;
}

interface TeamPerformanceChartProps {
  data: Agent[];
  metric: string;
  title?: string;
  yAxisLabel?: string;
}

export const TeamPerformanceChart: React.FC<TeamPerformanceChartProps> = ({
  data,
  metric,
  title,
  yAxisLabel
}) => {
  const chartData = data.map(agent => ({
    name: agent.name.split(' ')[0], // Primeiro nome apenas
    value: typeof agent[metric] === 'number' ? Math.round(agent[metric] * 10) / 10 : 0
  })).slice(0, 10); // Limitar a 10 agentes

  return (
    <div>
      {title && <h4 className="text-sm font-medium text-gray-700 mb-4">{title}</h4>}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis
            stroke="#6b7280"
            fontSize={12}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Bar dataKey="value" fill="#3B82F6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
