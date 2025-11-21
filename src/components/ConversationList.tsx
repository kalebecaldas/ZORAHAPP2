import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Clock,
  User,
  Bot,
  MessageSquare,
  Phone,
  Calendar,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreVertical,
  Users,
  UserCheck,
  ArrowRight,
  History,
  Tag,
  Star,
  StarOff,
  Archive
} from 'lucide-react';
import { api } from '../lib/utils';
import { motion, LayoutGroup } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { toast } from 'sonner';
import { ConversationViewer } from './ConversationViewer';

interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  insuranceCompany?: string;
  avatar?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'AGENT';
  avatar?: string;
}

interface Message {
  id: string;
  messageText: string;
  messageType: string;
  sender: 'USER' | 'BOT' | 'AGENT';
  status: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  phone: string;
  status: 'BOT_QUEUE' | 'PRINCIPAL' | 'EM_ATENDIMENTO' | 'FECHADA';
  assignedToId?: string;
  assignedTo?: User;
  patient?: Patient;
  patientId?: string;
  lastMessage: string;
  lastTimestamp: string;
  createdAt: string;
  updatedAt: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  workflowId?: string;
  currentWorkflowNode?: string;
  scheduledProcedures?: string[];
  preferredLocation?: string;
  preferredDate?: string;
  preferredTime?: string;
  tags?: string[];
  notes?: string;
  sessionExpiry?: string;
}

interface ConversationCardProps {
  conversation: Conversation;
  currentUserId: string;
  onAssign: (conversationId: string) => void;
  onTransfer: (conversationId: string) => void;
  onViewHistory: (conversationId: string) => void;
  onPriorityChange: (conversationId: string, priority: string) => void;
  onRequest: (conversationId: string) => void;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'BOT_QUEUE':
      return {
        icon: Bot,
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        label: 'Bot',
        description: 'Atendimento automatizado'
      };
    case 'PRINCIPAL':
      return {
        icon: Users,
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        label: 'Fila Principal',
        description: 'Aguardando atendente'
      };
    case 'EM_ATENDIMENTO':
      return {
        icon: UserCheck,
        color: 'bg-green-100 text-green-800 border-green-200',
        label: 'Em Atendimento',
        description: 'Você está atendendo'
      };
    case 'FECHADA':
      return {
        icon: CheckCircle,
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        label: 'Fechada',
        description: 'Conversa finalizada'
      };
    default:
      return {
        icon: MessageSquare,
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        label: 'Desconhecido',
        description: 'Status não identificado'
      };
  }
};

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case 'URGENT':
      return {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: AlertCircle,
        label: 'Urgente'
      };
    case 'HIGH':
      return {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: AlertCircle,
        label: 'Alta'
      };
    case 'MEDIUM':
      return {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: AlertCircle,
        label: 'Média'
      };
    case 'LOW':
      return {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: AlertCircle,
        label: 'Baixa'
      };
    default:
      return {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: AlertCircle,
        label: 'Desconhecida'
      };
  }
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Agora';
  if (diffInMinutes < 60) return `${diffInMinutes}min`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d`;
};

const ConversationCard: React.FC<ConversationCardProps> = ({
  conversation,
  currentUserId,
  onAssign,
  onTransfer,
  onViewHistory,
  onPriorityChange,
  onRequest
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const statusConfig = getStatusConfig(conversation.status);
  const priorityConfig = getPriorityConfig(conversation.priority);
  const isAssignedToMe = conversation.assignedToId === currentUserId;
  const canAssign = conversation.status === 'PRINCIPAL' || conversation.status === 'BOT_QUEUE';
  const canTransfer = isAssignedToMe && conversation.status === 'EM_ATENDIMENTO';

  const handleAssign = () => {
    if (canAssign) {
      onAssign(conversation.id);
      setShowAssignModal(false);
    }
  };

  const handleTransfer = () => {
    onTransfer(conversation.id);
    setShowTransferModal(false);
  };

  const handlePriorityChange = (newPriority: string) => {
    onPriorityChange(conversation.id, newPriority);
    setShowMenu(false);
  };

  const getSessionStatus = () => {
    if (!conversation.sessionExpiry) return null;

    const expiry = new Date(conversation.sessionExpiry);
    const now = new Date();
    const diffInHours = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffInHours <= 1) {
      return { color: 'text-red-600', label: 'Expira em 1h' };
    } else if (diffInHours <= 6) {
      return { color: 'text-orange-600', label: `Expira em ${Math.ceil(diffInHours)}h` };
    }

    return null;
  };

  const sessionStatus = getSessionStatus();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 group">
      {/* Card Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-lg shadow-sm">
              <Phone className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                {conversation.patient ? conversation.patient.name : `Paciente ${conversation.phone}`}
              </h3>
              <p className="text-sm text-gray-600 flex items-center space-x-1">
                <Phone className="h-3 w-3" />
                <span>{conversation.phone}</span>
              </p>
              {conversation.patient?.insuranceCompany && (
                <p className="text-xs text-green-600 font-medium">
                  {conversation.patient.insuranceCompany}
                </p>
              )}
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <div className="py-1">
                  <button
                    onClick={() => handlePriorityChange('URGENT')}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <span>Marcar como Urgente</span>
                  </button>
                  <button
                    onClick={() => handlePriorityChange('HIGH')}
                    className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center space-x-2"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <span>Marcar como Alta Prioridade</span>
                  </button>
                  <button
                    onClick={() => handlePriorityChange('MEDIUM')}
                    className="w-full px-4 py-2 text-left text-sm text-yellow-600 hover:bg-yellow-50 flex items-center space-x-2"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <span>Marcar como Média Prioridade</span>
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      onViewHistory(conversation.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <History className="h-4 w-4" />
                    <span>Ver Histórico</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status and Priority Badges */}
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
            <statusConfig.icon className="h-3 w-3 mr-1" />
            {statusConfig.label}
          </span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${priorityConfig.color}`}>
            <priorityConfig.icon className="h-3 w-3 mr-1" />
            {priorityConfig.label}
          </span>
          {conversation.tags?.map((tag, index) => (
            <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              <Tag className="h-3 w-3 mr-1" />
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Last Message Preview */}
      {conversation.lastMessage && (
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 rounded-full mt-2 bg-blue-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 line-clamp-2">
                {conversation.lastMessage}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatTimeAgo(conversation.lastTimestamp)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Additional Info */}
      {(conversation.scheduledProcedures?.length || conversation.preferredLocation || sessionStatus) && (
        <div className="p-4 border-b border-gray-100">
          <div className="space-y-2">
            {conversation.scheduledProcedures?.length && (
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <Calendar className="h-3 w-3" />
                <span>{conversation.scheduledProcedures.length} procedimento(s) agendado(s)</span>
              </div>
            )}
            {conversation.preferredLocation && (
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <MapPin className="h-3 w-3" />
                <span>{conversation.preferredLocation}</span>
              </div>
            )}
            {sessionStatus && (
              <div className={`flex items-center space-x-2 text-xs ${sessionStatus.color}`}>
                <Clock className="h-3 w-3" />
                <span>{sessionStatus.label}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assigned User Info */}
      {conversation.assignedTo && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center">
              <User className="h-3 w-3 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Atribuído a</p>
              <p className="text-sm font-medium text-gray-900">{conversation.assignedTo.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Criado {formatTimeAgo(conversation.createdAt)}
          </div>

          <div className="flex items-center space-x-2">
            {canAssign && !conversation.assignedToId && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors flex items-center space-x-1"
              >
                <UserCheck className="h-3 w-3" />
                <span>Assumir</span>
              </button>
            )}

            {canTransfer && (
              <button
                onClick={() => setShowTransferModal(true)}
                className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-orange-700 transition-colors flex items-center space-x-1"
              >
                <ArrowRight className="h-3 w-3" />
                <span>Transferir</span>
              </button>
            )}

            <button
              onClick={() => {
                const target = conversation.patient?.phone || (conversation as any).phone || conversation.id
                window.location.href = `/conversations/${target}`
              }}
              className="bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors flex items-center space-x-1"
            >
              <MessageSquare className="h-3 w-3" />
              <span>Visualizar</span>
            </button>

          </div>
        </div>
      </div>

      {/* Assign Confirmation Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assumir Conversa</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja assumir esta conversa? Ela será movida para "Minhas Conversas".
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAssign}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Assumir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transferir Conversa</h3>
            <p className="text-gray-600 mb-6">
              Esta conversa será transferida para outro atendente. Deseja continuar?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowTransferModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleTransfer}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Transferir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ConversationListProps {
  currentUserId?: string;
  onConversationSelect?: (conversationId: string) => void;
  selectedConversationId?: string;
}

const ConversationList: React.FC<ConversationListProps> = ({
  currentUserId,
  onConversationSelect,
  selectedConversationId
}) => {
  const { socket } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: 'ACTIVE',
    priority: 'all',
    search: '',
    assignedTo: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [activeQueue, setActiveQueue] = useState<'BOT_QUEUE' | 'PRINCIPAL' | 'EM_ATENDIMENTO' | 'MINHAS_CONVERSAS' | 'ENCERRADOS'>('BOT_QUEUE');

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filter.status !== 'all') params.append('status', filter.status);
      if (filter.priority !== 'all') params.append('priority', filter.priority);
      if (filter.search) params.append('search', filter.search);
      if (filter.assignedTo !== 'all') params.append('assignedTo', filter.assignedTo);

      const response = await api.get(`/api/conversations?${params.toString()}`);

      const mappedConversations = (response.data.conversations || []).map((conversation: any) => {
        const assignedUserObj = conversation.assignedTo || null;
        const assignedId = assignedUserObj?.id || conversation.assignedToId || undefined;

        return {
          ...conversation,
          status: conversation.status,
          assignedToId: assignedId,
          assignedTo: assignedUserObj || undefined
        } as Conversation;
      });

      setConversations(mappedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [filter]);

  useEffect(() => {
    if (!socket) return;

    const onQueueUpdated = (payload: any) => {
      const updated = payload?.conversation;
      if (!updated?.id) return;
      setConversations(prev => {
        const exists = prev.some(c => c.id === updated.id);
        const next = exists
          ? prev.map(c => c.id === updated.id ? {
            ...c,
            status: updated.status,
            assignedToId: updated.assignedToId,
            assignedTo: updated.assignedTo,
            lastMessage: updated.lastMessage ?? c.lastMessage,
            lastTimestamp: updated.updatedAt ?? c.lastTimestamp,
            patient: updated.patient ?? c.patient,
            updatedAt: updated.updatedAt ?? c.updatedAt,
          } : c)
          : [{
            id: updated.id,
            phone: updated.phone,
            status: updated.status,
            assignedToId: updated.assignedToId,
            assignedTo: updated.assignedTo,
            patient: updated.patient,
            lastMessage: updated.lastMessage,
            lastTimestamp: updated.updatedAt || updated.lastTimestamp,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
            priority: updated.priority,
            workflowId: updated.workflowId,
            currentWorkflowNode: updated.currentWorkflowNode,
            scheduledProcedures: updated.scheduledProcedures,
            preferredLocation: updated.preferredLocation,
            preferredDate: updated.preferredDate,
            preferredTime: updated.preferredTime,
            tags: updated.tags,
            notes: updated.notes,
            sessionExpiry: updated.sessionExpiry,
          }, ...prev];
        return next;
      });
    };

    const onConversationUpdated = (updated: any) => {
      if (!updated?.id) return;
      setConversations(prev => prev.map(c => c.id === updated.id ? {
        ...c,
        status: updated.status ?? c.status,
        assignedToId: updated.assignedToId ?? c.assignedToId,
        assignedTo: updated.assignedTo ?? c.assignedTo,
        lastMessage: updated.lastMessage ?? c.lastMessage,
        lastTimestamp: updated.updatedAt ?? c.lastTimestamp,
        patient: updated.patient ?? c.patient,
        updatedAt: updated.updatedAt ?? c.updatedAt,
      } : c));
    };

    socket.on('queue_updated', onQueueUpdated);
    socket.on('conversation_updated', onConversationUpdated);

    return () => {
      socket.off('queue_updated', onQueueUpdated);
      socket.off('conversation_updated', onConversationUpdated);
    };
  }, [socket]);

  const handleAssign = async (conversationId: string) => {
    try {
      // Find the conversation to get the phone number
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) {
        toast.error('Conversa não encontrada');
        return;
      }

      await api.post('/api/conversations/actions', {
        action: 'take',
        phone: conversation.phone,
        assignTo: currentUserId
      });
      toast.success('Conversa assumida com sucesso!');
      // Atualiza imediatamente o estado local para refletir a mudança
      setConversations(prev => prev.map(c =>
        c.id === conversationId
          ? { ...c, status: 'EM_ATENDIMENTO', assignedToId: currentUserId }
          : c
      ));
      // Mantém a fila atual para uma transição mais suave
    } catch (error) {
      console.error('Error assigning conversation:', error);
      toast.error('Erro ao assumir conversa');
    }
  };

  const handleTransfer = async (conversationId: string) => {
    // This would open a user selection modal in a real implementation
    toast.info('Funcionalidade de transferência em desenvolvimento');
  };

  const handleRequest = async (conversationId: string) => {
    try {
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) {
        toast.error('Conversa não encontrada');
        return;
      }
      await api.post(`/api/conversations/${conversationId}/request`, {
        notes: 'Solicitação de conversa pela fila principal'
      });
      toast.success('Solicitação enviada!');
      fetchConversations();
    } catch (error) {
      console.error('Error requesting conversation:', error);
      toast.error('Erro ao solicitar conversa');
    }
  };

  const handleViewHistory = (conversationId: string) => {
    if (onConversationSelect) onConversationSelect(conversationId);
  };

  const handlePriorityChange = async (conversationId: string, priority: string) => {
    try {
      await api.patch(`/api/conversations/${conversationId}`, { priority });
      toast.success('Prioridade atualizada com sucesso!');
      fetchConversations();
    } catch (error) {
      console.error('Error changing priority:', error);
      toast.error('Erro ao atualizar prioridade');
    }
  };

  const getConversationsByStatus = () => {
    const groups = {
      'BOT_QUEUE': conversations.filter(c => c.status === 'BOT_QUEUE'),
      'PRINCIPAL': conversations.filter(c =>
        c.status === 'PRINCIPAL' && !c.assignedToId
      ),
      'EM_ATENDIMENTO': conversations.filter(c =>
        c.status === 'EM_ATENDIMENTO' &&
        c.assignedToId &&
        c.assignedToId !== currentUserId
      ),
      'MINHAS_CONVERSAS': conversations.filter(c =>
        c.status === 'EM_ATENDIMENTO' &&
        (currentUserId ? c.assignedToId === currentUserId : true)
      ),
      'ENCERRADOS': conversations.filter(c => c.status === 'FECHADA')
    };

    return groups;
  };

  const getFilteredConversations = () => {
    return conversations.filter(conversation => {
      const matchesSearch = !filter.search ||
        (conversation.patient && (
          conversation.patient.name.toLowerCase().includes(filter.search.toLowerCase()) ||
          conversation.patient.phone.includes(filter.search) ||
          (conversation.patient.email && conversation.patient.email.toLowerCase().includes(filter.search.toLowerCase()))
        ));

      // Filtragem por fila
      let matchesQueue = false;
      if (activeQueue === 'MINHAS_CONVERSAS') {
        matchesQueue = conversation.status === 'EM_ATENDIMENTO' && (!currentUserId || conversation.assignedToId === currentUserId);
      } else if (activeQueue === 'PRINCIPAL') {
        matchesQueue = conversation.status === 'PRINCIPAL' && !conversation.assignedToId;
      } else if (activeQueue === 'EM_ATENDIMENTO') {
        matchesQueue = conversation.status === 'EM_ATENDIMENTO' && conversation.assignedToId && conversation.assignedToId !== currentUserId;
      } else if (activeQueue === 'BOT_QUEUE') {
        matchesQueue = conversation.status === 'BOT_QUEUE';
      } else if (activeQueue === 'ENCERRADOS') {
        matchesQueue = conversation.status === 'FECHADA';
      }

      const matchesPriority = filter.priority === 'all' || conversation.priority === filter.priority;
      const matchesAssignment = filter.assignedTo === 'all' ||
        (filter.assignedTo === 'unassigned' && !conversation.assignedToId) ||
        (filter.assignedTo === currentUserId && conversation.assignedToId === currentUserId);

      return matchesSearch && matchesQueue && matchesPriority && matchesAssignment;
    });
  };

  const conversationGroups = getConversationsByStatus();

  const getQueueCount = (key: 'BOT_QUEUE' | 'PRINCIPAL' | 'EM_ATENDIMENTO' | 'MINHAS_CONVERSAS' | 'ENCERRADOS') => {
    return conversationGroups[key as keyof typeof conversationGroups]?.length || 0;
  };

  const queueLabels = {
    'BOT_QUEUE': 'Fila do Bot',
    'PRINCIPAL': 'Aguardando',
    'EM_ATENDIMENTO': 'Em Atendimento',
    'MINHAS_CONVERSAS': 'Minhas Conversas',
    'ENCERRADOS': 'Encerrados'
  };

  const queueDescriptions = {
    'BOT_QUEUE': 'Conversas em atendimento automatizado',
    'PRINCIPAL': 'Conversas aguardando atendimento',
    'EM_ATENDIMENTO': 'Conversas sendo atendidas por outros',
    'MINHAS_CONVERSAS': 'Conversas que você está atendendo',
    'ENCERRADOS': 'Conversas finalizadas'
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Carregando conversas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar with Queues */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">Conversas</h1>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Compact Filters */}
          {showFilters && (
            <div className="mt-3 space-y-2">
              <select
                value={filter.priority}
                onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
              >
                <option value="all">Todas Prioridades</option>
                <option value="URGENT">Urgente</option>
                <option value="HIGH">Alta</option>
                <option value="MEDIUM">Média</option>
                <option value="LOW">Baixa</option>
              </select>
            </div>
          )}
        </div>

        {/* Queue Tabs */}
        <div className="p-2 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-1">
            {[
              { key: 'BOT_QUEUE', label: 'Bot', icon: Bot, color: 'blue' },
              { key: 'PRINCIPAL', label: 'Aguardando', icon: Clock, color: 'yellow' },
              { key: 'EM_ATENDIMENTO', label: 'Em Atend.', icon: Users, color: 'purple' },
              { key: 'MINHAS_CONVERSAS', label: 'Minhas', icon: UserCheck, color: 'green' },
              { key: 'ENCERRADOS', label: 'Encerrados', icon: Archive, color: 'gray' }
            ].map(({ key, label, icon: Icon, color }) => {
              const getQueueColorClasses = (queueColor: string, isActive: boolean) => {
                if (!isActive) return 'text-gray-600 hover:bg-gray-100';

                const colorMap = {
                  blue: 'bg-blue-100 text-blue-700 border border-blue-200',
                  yellow: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
                  purple: 'bg-purple-100 text-purple-700 border border-purple-200',
                  green: 'bg-green-100 text-green-700 border border-green-200',
                  gray: 'bg-gray-100 text-gray-700 border border-gray-200',
                };
                return colorMap[queueColor as keyof typeof colorMap] || colorMap.blue;
              };

              return (
                <button
                  key={key}
                  onClick={() => setActiveQueue(key as any)}
                  className={`flex items-center justify-center space-x-1 px-2 py-2 text-xs rounded-lg transition-colors ${getQueueColorClasses(color, activeQueue === key)}`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{label}</span>
                  <span className="bg-gray-200 text-gray-700 px-1 py-0.5 rounded-full text-xs">
                    {getQueueCount(key as any)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">Carregando...</span>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {activeQueue === 'PRINCIPAL' ? (
                <LayoutGroup>
                  {getFilteredConversations().filter(c => c.status === 'PRINCIPAL').map((conversation) => (
                    <motion.div
                      key={conversation.id}
                      layout
                      layoutId={conversation.id}
                      onClick={() => onConversationSelect?.(conversation.phone)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${(selectedConversationId === conversation.phone)
                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Phone className="h-4 w-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium text-gray-900 text-sm truncate">
                              {conversation.patient ? conversation.patient.name : `Paciente ${conversation.phone}`}
                            </h3>
                            <p className="text-xs text-gray-600">
                              {conversation.phone}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityConfig(conversation.priority).color
                            }`}>
                            {getPriorityConfig(conversation.priority).label}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(conversation.createdAt)}
                          </span>
                        </div>
                      </div>

                      {conversation.lastMessage && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-700 line-clamp-2">
                            {conversation.lastMessage}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusConfig(conversation.status).color
                          }`}>
                          {getStatusConfig(conversation.status).label}
                        </span>
                        {(conversation.status === 'PRINCIPAL' || conversation.status === 'BOT_QUEUE') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssign(conversation.id);
                            }}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                          >
                            Assumir
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {getFilteredConversations().filter(c => c.status === 'EM_ATENDIMENTO').length > 0 && (
                    <div className="flex items-center mt-4 mb-2">
                      <div className="flex-1 border-t border-gray-200" />
                      <span className="px-2 text-xs text-gray-500">Conversas assumidas</span>
                      <div className="flex-1 border-t border-gray-200" />
                    </div>
                  )}

                  {getFilteredConversations().filter(c => c.status === 'EM_ATENDIMENTO').map((conversation) => (
                    <motion.div
                      key={conversation.id}
                      layout
                      layoutId={conversation.id}
                      onClick={() => onConversationSelect?.(conversation.phone)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${(selectedConversationId === conversation.phone)
                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Phone className="h-4 w-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium text-gray-900 text-sm truncate">
                              {conversation.patient ? conversation.patient.name : `Paciente ${conversation.phone}`}
                            </h3>
                            <p className="text-xs text-gray-600">
                              {conversation.phone}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityConfig(conversation.priority).color
                            }`}>
                            {getPriorityConfig(conversation.priority).label}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(conversation.createdAt)}
                          </span>
                        </div>
                      </div>

                      {conversation.lastMessage && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-700 line-clamp-2">
                            {conversation.lastMessage}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusConfig(conversation.status).color
                          }`}>
                          {getStatusConfig(conversation.status).label}
                        </span>
                        {conversation.assignedToId && conversation.assignedToId !== currentUserId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRequest(conversation.id);
                            }}
                            className="text-xs bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700 transition-colors"
                          >
                            Solicitar conversa
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </LayoutGroup>
              ) : (
                <>
                  {getFilteredConversations().map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => onConversationSelect?.(conversation.phone)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${(selectedConversationId === conversation.phone)
                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Phone className="h-4 w-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium text-gray-900 text-sm truncate">
                              {conversation.patient ? conversation.patient.name : `Paciente ${conversation.phone}`}
                            </h3>
                            <p className="text-xs text-gray-600">
                              {conversation.phone}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityConfig(conversation.priority).color
                            }`}>
                            {getPriorityConfig(conversation.priority).label}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(conversation.createdAt)}
                          </span>
                        </div>
                      </div>

                      {conversation.lastMessage && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-700 line-clamp-2">
                            {conversation.lastMessage}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusConfig(conversation.status).color
                          }`}>
                          {getStatusConfig(conversation.status).label}
                        </span>
                        {conversation.assignedToId === currentUserId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `/conversations/${conversation.phone}`;
                            }}
                            className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition-colors"
                          >
                            Abrir
                          </button>
                        )}
                        {(conversation.status === 'PRINCIPAL' || conversation.status === 'BOT_QUEUE') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssign(conversation.id);
                            }}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                          >
                            Assumir
                          </button>
                        )}
                        {conversation.assignedToId && conversation.assignedToId !== currentUserId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRequest(conversation.id);
                            }}
                            className="text-xs bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700 transition-colors"
                          >
                            Solicitar conversa
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {getFilteredConversations().length === 0 && (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {activeQueue === 'MINHAS_CONVERSAS'
                      ? 'Você não tem conversas atribuídas'
                      : 'Nenhuma conversa nesta fila'
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { ConversationList };
export default ConversationList;
