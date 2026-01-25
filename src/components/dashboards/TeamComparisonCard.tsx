import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TeamComparisonCardProps {
  myMetric: number;
  teamAverage: number;
  label: string;
  unit?: string;
  lowerIsBetter?: boolean;
  icon?: React.ElementType;
}

export const TeamComparisonCard: React.FC<TeamComparisonCardProps> = ({
  myMetric,
  teamAverage,
  label,
  unit = '',
  lowerIsBetter = false,
  icon: Icon
}) => {
  const difference = myMetric - teamAverage;
  const percentDiff = teamAverage !== 0 ? Math.abs((difference / teamAverage) * 100) : 0;
  
  // Se lowerIsBetter (tempo de resposta), inverter lógica
  const isAboveAverage = lowerIsBetter ? difference < 0 : difference > 0;
  const isEqual = Math.abs(difference) < 0.1;

  const getStatusColor = () => {
    if (isEqual) return 'text-gray-600';
    return isAboveAverage ? 'text-green-600' : 'text-orange-600';
  };

  const getStatusBg = () => {
    if (isEqual) return 'bg-gray-100';
    return isAboveAverage ? 'bg-green-50' : 'bg-orange-50';
  };

  const getStatusBorder = () => {
    if (isEqual) return 'border-gray-200';
    return isAboveAverage ? 'border-green-200' : 'border-orange-200';
  };

  const getStatusIcon = () => {
    if (isEqual) return <Minus className="h-5 w-5" />;
    return isAboveAverage ? 
      <TrendingUp className="h-5 w-5" /> : 
      <TrendingDown className="h-5 w-5" />;
  };

  const getStatusText = () => {
    if (isEqual) return 'Na média';
    return isAboveAverage ? 'Acima da média' : 'Abaixo da média';
  };

  return (
    <div className={`bg-white rounded-lg border-2 p-6 ${getStatusBorder()}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-600">{label}</h3>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold text-gray-900">
              {myMetric.toFixed(1)}{unit}
            </span>
            {Icon && <Icon className="h-6 w-6 text-gray-400" />}
          </div>
        </div>
        <div className={`p-3 rounded-full ${getStatusBg()}`}>
          <div className={getStatusColor()}>
            {getStatusIcon()}
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-lg ${getStatusBg()}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Média da equipe</p>
            <p className="text-xl font-semibold text-gray-900">
              {teamAverage.toFixed(1)}{unit}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </p>
            {!isEqual && (
              <p className={`text-lg font-bold ${getStatusColor()}`}>
                {difference > 0 ? '+' : ''}{difference.toFixed(1)}{unit}
                <span className="text-sm ml-1">({percentDiff.toFixed(0)}%)</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
