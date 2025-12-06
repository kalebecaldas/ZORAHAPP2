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
  Cell,
  Area,
  AreaChart
} from 'recharts';
import {
  Download,
  Filter,
  Calendar,
  TrendingUp,
  Users,
  MessageSquare,
  Clock,
  Target,
  Award,
  DollarSign,
  Zap
} from 'lucide-react';
import { api } from '../lib/utils';
import {
  StatCard,
  ChartContainer,
  LoadingSpinner,
  MetricBadge,
  TrendIndicator
} from '../components/ui/DesignSystem';

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

interface AnalyticsData {
  conversion: any;
  insurances: any;
  procedures: any;
  agents: any;
  roi: any;
  funnel: any;
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
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const period = dateRange === '7d' ? '7d' : (dateRange === '30d' ? '30d' : '30d');

      const [summaryRes, reportsRes, analyticsData] = await Promise.all([
        api.get('/api/stats', { params: { period } }),
        api.get('/api/stats/reports', { params: { groupBy: 'day' } }),
        Promise.all([
          api.get('/api/analytics/conversion', { params: { period } }),
          api.get('/api/analytics/insurances', { params: { period } }),
          api.get('/api/analytics/procedures', { params: { period } }),
          api.get('/api/analytics/agents', { params: { period } }),
          api.get('/api/analytics/roi', { params: { period } }),
          api.get('/api/analytics/funnel', { params: { period } })
        ])
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

      setAnalytics({
        conversion: analyticsData[0].data,
        insurances: analyticsData[1].data,
        procedures: analyticsData[2].data,
        agents: analyticsData[3].data,
        roi: analyticsData[4].data,
        funnel: analyticsData[5].data
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

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando estatísticas..." />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-gray-50">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Estatísticas Avançadas</h1>
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
          color="primary"
        />
        <StatCard
          title="Total de Pacientes"
          value={stats.totalPatients.toLocaleString()}
          icon={Users}
          color="success"
        />
        <StatCard
          title="Tempo Médio de Resposta"
          value={`${stats.avgResponseTime}min`}
          icon={Clock}
          color="warning"
        />
        <StatCard
          title="Taxa de Conversão"
          value={`${(analytics?.conversion?.botConversionRate || 0).toFixed(1)}%`}
          icon={Target}
          color="purple"
        />
      </div>

      {/* ROI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card fade-in">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">Economia de Tempo</p>
                <p className="text-3xl font-bold text-blue-600">{analytics?.roi?.timeSavedHours || 0}h</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500">
              R$ {(analytics?.roi?.costSaved || 0).toFixed(0)} economizados
            </p>
          </div>
        </div>

        <div className="card fade-in">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">Receita Gerada</p>
                <p className="text-3xl font-bold text-green-600">R$ {(analytics?.roi?.revenueGenerated || 0).toLocaleString()}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500">
              {analytics?.roi?.appointmentsGenerated || 0} agendamentos
            </p>
          </div>
        </div>

        <div className="card fade-in">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">ROI do Sistema</p>
                <p className="text-3xl font-bold text-purple-600">{(analytics?.roi?.roi || 0).toFixed(0)}%</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Retorno sobre investimento
            </p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Conversations by Day */}
        <ChartContainer title="Conversas por Dia">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stats.conversationsByDay}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorBot" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="conversations" stroke="#3B82F6" fillOpacity={1} fill="url(#colorTotal)" name="Total" />
              <Area type="monotone" dataKey="bot" stroke="#10B981" fillOpacity={1} fill="url(#colorBot)" name="Bot" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Conversations by Status */}
        <ChartContainer title="Conversas por Status">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.conversationsByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
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
        </ChartContainer>
      </div>

      {/* Funil e Procedimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Funil de Conversão */}
        <ChartContainer title="Funil de Conversão Detalhado">
          <div className="space-y-4">
            {analytics?.funnel?.funnel.map((stage: any, index: number) => (
              <div key={stage.stage} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-green-500' : index === 2 ? 'bg-yellow-500' : index === 3 ? 'bg-orange-500' : 'bg-purple-500'
                      }`}>
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{stage.count}</span>
                    <span className="text-xs text-gray-500">({stage.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full transition-all duration-500 ${index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-green-500' : index === 2 ? 'bg-yellow-500' : index === 3 ? 'bg-orange-500' : 'bg-purple-500'
                      }`}
                    style={{ width: `${stage.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartContainer>

        {/* Top Procedimentos */}
        <ChartContainer title="Procedimentos Mais Solicitados">
          <div className="space-y-3">
            {analytics?.procedures?.topProcedures.map((proc: any, index: number) => (
              <div key={proc.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                    }`}>
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">{proc.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-blue-600">{proc.requests}</span>
                  <p className="text-xs text-gray-500">solicitações</p>
                </div>
              </div>
            ))}
          </div>
        </ChartContainer>
      </div>

      {/* Insurance Companies and Agent Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Insurance Companies */}
        <ChartContainer title="Top Convênios">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics?.insurances?.topInsurances || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="insurance" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="appointments" fill="#3B82F6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Agent Performance */}
        <ChartContainer title="Desempenho dos Agentes">
          <div className="space-y-4">
            {analytics?.agents?.agents.slice(0, 5).map((agent: any, index: number) => (
              <div key={agent.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Award className={`h-5 w-5 ${index === 0 ? 'text-yellow-600' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{agent.name}</p>
                    <p className="text-sm text-gray-500">{agent.totalConversations} conversas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{agent.avgResponseTimeMinutes}min</p>
                  <p className="text-xs text-gray-500">tempo médio</p>
                  <p className="text-sm font-medium text-green-600">{agent.conversionRate.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">conversão</p>
                </div>
              </div>
            ))}
          </div>
        </ChartContainer>
      </div>
    </div>
  );
};

export { Stats };
