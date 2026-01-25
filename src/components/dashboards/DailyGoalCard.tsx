import React from 'react';
import { Target, CheckCircle, TrendingUp } from 'lucide-react';

interface DailyGoalCardProps {
  current: number;
  goal: number;
  metric: string;
  icon?: React.ElementType;
  subtitle?: string;
}

export const DailyGoalCard: React.FC<DailyGoalCardProps> = ({
  current,
  goal,
  metric,
  icon: Icon = Target,
  subtitle
}) => {
  const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const isComplete = current >= goal;

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-full ${isComplete ? 'bg-green-100' : 'bg-blue-100'}`}>
            <Icon className={`h-6 w-6 ${isComplete ? 'text-green-600' : 'text-blue-600'}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Meta de {metric}</h3>
            {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
          </div>
        </div>
        {isComplete && (
          <CheckCircle className="h-8 w-8 text-green-600" />
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-end justify-between mb-2">
          <span className="text-4xl font-bold text-gray-900">{current}</span>
          <span className="text-lg text-gray-500">/ {goal}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-4 rounded-full transition-all duration-500 ${
              isComplete 
                ? 'bg-gradient-to-r from-green-500 to-green-600' 
                : 'bg-gradient-to-r from-blue-500 to-blue-600'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className={`font-medium ${isComplete ? 'text-green-600' : 'text-blue-600'}`}>
          {percentage.toFixed(0)}% concluído
        </span>
        {isComplete ? (
          <span className="text-green-600 font-medium flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            Meta atingida!
          </span>
        ) : (
          <span className="text-gray-600">
            Faltam {goal - current} {metric}
          </span>
        )}
      </div>
    </div>
  );
};
