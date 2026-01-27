import React, { useState, useEffect } from 'react';
import { api } from '../../lib/utils';
import { toast } from 'sonner';
import {
  Target, Users, Save, AlertCircle, TrendingUp,
  Clock, CheckCircle, MessageSquare
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  role: string;
}

interface Goal {
  id?: string;
  userId: string;
  type: string;
  target: number;
  period: string;
  isActive: boolean;
}

const GOAL_TYPES = [
  { 
    id: 'CONVERSATIONS', 
    label: 'Conversas Encerradas', 
    icon: MessageSquare, 
    description: 'Número de conversas encerradas',
    unit: 'conversas',
    placeholder: '15'
  },
  { 
    id: 'APPOINTMENTS', 
    label: 'Agendamentos Realizados', 
    icon: CheckCircle, 
    description: 'Número de agendamentos concluídos',
    unit: 'agendamentos',
    placeholder: '10'
  },
  { 
    id: 'CONVERSION_RATE', 
    label: 'Taxa de Conversão', 
    icon: TrendingUp, 
    description: 'Percentual de conversas que viraram agendamento',
    unit: '%',
    placeholder: '70'
  },
  { 
    id: 'RESPONSE_TIME', 
    label: 'Tempo Médio de Resposta', 
    icon: Clock, 
    description: 'Tempo médio para responder mensagens',
    unit: 'minutos',
    placeholder: '3'
  },
];

const PERIODS = [
  { id: 'DAILY', label: 'Diário' },
  { id: 'WEEKLY', label: 'Semanal' },
  { id: 'MONTHLY', label: 'Mensal' },
];

const GoalsManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('DAILY');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchGoals(selectedUser.id);
    }
  }, [selectedUser, selectedPeriod]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/users/agents');
      setUsers(response.data);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar lista de atendentes');
    } finally {
      setLoading(false);
    }
  };

  const fetchGoals = async (userId: string) => {
    try {
      const response = await api.get(`/api/goals/users/${userId}`);
      setGoals(response.data);
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
      setGoals([]);
    }
  };

  const handleSaveGoal = async (type: string) => {
    if (!selectedUser) return;

    const goalInput = document.getElementById(`goal-${type}`) as HTMLInputElement;
    if (!goalInput) return;

    const target = parseFloat(goalInput.value);
    if (isNaN(target) || target < 0) {
      toast.error('Valor de meta inválido');
      return;
    }

    try {
      setSaving(true);
      await api.post('/api/goals', {
        userId: selectedUser.id,
        type,
        target,
        period: selectedPeriod
      });

      toast.success('Meta salva com sucesso');
      await fetchGoals(selectedUser.id);
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      toast.error('Erro ao salvar meta');
    } finally {
      setSaving(false);
    }
  };

  const getGoalValue = (type: string): number | undefined => {
    const goal = goals.find(g => g.type === type && g.period === selectedPeriod);
    return goal?.target;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-600" />
          Gerenciamento de Metas
        </h2>
        <p className="text-gray-600 mt-1">
          Configure metas individuais para cada atendente
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Coluna Esquerda - Lista de Atendentes */}
        <div className="col-span-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Selecione um Atendente
            </h3>
            
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>Nenhum atendente encontrado</p>
                </div>
              ) : (
                users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      selectedUser?.id === user.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <div className="font-medium">{user.name}</div>
                    <div className={`text-xs ${selectedUser?.id === user.id ? 'text-blue-100' : 'text-gray-500'}`}>
                      {user.role === 'SUPERVISOR' ? 'Supervisor' : 'Atendente'}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Coluna Direita - Configuração de Metas */}
        <div className="col-span-8">
          {!selectedUser ? (
            <div className="bg-gray-50 rounded-lg p-12 text-center">
              <Target className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Selecione um Atendente
              </h3>
              <p className="text-gray-500">
                Escolha um atendente na lista ao lado para configurar suas metas
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
                <h3 className="text-xl font-bold mb-1">
                  Metas de {selectedUser.name}
                </h3>
                <p className="text-blue-100">
                  Configure as metas individuais para este atendente
                </p>
              </div>

              {/* Seletor de Período */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Período das Metas
                </label>
                <div className="flex gap-2">
                  {PERIODS.map((period) => (
                    <button
                      key={period.id}
                      onClick={() => setSelectedPeriod(period.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedPeriod === period.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Formulário de Metas */}
              <div className="space-y-4">
                {GOAL_TYPES.map((goalType) => {
                  const Icon = goalType.icon;
                  const currentValue = getGoalValue(goalType.id);

                  return (
                    <div
                      key={goalType.id}
                      className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                            <Icon className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>

                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-gray-900 mb-1">
                            {goalType.label}
                          </label>
                          <p className="text-xs text-gray-500 mb-3">
                            {goalType.description}
                          </p>

                          <div className="flex gap-3">
                            <div className="flex-1 relative">
                              <input
                                id={`goal-${goalType.id}`}
                                type="number"
                                step={goalType.id === 'RESPONSE_TIME' ? '0.1' : '1'}
                                min="0"
                                defaultValue={currentValue}
                                placeholder={goalType.placeholder}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-20 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <span className="absolute right-3 top-2.5 text-sm text-gray-500">
                                {goalType.unit}
                              </span>
                            </div>

                            <button
                              onClick={() => handleSaveGoal(goalType.id)}
                              disabled={saving}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                            >
                              <Save className="w-4 h-4" />
                              Salvar
                            </button>
                          </div>

                          {currentValue !== undefined && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              Meta atual: {currentValue} {goalType.unit}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Como funciona</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>As metas são configuradas individualmente para cada atendente</li>
                    <li>Você pode definir metas diárias, semanais ou mensais</li>
                    <li>O progresso é calculado automaticamente no dashboard do atendente</li>
                    <li>Deixe o campo vazio para remover uma meta</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoalsManagement;
