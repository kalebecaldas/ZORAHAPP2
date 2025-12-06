import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    TrendingUp,
    Users,
    MessageSquare,
    Calendar,
    DollarSign,
    Clock,
    Target,
    Award,
    Zap,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { useSocket } from '../hooks/useSocket';
import { api } from '../lib/utils';
import {
    StatCard,
    ChartContainer,
    LoadingSpinner,
    MetricBadge,
    TrendIndicator
} from '../components/ui/DesignSystem';

interface ConversionMetrics {
    botConversionRate: number;
    humanTransferRate: number;
    totalBotConversations: number;
    conversationsWithAppointment: number;
}

interface InsuranceStats {
    topInsurances: Array<{ insurance: string; appointments: number }>;
}

interface ProcedureStats {
    topProcedures: Array<{ name: string; requests: number }>;
}

interface AgentStats {
    agents: Array<{
        name: string;
        totalConversations: number;
        closedWithAppointment: number;
        conversionRate: number;
        avgResponseTimeMinutes: number;
    }>;
}

interface ROIMetrics {
    timeSavedHours: number;
    costSaved: number;
    appointmentsGenerated: number;
    revenueGenerated: number;
    roi: number;
}

interface FunnelMetrics {
    funnel: Array<{
        stage: string;
        count: number;
        percentage: number;
    }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const DashboardIntelligent: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('7d');
    const { socket } = useSocket();

    // Estados para cada métrica
    const [conversion, setConversion] = useState<ConversionMetrics | null>(null);
    const [insurances, setInsurances] = useState<InsuranceStats | null>(null);
    const [procedures, setProcedures] = useState<ProcedureStats | null>(null);
    const [agents, setAgents] = useState<AgentStats | null>(null);
    const [roi, setROI] = useState<ROIMetrics | null>(null);
    const [funnel, setFunnel] = useState<FunnelMetrics | null>(null);

    const fetchAllMetrics = async () => {
        try {
            setLoading(true);
            const params = { period };

            const [
                conversionRes,
                insurancesRes,
                proceduresRes,
                agentsRes,
                roiRes,
                funnelRes
            ] = await Promise.all([
                api.get('/api/analytics/conversion', { params }),
                api.get('/api/analytics/insurances', { params }),
                api.get('/api/analytics/procedures', { params }),
                api.get('/api/analytics/agents', { params }),
                api.get('/api/analytics/roi', { params }),
                api.get('/api/analytics/funnel', { params })
            ]);

            // Debug: ver o que está vindo
            console.log('📊 Analytics Data:', {
                conversion: conversionRes.data,
                insurances: insurancesRes.data,
                procedures: proceduresRes.data,
                agents: agentsRes.data,
                roi: roiRes.data,
                funnel: funnelRes.data
            });

            setConversion(conversionRes.data || { botConversionRate: 0, humanTransferRate: 0, totalBotConversations: 0, conversationsWithAppointment: 0 });
            setInsurances(insurancesRes.data || { topInsurances: [] });
            setProcedures(proceduresRes.data || { topProcedures: [] });
            setAgents(agentsRes.data || { agents: [] });
            setROI(roiRes.data || { timeSavedHours: 0, costSaved: 0, appointmentsGenerated: 0, revenueGenerated: 0, roi: 0 });
            setFunnel(funnelRes.data || { funnel: [] });
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllMetrics();
    }, [period]);

    // Real-time updates
    useEffect(() => {
        if (socket) {
            socket.on('stats_update', fetchAllMetrics);
            socket.on('new_conversation', fetchAllMetrics);
            socket.on('conversation_updated', fetchAllMetrics);
        }

        return () => {
            if (socket) {
                socket.off('stats_update', fetchAllMetrics);
                socket.off('new_conversation', fetchAllMetrics);
                socket.off('conversation_updated', fetchAllMetrics);
            }
        };
    }, [socket]);

    if (loading) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center">
                <LoadingSpinner size="lg" text="Carregando métricas..." />
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 bg-gray-50">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Dashboard Inteligente</h1>
                        <p className="text-gray-600 mt-2">Análise completa com métricas de IA e conversão</p>
                    </div>
                    <div className="flex items-center gap-4">
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
                    title="Conversão do Bot"
                    value={`${(conversion?.botConversionRate || 0).toFixed(1)}%`}
                    icon={Target}
                    color="success"
                    subtitle={`${conversion?.conversationsWithAppointment || 0} agendamentos`}
                />
                <StatCard
                    title="Economia de Tempo"
                    value={`${roi?.timeSavedHours || 0}h`}
                    icon={Clock}
                    color="primary"
                    subtitle={`R$ ${(roi?.costSaved || 0).toFixed(0)} economizados`}
                />
                <StatCard
                    title="Receita Gerada"
                    value={`R$ ${(roi?.revenueGenerated || 0).toLocaleString()}`}
                    icon={DollarSign}
                    color="success"
                    subtitle={`${roi?.appointmentsGenerated || 0} agendamentos`}
                />
                <StatCard
                    title="ROI do Sistema"
                    value={`${(roi?.roi || 0).toFixed(0)}%`}
                    icon={TrendingUp}
                    color="purple"
                    subtitle="Retorno sobre investimento"
                />
            </div>

            {/* Métricas de Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Funil de Conversão */}
                <ChartContainer title="Funil de Conversão">
                    <div className="space-y-4">
                        {funnel?.funnel.map((stage, index) => (
                            <div key={stage.stage} className="relative">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-900">{stage.count}</span>
                                        <span className="text-xs text-gray-500">({stage.percentage.toFixed(1)}%)</span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                                        style={{ width: `${stage.percentage}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartContainer>

                {/* Top Convênios */}
                <ChartContainer title="Top Convênios">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={insurances?.topInsurances || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="insurance" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="appointments" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>

            {/* Procedimentos e Agentes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Top Procedimentos */}
                <ChartContainer title="Procedimentos Mais Solicitados">
                    <div className="space-y-3">
                        {procedures?.topProcedures.map((proc, index) => (
                            <div key={proc.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                                        }`}>
                                        {index + 1}
                                    </div>
                                    <span className="font-medium text-gray-900">{proc.name}</span>
                                </div>
                                <span className="text-lg font-bold text-blue-600">{proc.requests}</span>
                            </div>
                        ))}
                    </div>
                </ChartContainer>

                {/* Performance dos Agentes */}
                <ChartContainer
                    title="Ranking de Agentes"
                    action={
                        <Link to="/users" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                            Ver todos <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    }
                >
                    <div className="space-y-3">
                        {agents?.agents.slice(0, 5).map((agent, index) => (
                            <div key={agent.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 rounded-full">
                                        <Award className={`h-4 w-4 ${index === 0 ? 'text-yellow-600' : 'text-blue-600'}`} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{agent.name}</p>
                                        <p className="text-xs text-gray-500">{agent.totalConversations} conversas</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-green-600">{agent.conversionRate.toFixed(1)}%</p>
                                    <p className="text-xs text-gray-500">{agent.closedWithAppointment} agendamentos</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartContainer>
            </div>

            {/* Insights de IA */}
            <div className="card fade-in">
                <div className="card-header">
                    <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-purple-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Insights de IA</h3>
                    </div>
                </div>
                <div className="card-body">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="h-5 w-5 text-blue-600" />
                                <span className="font-semibold text-blue-900">Bot Performance</span>
                            </div>
                            <p className="text-sm text-blue-700">
                                {conversion?.totalBotConversations || 0} conversas automatizadas com {(conversion?.botConversionRate || 0).toFixed(1)}% de conversão
                            </p>
                        </div>

                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="h-5 w-5 text-green-600" />
                                <span className="font-semibold text-green-900">Economia</span>
                            </div>
                            <p className="text-sm text-green-700">
                                R$ {(roi?.costSaved || 0).toFixed(0)} economizados em {roi?.timeSavedHours || 0}h de atendimento automatizado
                            </p>
                        </div>

                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="flex items-center gap-2 mb-2">
                                <Target className="h-5 w-5 text-purple-600" />
                                <span className="font-semibold text-purple-900">Convênio Destaque</span>
                            </div>
                            <p className="text-sm text-purple-700">
                                {insurances?.topInsurances?.[0]?.insurance || 'Nenhum'} lidera com {insurances?.topInsurances?.[0]?.appointments || 0} agendamentos
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                    to="/conversations"
                    className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                    <div>
                        <p className="font-medium text-gray-900">Ver Conversas</p>
                        <p className="text-sm text-gray-600">Gerenciar atendimentos</p>
                    </div>
                </Link>

                <Link
                    to="/stats"
                    className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                    <BarChart3 className="h-6 w-6 text-green-600" />
                    <div>
                        <p className="font-medium text-gray-900">Estatísticas</p>
                        <p className="text-sm text-gray-600">Análise detalhada</p>
                    </div>
                </Link>

                <Link
                    to="/patients"
                    className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                    <Users className="h-6 w-6 text-purple-600" />
                    <div>
                        <p className="font-medium text-gray-900">Pacientes</p>
                        <p className="text-sm text-gray-600">Cadastros e histórico</p>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default DashboardIntelligent;
