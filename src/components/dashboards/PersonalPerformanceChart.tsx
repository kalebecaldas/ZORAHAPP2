import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DataPoint {
  date?: string;
  day?: string;
  [key: string]: any;
}

interface PersonalPerformanceChartProps {
  data: DataPoint[];
  metrics: string[];
  title?: string;
  height?: number;
}

const METRIC_CONFIGS: Record<string, { label: string; color: string }> = {
  conversations: { label: 'Conversas', color: '#3B82F6' },
  conversionRate: { label: 'Taxa de Conversão (%)', color: '#10B981' },
  avgResponseTime: { label: 'Tempo de Resposta (min)', color: '#F59E0B' },
  closeRate: { label: 'Taxa de Fechamento (%)', color: '#8B5CF6' }
};

export const PersonalPerformanceChart: React.FC<PersonalPerformanceChartProps> = ({
  data,
  metrics,
  title,
  height = 300
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Sem dados disponíveis para o período</p>
      </div>
    );
  }

  return (
    <div>
      {title && <h4 className="text-sm font-medium text-gray-700 mb-4">{title}</h4>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend />
          {metrics.map((metric) => {
            const config = METRIC_CONFIGS[metric] || { label: metric, color: '#3B82F6' };
            return (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                stroke={config.color}
                strokeWidth={2}
                dot={{ fill: config.color, r: 4 }}
                activeDot={{ r: 6 }}
                name={config.label}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
