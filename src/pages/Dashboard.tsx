import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageSquare, 
  Users, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  AlertCircle,
  Bot,
  User
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useSocket } from '../hooks/useSocket';
import { api } from '../lib/utils';

interface DashboardStats {
  totalConversations: number;
  activeConversations: number;
  botConversations: number;
  humanConversations: number;
  totalPatients: number;
  newPatientsToday: number;
  avgResponseTime: number;
  satisfactionRate: number;
}

interface ConversationTrend {
  date: string;
  conversations: number;
  bot: number;
  human: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalConversations: 0,
    activeConversations: 0,
    botConversations: 0,
    humanConversations: 0,
    totalPatients: 0,
    newPatientsToday: 0,
    avgResponseTime: 0,
    satisfactionRate: 0
  });

  const [trends, setTrends] = useState<ConversationTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/stats', { params: { period: '24h' } });
      const data = response.data;
      setStats({
        totalConversations: data.conversations.total || 0,
        activeConversations: data.conversations.active || 0,
        botConversations: data.conversations.bot || 0,
        humanConversations: data.conversations.human || 0,
        totalPatients: data.patients.total || 0,
        newPatientsToday: data.patients.new || 0,
        avgResponseTime: Math.round((data.performance.avgResponseTime || 0) / 60),
        satisfactionRate: 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTrends = async () => {
    try {
      const response = await api.get('/api/stats/reports', { params: { groupBy: 'day' } });
      const daily = response.data?.dailyMetrics || [];
      const mapped = daily.map((d: any) => ({
        date: d.date,
        conversations: Number(d.conversations) || 0,
        bot: Number(d.bot) || 0,
        human: Number(d.human) || 0,
      }));
      setTrends(mapped);
    } catch (error) {
      console.error('Error fetching trends:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchStats(), fetchTrends()]);
      setLoading(false);
    };

    loadData();

    // Listen for real-time updates
    if (socket) {
      socket.on('stats_update', fetchStats);
      socket.on('new_conversation', fetchStats);
      socket.on('conversation_updated', fetchStats);
    }

    return () => {
      if (socket) {
        socket.off('stats_update', fetchStats);
        socket.off('new_conversation', fetchStats);
        socket.off('conversation_updated', fetchStats);
      }
    };
  }, [socket]);

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    color = 'blue' 
  }: { 
    title: string; 
    value: string | number; 
    icon: any; 
    trend?: number; 
    color?: string; 
  }) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500'
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {trend !== undefined && (
              <p className={`text-sm mt-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend >= 0 ? '+' : ''}{trend}% em relação a ontem
              </p>
            )}
          </div>
          <div className={`${colorClasses[color as keyof typeof colorClasses]} p-3 rounded-lg`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    );
  };

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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Visão geral do sistema de atendimento</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Conversas Ativas"
          value={stats.activeConversations}
          icon={MessageSquare}
          color="blue"
        />
        <StatCard
          title="Total de Pacientes"
          value={stats.totalPatients}
          icon={Users}
          color="green"
        />
        <StatCard
          title="Tempo Médio de Resposta"
          value={`${stats.avgResponseTime}min`}
          icon={Clock}
          color="purple"
        />
        <StatCard
          title="Taxa de Satisfação"
          value={`${stats.satisfactionRate}%`}
          icon={CheckCircle}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendência de Conversas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
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

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por Tipo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { name: 'Bot', value: stats.botConversations },
              { name: 'Humano', value: stats.humanConversations }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/conversations"
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Ver Conversas</p>
              <p className="text-sm text-gray-600">Gerenciar atendimentos ativos</p>
            </div>
          </Link>
          
          <Link
            to="/patients"
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">Pacientes</p>
              <p className="text-sm text-gray-600">Cadastrar novo paciente</p>
            </div>
          </Link>
          
          <Link
            to="/workflows"
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Bot className="h-6 w-6 text-purple-600" />
            <div>
              <p className="font-medium text-gray-900">Workflows</p>
              <p className="text-sm text-gray-600">Configurar fluxos de atendimento</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
