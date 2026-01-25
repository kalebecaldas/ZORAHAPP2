import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Clock,
  Target,
  TrendingUp,
  Award,
  CheckCircle,
  RefreshCw,
  Zap,
  Trophy
} from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { api } from '../../lib/utils';
import { StatCard, ChartContainer, LoadingSpinner } from '../ui/DesignSystem';
import { DailyGoalCard } from './DailyGoalCard';
import { TeamComparisonCard } from './TeamComparisonCard';
import { 
  calculateEarnedBadges, 
  calculatePerformanceLevel, 
  getMotivationalMessage,
  type AgentStats 
} from '../../utils/badgeSystem';

interface User {
  id: string;
  name: string;
  role: string;
}

interface PersonalStats {
  totalConversations: number;
  closedConversations: number;
  withAppointment: number;
  conversionRate: number;
  avgResponseTimeMinutes: number;
  closeRate: number;
  activeNow: number;
}

interface Comparison {
  teamAvgResponseTime: number;
  teamAvgConversionRate: number;
  teamAvgCloseRate: number;
  performanceDelta: number;
  isAboveAverage: boolean;
}

interface Rank {
  position: number;
  total: number;
}

interface AgentDashboardProps {
  user: User;
}

const AgentDashboard: React.FC<AgentDashboardProps> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('7d');
  const { socket } = useSocket();

  const [personalStats, setPersonalStats] = useState<PersonalStats | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [rank, setRank] = useState<Rank | null>(null);

  const fetchPersonalData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      const params = { period };
      const response = await api.get('/api/analytics/agents/me', { params });

      setPersonalStats(response.data.personal);
      setComparison(response.data.comparison);
      setRank(response.data.rank);
    } catch (error) {
      console.error('Error fetching personal dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPersonalData();
  }, [period]);

  // Real-time updates
  useEffect(() => {
    if (socket) {
      socket.on('stats_update', () => fetchPersonalData(true));
      socket.on('conversation_updated', () => fetchPersonalData(true));
    }

    return () => {
      if (socket) {
        socket.off('stats_update');
        socket.off('conversation_updated');
      }
    };
  }, [socket, period]);

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando seu desempenho..." />
      </div>
    );
  }

  if (!personalStats || !comparison || !rank) {
    return (
      <div className="flex-1 p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">Sem dados disponíveis para exibir.</p>
        </div>
      </div>
    );
  }

  // Calcular badges e nível de performance
  const agentStatsForBadges: AgentStats = {
    ...personalStats,
    rank: rank.position
  };

  const earnedBadges = calculateEarnedBadges(agentStatsForBadges);
  const performanceLevel = calculatePerformanceLevel(agentStatsForBadges);
  const motivationalMsg = getMotivationalMessage(agentStatsForBadges);

  return (
    <div className="flex-1 p-8 bg-gray-50">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Meu Desempenho</h1>
            <p className="text-gray-600 mt-2">
              Olá, {user.name} • Acompanhe suas métricas e metas
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => fetchPersonalData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mensagem Motivacional e Badge de Performance */}
      <div className="mb-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-6xl">{performanceLevel.icon}</div>
            <div>
              <h2 className="text-2xl font-bold mb-1">{performanceLevel.label}</h2>
              <p className="text-blue-100">{motivationalMsg}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-6 w-6" />
              <span className="text-3xl font-bold">#{rank.position}</span>
            </div>
            <p className="text-sm text-blue-100">de {rank.total} atendentes</p>
          </div>
        </div>
      </div>

      {/* Badges Conquistadas */}
      {earnedBadges.length > 0 && (
        <div className="mb-8 bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-600" />
            Suas Conquistas ({earnedBadges.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {earnedBadges.map(badge => (
              <div
                key={badge.id}
                className={`${badge.bgColor} ${badge.borderColor} border-2 rounded-lg p-4 text-center hover:scale-105 transition-transform`}
              >
                <div className="text-4xl mb-2">{badge.icon}</div>
                <p className={`text-sm font-semibold ${badge.color}`}>{badge.name}</p>
                <p className="text-xs text-gray-600 mt-1">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meta Diária */}
      <div className="mb-8">
        <DailyGoalCard
          current={personalStats.closedConversations}
          goal={15}
          metric="conversas encerradas"
          subtitle="Meta diária"
        />
      </div>

      {/* KPIs Pessoais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Minhas Conversas"
          value={personalStats.totalConversations}
          icon={MessageSquare}
          color="primary"
          subtitle={`${personalStats.activeNow} ativas agora`}
        />
        <StatCard
          title="Taxa de Conversão"
          value={`${personalStats.conversionRate.toFixed(1)}%`}
          icon={Target}
          color="success"
          subtitle={`${personalStats.withAppointment} agendamentos`}
        />
        <StatCard
          title="Tempo de Resposta"
          value={`${personalStats.avgResponseTimeMinutes}min`}
          icon={Clock}
          color="purple"
          subtitle={comparison.isAboveAverage ? 'Melhor que a média!' : 'Pode melhorar'}
        />
        <StatCard
          title="Taxa de Fechamento"
          value={`${personalStats.closeRate.toFixed(1)}%`}
          icon={CheckCircle}
          color="success"
          subtitle={`${personalStats.closedConversations} encerradas`}
        />
      </div>

      {/* Comparação com a Equipe */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <TeamComparisonCard
          myMetric={personalStats.avgResponseTimeMinutes}
          teamAverage={comparison.teamAvgResponseTime}
          label="Tempo de Resposta"
          unit="min"
          lowerIsBetter={true}
          icon={Clock}
        />
        <TeamComparisonCard
          myMetric={personalStats.conversionRate}
          teamAverage={comparison.teamAvgConversionRate}
          label="Taxa de Conversão"
          unit="%"
          lowerIsBetter={false}
          icon={Target}
        />
        <TeamComparisonCard
          myMetric={personalStats.closeRate}
          teamAverage={comparison.teamAvgCloseRate}
          label="Taxa de Fechamento"
          unit="%"
          lowerIsBetter={false}
          icon={CheckCircle}
        />
      </div>

      {/* Dicas de Melhoria */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-600" />
          Dicas para Melhorar
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {personalStats.avgResponseTimeMinutes > 5 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-medium text-blue-900 mb-1">⚡ Responda Mais Rápido</p>
              <p className="text-sm text-blue-700">
                Tente responder em menos de 5 minutos para melhorar a experiência do paciente.
              </p>
            </div>
          )}
          {personalStats.conversionRate < 50 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="font-medium text-green-900 mb-1">🎯 Foque em Agendamentos</p>
              <p className="text-sm text-green-700">
                Busque entender melhor as necessidades do paciente para aumentar conversões.
              </p>
            </div>
          )}
          {personalStats.closeRate < 70 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="font-medium text-purple-900 mb-1">✅ Encerre Conversas</p>
              <p className="text-sm text-purple-700">
                Lembre-se de encerrar conversas finalizadas para manter a fila organizada.
              </p>
            </div>
          )}
          {earnedBadges.length < 3 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="font-medium text-yellow-900 mb-1">🏆 Desbloqueie Badges</p>
              <p className="text-sm text-yellow-700">
                Continue melhorando para conquistar mais {6 - earnedBadges.length} badges!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/conversations"
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <MessageSquare className="h-6 w-6 text-blue-600" />
          <div>
            <p className="font-medium text-gray-900">Minhas Conversas</p>
            <p className="text-sm text-gray-600">{personalStats.activeNow} ativas agora</p>
          </div>
        </Link>

        <Link
          to="/stats"
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <TrendingUp className="h-6 w-6 text-purple-600" />
          <div>
            <p className="font-medium text-gray-900">Meu Histórico</p>
            <p className="text-sm text-gray-600">Ver relatórios completos</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default AgentDashboard;
