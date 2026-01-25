import React from 'react';
import { Award, TrendingUp, TrendingDown } from 'lucide-react';

interface Agent {
  name: string;
  totalConversations: number;
  closedConversations?: number;
  closedWithAppointment?: number;
  conversionRate: number;
  avgResponseTimeMinutes: number;
  closeRate?: number;
}

interface AgentRankingCardProps {
  agents: Agent[];
  highlightBest?: boolean;
  maxDisplay?: number;
}

export const AgentRankingCard: React.FC<AgentRankingCardProps> = ({
  agents,
  highlightBest = true,
  maxDisplay = 5
}) => {
  const displayAgents = agents.slice(0, maxDisplay);

  const getRankIcon = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}º`;
  };

  const getRankColor = (index: number) => {
    if (index === 0) return 'bg-yellow-100 border-yellow-300';
    if (index === 1) return 'bg-gray-100 border-gray-300';
    if (index === 2) return 'bg-orange-100 border-orange-300';
    return 'bg-white border-gray-200';
  };

  return (
    <div className="space-y-3">
      {displayAgents.map((agent, index) => (
        <div
          key={agent.name}
          className={`flex items-center justify-between p-4 border-2 rounded-lg transition-all hover:shadow-md ${getRankColor(index)}`}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white border-2 border-gray-300">
              <span className="text-2xl">{getRankIcon(index)}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{agent.name}</p>
                {highlightBest && index === 0 && (
                  <Award className="h-4 w-4 text-yellow-600" />
                )}
              </div>
              <p className="text-sm text-gray-600">
                {agent.totalConversations} conversas • {agent.avgResponseTimeMinutes}min tempo médio
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-green-600">
                {agent.conversionRate.toFixed(1)}%
              </span>
              {agent.conversionRate > 70 && (
                <TrendingUp className="h-5 w-5 text-green-600" />
              )}
              {agent.conversionRate < 30 && (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
            </div>
            <p className="text-xs text-gray-500">Taxa de conversão</p>
          </div>
        </div>
      ))}
    </div>
  );
};
