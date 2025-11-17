import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Download, Filter, Calendar, TrendingUp, Users, MessageSquare, Clock } from 'lucide-react';
import { api } from '../lib/utils';

interface StatsData {
  totalConversations: number;
  totalPatients: number;
  avgResponseTime: number;
  satisfactionRate: number;
  conversationsByStatus: Array<{ name: string; value: number }>;
  conversationsByDay: Array<{ date: string; conversations: number; bot: number; human: number }>;
  topInsuranceCompanies: Array<{ name: string; count: number }>;
  agentPerformance: Array<{ name: string; conversations: number; avgResponseTime: number; satisfaction: number }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const Stats: React.FC = () => {
  const [stats, setStats] = useState<StatsData>({
    totalConversations: 0,
    totalPatients: 0,
    avgResponseTime: 0,
    satisfactionRate: 0,
    conversationsByStatus: [],
    conversationsByDay: [],
    topInsuranceCompanies: [],
    agentPerformance: []
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');

  const fetchStats = async () => {
    try {
      const period = dateRange === '7d' ? '7d' : (dateRange === '30d' ? '30d' : '30d');
      const [summaryRes, reportsRes] = await Promise.all([
        api.get('/api/stats', { params: { period } }),
        api.get('/api/stats/reports', { params: { groupBy: 'day' } }),
      ]);

      const summary = summaryRes.data;
      const reports = reportsRes.data || {};
      const daily = reports.dailyMetrics || [];
      const insurance = reports.insuranceStats || [];
      const agents = reports.agentPerformance || [];

      setStats({
        totalConversations: summary.conversations?.total || 0,
        totalPatients: summary.patients?.total || 0,
        avgResponseTime: Math.round((summary.performance?.avgResponseTime || 0) / 60),
        satisfactionRate: 0,
        conversationsByStatus: [
          { name: 'BOT', value: summary.conversations?.bot || 0 },
          { name: 'Humano', value: summary.conversations?.human || 0 },
          { name: 'Fechada', value: summary.conversations?.closed || 0 },
        ],
        conversationsByDay: daily.map((d: any) => ({
          date: d.date,
          conversations: Number(d.conversations) || 0,
          bot: Number(d.bot) || 0,
          human: Number(d.human) || 0,
        })),
        topInsuranceCompanies: insurance.map((i: any) => ({ name: i.insurance, count: i.count })),
        agentPerformance: agents.map((a: any) => ({
          name: a.name,
          conversations: Number(a.conversations) || 0,
          avgResponseTime: Math.round((a.avg_duration_hours || 0) * 60),
          satisfaction: 0,
        })),
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const StatCard = ({ title, value, icon: Icon, trend }: { title: string; value: string | number; icon: any; trend?: number }) => (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend !== undefined && (
            <p className={`text-sm mt-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? '+' : ''}{trend}% em relação ao período anterior
            </p>
          )}
        </div>
        <div className="bg-blue-100 p-3 rounded-lg">
          <Icon className="h-6 w-6 text-blue-600" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-gray-50">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Estatísticas</h1>
            <p className="text-gray-600 mt-2">Análise detalhada do desempenho do sistema</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="1y">Último ano</option>
            </select>
            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="h-4 w-4" />
              <span>Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total de Conversas"
          value={stats.totalConversations.toLocaleString()}
          icon={MessageSquare}
        />
        <StatCard
          title="Total de Pacientes"
          value={stats.totalPatients.toLocaleString()}
          icon={Users}
        />
        <StatCard
          title="Tempo Médio de Resposta"
          value={`${stats.avgResponseTime}min`}
          icon={Clock}
        />
        <StatCard
          title="Taxa de Satisfação"
          value={`${stats.satisfactionRate}%`}
          icon={TrendingUp}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Conversations by Day */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversas por Dia</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.conversationsByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="conversations" stroke="#3B82F6" name="Total" />
              <Line type="monotone" dataKey="bot" stroke="#10B981" name="Bot" />
              <Line type="monotone" dataKey="human" stroke="#F59E0B" name="Humano" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Conversations by Status */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversas por Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.conversationsByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {stats.conversationsByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insurance Companies and Agent Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Insurance Companies */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Convênios</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.topInsuranceCompanies}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Agent Performance */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Desempenho dos Agentes</h3>
          <div className="space-y-4">
            {stats.agentPerformance.map((agent, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{agent.name}</p>
                    <p className="text-sm text-gray-500">{agent.conversations} conversas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{agent.avgResponseTime}min</p>
                  <p className="text-xs text-gray-500">tempo médio</p>
                  <p className="text-sm font-medium text-green-600">{agent.satisfaction}%</p>
                  <p className="text-xs text-gray-500">satisfação</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export { Stats };
