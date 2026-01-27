import React, { useEffect, useState } from 'react';
import { Target, TrendingUp, CheckCircle, Clock, MessageSquare, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/utils';

interface GoalProgress {
  id: string;
  type: string;
  target: number;
  current: number;
  percentage: number;
  achieved: boolean;
  period: string;
}

interface GoalsProgressProps {
  userId: string;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
}

const GOAL_CONFIG = {
  CONVERSATIONS: {
    label: 'Conversas Encerradas',
    icon: MessageSquare,
    color: 'blue',
    unit: ''
  },
  APPOINTMENTS: {
    label: 'Agendamentos',
    icon: CheckCircle,
    color: 'green',
    unit: ''
  },
  CONVERSION_RATE: {
    label: 'Taxa de Conversão',
    icon: TrendingUp,
    color: 'purple',
    unit: '%'
  },
  RESPONSE_TIME: {
    label: 'Tempo de Resposta',
    icon: Clock,
    color: 'orange',
    unit: 'min'
  }
};

const GoalsProgress: React.FC<GoalsProgressProps> = ({ userId, period }) => {
  const [goals, setGoals] = useState<GoalProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoals();
  }, [userId, period]);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/goals/users/${userId}/progress`, {
        params: { period }
      });
      setGoals(response.data);
    } catch (error) {
      console.error('Erro ao buscar progresso das metas:', error);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <Target className="w-12 h-12 mx-auto text-gray-400 mb-2" />
        <p className="text-gray-600 font-medium">Sem metas configuradas</p>
        <p className="text-sm text-gray-500 mt-1">
          Seu gestor pode configurar metas personalizadas para você
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {goals.map((goal) => {
        const config = GOAL_CONFIG[goal.type as keyof typeof GOAL_CONFIG];
        if (!config) return null;

        const Icon = config.icon;
        const percentage = Math.min(goal.percentage, 100);
        const isOverachieving = goal.percentage > 100;

        return (
          <div
            key={goal.id}
            className={`bg-white rounded-lg border-2 p-4 transition-all ${
              goal.achieved
                ? `border-${config.color}-500 shadow-${config.color}-100 shadow-md`
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg bg-${config.color}-50 flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 text-${config.color}-600`} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {config.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {period === 'DAILY' ? 'Hoje' : period === 'WEEKLY' ? 'Esta semana' : 'Este mês'}
                  </div>
                </div>
              </div>

              {goal.achieved && (
                <div className={`flex items-center gap-1 text-xs font-semibold text-${config.color}-600`}>
                  <CheckCircle className="w-3 h-3" />
                  Atingida!
                </div>
              )}
            </div>

            <div className="mb-2">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-2xl font-bold text-gray-900">
                  {goal.type === 'RESPONSE_TIME' ? goal.current.toFixed(1) : Math.round(goal.current)}
                  <span className="text-sm font-normal text-gray-500 ml-1">{config.unit}</span>
                </span>
                <span className="text-sm text-gray-500">
                  de {goal.type === 'RESPONSE_TIME' ? goal.target.toFixed(1) : goal.target}
                  {config.unit}
                </span>
              </div>

              {/* Barra de Progresso */}
              <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full bg-${config.color}-500 rounded-full transition-all duration-500 ${
                    isOverachieving ? 'animate-pulse' : ''
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="flex justify-between items-center mt-1">
                <span className={`text-xs font-medium ${
                  goal.achieved ? `text-${config.color}-600` : 'text-gray-600'
                }`}>
                  {percentage.toFixed(0)}% completo
                </span>

                {isOverachieving && (
                  <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +{(goal.percentage - 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GoalsProgress;
