import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  MessageSquare,
  Clock,
  Target,
  TrendingUp,
  Award,
  AlertCircle,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { api } from '../../lib/utils';
import { StatCard, ChartContainer, LoadingSpinner } from '../ui/DesignSystem';
import { AgentRankingCard } from './AgentRankingCard';
import { TeamPerformanceChart } from './TeamPerformanceChart';

interface User {
  id: string;
  name: string;
  role: string;
}

interface AgentPerformance {
  name: string;
  totalConversations: number;
  closedConversations: number;
  closedWithAppointment: number;
  conversionRate: number;
  avgResponseTimeMinutes: number;
  closeRate: number;
}

interface ManagerDashboardProps {
  user: User;
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);
  const { socket } = useSocket();

  // Estados
  const [agents, setAgents] = useState<AgentPerformance[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [conversion, setConversion] = useState<any>(null);

  const fetchDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      const params = { period };

      const [agentsRes, statsRes, conversionRes] = await Promise.all([
        api.get('/api/analytics/agents', { params }),
        api.get('/api/stats', { params: { period: '24h' } }),
        api.get('/api/analytics/conversion', { params })
      ]);

      setAgents(agentsRes.data?.agents || []);
      setStats(statsRes.data || {});
      setConversion(conversionRes.data || {});
    } catch (error) {
      console.error('Error fetching manager dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  // Real-time updates
  useEffect(() => {
    if (socket) {
      socket.on('stats_update', () => fetchDashboardData(true));
      socket.on('new_conversation', () => fetchDashboardData(true));
      socket.on('conversation_updated', () => fetchDashboardData(true));
    }

    return () => {
      if (socket) {
        socket.off('stats_update');
        socket.off('new_conversation');
        socket.off('conversation_updated');
      }
    };
  }, [socket, period]);

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando dashboard gerencial..." />
      </div>
    );
  }

  const teamAvgResponseTime = agents.length > 0
    ? agents.reduce((sum, a) => sum + a.avgResponseTimeMinutes, 0) / agents.length
    : 0;

  const teamAvgConversionRate = agents.length > 0
    ? agents.reduce((sum, a) => sum + a.conversionRate, 0) / agents.length
    : 0;

  const totalTeamConversations = agents.reduce((sum, a) => sum + a.totalConversations, 0);
  const totalTeamClosed = agents.reduce((sum, a) => sum + a.closedConversations, 0);

  // Identificar atendentes com atenção necessária
  const needsAttention = agents.filter(a =>
    a.avgResponseTimeMinutes > 10 || a.conversionRate < 30
  );

  return (
    <div className="flex-1 p-8 bg-gray-50">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Gerencial</h1>
            <p className="text-gray-600 mt-2">
              Bem-vindo, {user.name} • Visão completa da equipe
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => fetchDashboardData(true)}
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

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Conversas Ativas"
          value={stats?.conversations?.active || 0}
          icon={MessageSquare}
          color="primary"
          subtitle="Total em atendimento"
        />
        <StatCard
          title="Atendentes Ativos"
          value={agents.length}
          icon={Users}
          color="success"
          subtitle={`${needsAttention.length} precisam de atenção`}
        />
        <StatCard
          title="Tempo Médio da Equipe"
          value={`${Math.round(teamAvgResponseTime)}min`}
          icon={Clock}
          color="purple"
          subtitle="Tempo de resposta"
        />
        <StatCard
          title="Conversão da Equipe"
          value={`${teamAvgConversionRate.toFixed(1)}%`}
          icon={Target}
          color="success"
          subtitle="Taxa de agendamento"
        />
      </div>

      {/* Alertas de Atenção */}
      {needsAttention.length > 0 && (
        <div className="mb-8 bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-orange-900 mb-2">
                Atendentes que precisam de atenção
              </h3>
              <div className="space-y-2">
                {needsAttention.map(agent => (
                  <div key={agent.name} className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <span className="font-medium text-gray-900">{agent.name}</span>
                    <div className="flex items-center gap-4 text-sm">
                      {agent.avgResponseTimeMinutes > 10 && (
                        <span className="text-orange-600">
                          Tempo alto: {agent.avgResponseTimeMinutes}min
                        </span>
                      )}
                      {agent.conversionRate < 30 && (
                        <span className="text-orange-600">
                          Conversão baixa: {agent.conversionRate.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ranking e Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Ranking de Atendentes */}
        <ChartContainer
          title="🏆 Ranking de Atendentes"
          action={
            <Link to="/users" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Ver todos <ArrowUpRight className="h-4 w-4" />
            </Link>
          }
        >
          <AgentRankingCard agents={agents} highlightBest={true} maxDisplay={5} />
        </ChartContainer>

        {/* Performance Comparativa */}
        <ChartContainer
          title="📊 Conversão por Atendente"
        >
          <TeamPerformanceChart
            data={agents}
            metric="conversionRate"
            yAxisLabel="Taxa de Conversão (%)"
          />
        </ChartContainer>
      </div>

      {/* Métricas Detalhadas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600">Total de Conversas</h3>
              <p className="text-2xl font-bold text-gray-900">{totalTeamConversations}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {totalTeamClosed} encerradas ({totalTeamConversations > 0 ? ((totalTeamClosed / totalTeamConversations) * 100).toFixed(1) : 0}%)
          </p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <Target className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600">Bot Performance</h3>
              <p className="text-2xl font-bold text-gray-900">
                {conversion?.botConversionRate?.toFixed(1) || 0}%
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {conversion?.conversationsWithAppointment || 0} agendamentos automáticos
          </p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-100 rounded-full">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600">Top Performer</h3>
              <p className="text-2xl font-bold text-gray-900">
                {agents[0]?.name.split(' ')[0] || 'N/A'}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {agents[0]?.conversionRate?.toFixed(1) || 0}% de conversão
          </p>
        </div>
      </div>

      {/* Tempo de Resposta Comparativo */}
      <ChartContainer
        title="⏱️ Tempo de Resposta por Atendente"
      >
        <TeamPerformanceChart
          data={agents}
          metric="avgResponseTimeMinutes"
          yAxisLabel="Tempo Médio (min)"
        />
      </ChartContainer>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/conversations"
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <MessageSquare className="h-6 w-6 text-blue-600" />
          <div>
            <p className="font-medium text-gray-900">Ver Conversas</p>
            <p className="text-sm text-gray-600">Gerenciar filas</p>
          </div>
        </Link>

        <Link
          to="/users"
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <Users className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-medium text-gray-900">Gerenciar Equipe</p>
            <p className="text-sm text-gray-600">Usuários e permissões</p>
          </div>
        </Link>

        <Link
          to="/stats"
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <TrendingUp className="h-6 w-6 text-purple-600" />
          <div>
            <p className="font-medium text-gray-900">Relatórios</p>
            <p className="text-sm text-gray-600">Análise detalhada</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default ManagerDashboard;
