import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, isAfter, addSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Phone,
  Calendar,
  FileText,
  MapPin,
  CreditCard,
  UserPlus,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Timer,
  Settings,
  Filter,
  Search,
  RefreshCw,
  Bell,
  BellOff,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Tag,
  Star,
  StarOff,
  Loader2,
} from 'lucide-react';
import { useConversationStore, Conversation, ConversationFilters } from '../stores/conversationStore';
import { useAuthStore } from '../stores/authStore';
import { intelligentBotService } from '../services/intelligentBot';
import { AppointmentBooking } from './AppointmentBooking';
import { WorkflowTrigger } from './WorkflowTrigger';

interface ConversationQueueManagerProps {
  userId: string;
  userRole: string;
  className?: string;
}

interface QueueSection {
  id: string;
  title: string;
  description: string;
  queue: 'bot' | 'principal' | 'my-conversations';
  icon: React.ReactNode;
  color: string;
  showTransferActions: boolean;
}

const QUEUE_SECTIONS: QueueSection[] = [
  {
    id: 'bot',
    title: 'Bot',
    description: 'Conversas sendo atendidas pelo bot inteligente',
    queue: 'bot',
    icon: <MessageSquare className="w-5 h-5" />,
    color: 'blue',
    showTransferActions: false,
  },
  {
    id: 'principal',
    title: 'Principal',
    description: 'Conversas aguardando atendimento humano',
    queue: 'principal',
    icon: <User className="w-5 h-5" />,
    color: 'orange',
    showTransferActions: true,
  },
  {
    id: 'my-conversations',
    title: 'Minhas Conversas',
    description: 'Conversas atribuídas a você',
    queue: 'my-conversations',
    icon: <UserCheck className="w-5 h-5" />,
    color: 'green',
    showTransferActions: true,
  },
];

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const STATUS_COLORS = {
  bot: 'bg-blue-100 text-blue-700',
  principal: 'bg-orange-100 text-orange-700',
  assigned: 'bg-green-100 text-green-700',
  transferred: 'bg-purple-100 text-purple-700',
  completed: 'bg-gray-100 text-gray-700',
  expired: 'bg-red-100 text-red-700',
};

export const ConversationQueueManager: React.FC<ConversationQueueManagerProps> = ({
  userId,
  userRole,
  className = '',
}) => {
  const queryClient = useQueryClient();
  const [selectedQueue, setSelectedQueue] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showAppointmentBooking, setShowAppointmentBooking] = useState(false);
  const [showWorkflowTrigger, setShowWorkflowTrigger] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['bot', 'principal', 'my-conversations']));
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  const {
    conversations,
    filters,
    setFilters,
    clearFilters,
    getBotQueue,
    getPrincipalQueue,
    getMyConversations,
    getFilteredConversations,
    getConversationStats,
    assignConversation,
    transferConversation,
    updateQueue,
    setPriority,
    addTag,
    removeTag,
    markAsRead,
    addAssignmentRequest,
  } = useConversationStore();

  // Auto-refresh conversations
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, queryClient]);

  // Get conversation queues
  const botQueue = getBotQueue();
  const principalQueue = getPrincipalQueue();
  const myConversations = getMyConversations(userId);
  const filteredConversations = getFilteredConversations();
  const stats = getConversationStats();

  // Update filters based on search and selection
  useEffect(() => {
    const newFilters: ConversationFilters = {
      ...filters,
      searchQuery: searchQuery || undefined,
    };

    if (selectedQueue !== 'all') {
      newFilters.queue = [selectedQueue as Conversation['queue']];
    }

    setFilters(newFilters);
  }, [searchQuery, selectedQueue, setFilters]);

  // Assign conversation mutation
  const assignConversationMutation = useMutation({
    mutationFn: async ({ conversation, assignee }: { conversation: Conversation; assignee: Conversation['assignedTo'] }) => {
      const response = await fetch(`/api/conversations/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'take', phone: conversation.patientPhone }),
      });
      if (!response.ok) throw new Error('Failed to assign conversation');
      return response.json();
    },
    onSuccess: (_data, variables) => {
      assignConversation(variables.conversation.id, variables.assignee);
      intelligentBotService.sendMessage({
        conversationId: variables.conversation.id,
        message: `Conversa atribuída a ${variables.assignee?.name || 'você'}`,
        context: { assignment: { assignee: variables.assignee } },
      });
    },
    onError: (error) => {
      console.error('Erro ao atribuir conversa', error);
    },
  });

  // Transfer conversation mutation
  const transferConversationMutation = useMutation({
    mutationFn: async ({ conversation, newAssignee, reason }: { conversation: Conversation; newAssignee: Conversation['assignedTo'] | null; reason?: string }) => {
      const payload = newAssignee
        ? { action: 'transfer', phone: conversation.patientPhone, assignTo: newAssignee.id }
        : { action: 'return', phone: conversation.patientPhone };
      const response = await fetch(`/api/conversations/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to transfer conversation');
      return response.json();
    },
    onSuccess: (_data, variables) => {
      if (variables.newAssignee) {
        transferConversation(variables.conversation.id, variables.newAssignee);
        intelligentBotService.sendMessage({
          conversationId: variables.conversation.id,
          message: `Conversa transferida para ${variables.newAssignee.name}${variables.reason ? `: ${variables.reason}` : ''}`,
          context: { transfer: { to: variables.newAssignee } },
        });
      } else {
        updateQueue(variables.conversation.id, 'principal');
        intelligentBotService.sendMessage({
          conversationId: variables.conversation.id,
          message: 'Conversa devolvida para a fila principal',
        });
      }
    },
    onError: (error) => {
      console.error('Erro ao transferir/devolver conversa', error);
    },
  });

  // Update priority mutation
  const updatePriorityMutation = useMutation({
    mutationFn: async ({ conversationId, priority }: { conversationId: string; priority: Conversation['priority'] }) => {
      return { conversationId, priority };
    },
    onSuccess: (data) => {
      setPriority(data.conversationId, data.priority);
      console.debug('Priority updated locally', data);
    },
  });

  // Request assignment mutation
  const requestAssignmentMutation = useMutation({
    mutationFn: async ({ conversationId, notes }: { conversationId: string; notes?: string }) => {
      const response = await fetch(`/api/conversations/${conversationId}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) throw new Error('Failed to request conversation');
      return response.json();
    },
    onSuccess: (_data, variables) => {
      addAssignmentRequest(variables.conversationId, {
        userId: userId,
        userName: 'Você',
        timestamp: new Date(),
        status: 'pending',
      });
      intelligentBotService.sendMessage({
        conversationId: variables.conversationId,
        message: 'Solicitação de conversa enviada',
        context: { request: { requestedBy: userId } },
      });
    },
    onError: (error) => {
      console.error('Erro ao solicitar conversa', error);
    },
  });

  // Add tag mutation
  const addTagMutation = useMutation({
    mutationFn: async ({ conversationId, tag }: { conversationId: string; tag: string }) => {
      const response = await fetch(`/api/conversations/${conversationId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag }),
      });
      if (!response.ok) throw new Error('Failed to add tag');
      return response.json();
    },
    onSuccess: (data) => {
      addTag(data.conversationId, data.tag);
    },
  });

  // Remove tag mutation
  const removeTagMutation = useMutation({
    mutationFn: async ({ conversationId, tag }: { conversationId: string; tag: string }) => {
      const response = await fetch(`/api/conversations/${conversationId}/tags/${tag}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to remove tag');
      return response.json();
    },
    onSuccess: (data) => {
      removeTag(data.conversationId, data.tag);
    },
  });

  // Handle conversation assignment
  const handleAssignConversation = useCallback(async (conversation: Conversation) => {
    const currentUser = { id: userId, name: 'Você', role: userRole };
    await assignConversationMutation.mutateAsync({ conversation, assignee: currentUser });
    setSelectedConversation(conversation);
    markAsRead(conversation.id);
  }, [userId, userRole, assignConversationMutation, markAsRead]);

  // Handle conversation transfer
  const handleTransferConversation = useCallback(async (conversation: Conversation, newAssignee: Conversation['assignedTo'] | null, reason?: string) => {
    await transferConversationMutation.mutateAsync({ conversation, newAssignee, reason });
  }, [transferConversationMutation]);

  // Handle priority update
  const handlePriorityUpdate = useCallback(async (conversation: Conversation, priority: Conversation['priority']) => {
    await updatePriorityMutation.mutateAsync({
      conversationId: conversation.id,
      priority,
    });
  }, [updatePriorityMutation]);

  // Handle tag management
  const handleAddTag = useCallback(async (conversation: Conversation, tag: string) => {
    await addTagMutation.mutateAsync({
      conversationId: conversation.id,
      tag,
    });
  }, [addTagMutation]);

  const handleRemoveTag = useCallback(async (conversation: Conversation, tag: string) => {
    await removeTagMutation.mutateAsync({
      conversationId: conversation.id,
      tag,
    });
  }, [removeTagMutation]);

  const handleRequestAssignment = useCallback(async (conversation: Conversation) => {
    await requestAssignmentMutation.mutateAsync({
      conversationId: conversation.id,
      notes: 'Solicitação via card de conversa',
    });
  }, [requestAssignmentMutation]);

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Get timeout countdown for principal queue conversations
  const getTimeoutCountdown = (conversation: Conversation) => {
    if (conversation.status !== 'principal' || conversation.assignedTo) return null;
    
    const timeInQueue = Date.now() - new Date(conversation.updatedAt).getTime();
    const timeoutDuration = 30000; // 30 seconds
    const remainingTime = timeoutDuration - timeInQueue;
    
    if (remainingTime <= 0) return null;
    
    return Math.ceil(remainingTime / 1000);
  };

  // Render conversation card
  const renderConversationCard = (conversation: Conversation, showTransferActions: boolean) => {
    const timeoutCountdown = getTimeoutCountdown(conversation);
    const isSelected = selectedConversation?.id === conversation.id;
    const isAssignedToMe = conversation.assignedTo?.id === userId;
    
    return (
      <motion.div
        key={conversation.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`bg-white border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
        }`}
        onClick={() => {
          setSelectedConversation(conversation);
          markAsRead(conversation.id);
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {conversation.patientName}
                </h4>
                {conversation.metadata?.isNewPatient && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Novo
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 flex items-center">
                <Phone className="w-3 h-3 mr-1" />
                {conversation.patientPhone}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              PRIORITY_COLORS[conversation.priority]
            }`}>
              {conversation.priority === 'urgent' && <AlertTriangle className="w-3 h-3 mr-1" />}
              {conversation.priority === 'high' && <ChevronUp className="w-3 h-3 mr-1" />}
              {conversation.priority === 'low' && <ChevronDown className="w-3 h-3 mr-1" />}
              {conversation.priority === 'medium' && <span className="w-3 h-3 mr-1 rounded-full bg-yellow-500" />}
              {conversation.priority}
            </span>
            
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              STATUS_COLORS[conversation.status]
            }`}>
              {conversation.status}
            </span>
          </div>
        </div>

        {/* Timeout countdown for principal queue */}
        {timeoutCountdown && (
          <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center text-sm text-orange-700">
              <Timer className="w-4 h-4 mr-2" />
              <span className="font-medium">
                Tempo esgotando: {timeoutCountdown}s
              </span>
            </div>
          </div>
        )}

        {/* Last message preview */}
        {conversation.lastMessage && (
          <div className="mb-3">
            <p className="text-sm text-gray-600 line-clamp-2">
              {conversation.lastMessage.content}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {formatDistanceToNow(conversation.lastMessage.timestamp, { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </p>
          </div>
        )}

        {/* Tags */}
        {conversation.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {conversation.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
              >
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Assigned to */}
        {conversation.assignedTo && (
          <div className="mb-3 flex items-center text-sm text-gray-600">
            <UserCheck className="w-4 h-4 mr-2" />
            <span>Atribuído a: {conversation.assignedTo.name}</span>
          </div>
        )}

        {/* Appointment info */}
        {conversation.lastAppointment && (
          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center text-sm text-blue-700">
              <Calendar className="w-4 h-4 mr-2" />
              <span>
                Agendamento: {format(new Date(conversation.lastAppointment.scheduledDate), 'dd/MM/yyyy')} 
                às {conversation.lastAppointment.timeSlot}
              </span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {showTransferActions && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              {(conversation.queue === 'principal' || conversation.queue === 'bot') && conversation.status !== 'assigned' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAssignConversation(conversation);
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-blue-700 text-xs font-medium rounded-md hover:bg-blue-50 transition-colors"
                  disabled={assignConversationMutation.isPending}
                >
                  {assignConversationMutation.isPending ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <UserPlus className="w-3 h-3 mr-1" />
                  )}
                  Atribuir a mim
                </button>
              )}

              {conversation.status === 'assigned' && !isAssignedToMe && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRequestAssignment(conversation);
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-orange-300 text-orange-700 text-xs font-medium rounded-md hover:bg-orange-50 transition-colors"
                  disabled={requestAssignmentMutation.isPending}
                >
                  {requestAssignmentMutation.isPending ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <ArrowRight className="w-3 h-3 mr-1" />
                  )}
                  Solicitar conversa
                </button>
              )}

              {isAssignedToMe && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedConversation(conversation);
                      // Show transfer dialog
                    }}
                    className="inline-flex items-center px-3 py-1.5 border border-purple-300 text-purple-700 text-xs font-medium rounded-md hover:bg-purple-50 transition-colors"
                    disabled={transferConversationMutation.isPending}
                  >
                    {transferConversationMutation.isPending ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3 h-3 mr-1" />
                    )}
                    Transferir
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTransferConversation(conversation, null, 'Devolvendo para fila principal');
                    }}
                    className="inline-flex items-center px-3 py-1.5 border border-orange-300 text-orange-700 text-xs font-medium rounded-md hover:bg-orange-50 transition-colors"
                    disabled={transferConversationMutation.isPending}
                  >
                    {transferConversationMutation.isPending ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3 h-3 mr-1" />
                    )}
                    Devolver
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePriorityUpdate(conversation, conversation.priority === 'urgent' ? 'high' : 'urgent');
                }}
                className={`p-1 rounded-md hover:bg-gray-100 transition-colors ${
                  conversation.priority === 'urgent' ? 'text-yellow-500' : 'text-gray-400'
                }`}
                title={conversation.priority === 'urgent' ? 'Remover urgência' : 'Marcar como urgente'}
              >
                {conversation.priority === 'urgent' ? (
                  <Star className="w-4 h-4" />
                ) : (
                  <StarOff className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedConversation(conversation);
                  setShowAppointmentBooking(true);
                }}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors text-gray-400"
                title="Agendar consulta"
              >
                <Calendar className="w-4 h-4" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedConversation(conversation);
                  setShowWorkflowTrigger(true);
                }}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors text-gray-400"
                title="Disparar workflow"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  // Render queue section
  const renderQueueSection = (section: QueueSection) => {
    const isExpanded = expandedSections.has(section.id);
    const conversations = section.queue === 'bot' ? botQueue :
                        section.queue === 'principal' ? principalQueue :
                        myConversations;

    return (
      <div key={section.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={() => toggleSection(section.id)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-${section.color}-100`}>
              <div className={`text-${section.color}-600`}>
                {section.icon}
              </div>
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
              <p className="text-sm text-gray-600">{section.description}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{conversations.length}</p>
              <p className="text-sm text-gray-600">conversas</p>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-gray-200"
            >
              <div className="p-6">
                {conversations.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      {section.icon}
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conversa</h4>
                    <p className="text-gray-600">
                      {section.queue === 'bot' && 'Todas as conversas estão sendo atendidas pelo bot'}
                      {section.queue === 'principal' && 'Nenhuma conversa aguardando atendimento'}
                      {section.queue === 'my-conversations' && 'Você não tem conversas atribuídas no momento'}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {conversations.map((conversation) =>
                      renderConversationCard(conversation, section.showTransferActions)
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Filas</h1>
              <p className="text-sm text-gray-600 mt-1">
                Gerencie conversas e atribua atendimentos
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Auto-refresh toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`p-2 rounded-md transition-colors ${
                    autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}
                  title={autoRefresh ? 'Auto-atualização ativada' : 'Auto-atualização desativada'}
                >
                  {autoRefresh ? <RefreshCw className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </button>
                
                {autoRefresh && (
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1"
                  >
                    <option value={1000}>1s</option>
                    <option value={5000}>5s</option>
                    <option value={10000}>10s</option>
                    <option value={30000}>30s</option>
                  </select>
                )}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar conversas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Filters toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-4 py-2 border rounded-lg transition-colors ${
                  showFilters
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-blue-600">{stats.byQueue.bot}</div>
            <div className="text-sm text-gray-600">Bot</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-orange-600">{stats.byQueue.principal}</div>
            <div className="text-sm text-gray-600">Principal</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-green-600">{stats.byQueue['my-conversations']}</div>
            <div className="text-sm text-gray-600">Minhas</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-red-600">{stats.urgentCount}</div>
            <div className="text-sm text-gray-600">Urgentes</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-gray-600">{stats.expiredCount}</div>
            <div className="text-sm text-gray-600">Expiradas</div>
          </div>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Status filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="space-y-2">
                  {['bot', 'principal', 'assigned', 'transferred', 'completed', 'expired'].map((status) => (
                    <label key={status} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.status?.includes(status as Conversation['status']) || false}
                        onChange={(e) => {
                          const newStatus = e.target.checked
                            ? [...(filters.status || []), status as Conversation['status']]
                            : filters.status?.filter(s => s !== status);
                          setFilters({ ...filters, status: newStatus });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Priority filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
                <div className="space-y-2">
                  {['low', 'medium', 'high', 'urgent'].map((priority) => (
                    <label key={priority} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.priority?.includes(priority as Conversation['priority']) || false}
                        onChange={(e) => {
                          const newPriority = e.target.checked
                            ? [...(filters.priority || []), priority as Conversation['priority']]
                            : filters.priority?.filter(p => p !== priority);
                          setFilters({ ...filters, priority: newPriority });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{priority}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Queue filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fila</label>
                <div className="space-y-2">
                  {['bot', 'principal', 'my-conversations'].map((queue) => (
                    <label key={queue} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.queue?.includes(queue as Conversation['queue']) || false}
                        onChange={(e) => {
                          const newQueue = e.target.checked
                            ? [...(filters.queue || []), queue as Conversation['queue']]
                            : filters.queue?.filter(q => q !== queue);
                          setFilters({ ...filters, queue: newQueue });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {queue === 'my-conversations' ? 'Minhas Conversas' : queue}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Clear filters */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Queue sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="space-y-6">
          {QUEUE_SECTIONS.map(renderQueueSection)}
        </div>
      </div>

      {/* Appointment booking modal */}
      {showAppointmentBooking && selectedConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Agendar Consulta - {selectedConversation.patientName}
                </h2>
                <button
                  onClick={() => setShowAppointmentBooking(false)}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <AppointmentBooking
                conversationId={selectedConversation.id}
                onComplete={(appointment) => {
                  setShowAppointmentBooking(false);
                  setSelectedConversation(null);
                }}
                onCancel={() => {
                  setShowAppointmentBooking(false);
                  setSelectedConversation(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Workflow trigger modal */}
      {showWorkflowTrigger && selectedConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Disparar Workflow - {selectedConversation.patientName}
                </h2>
                <button
                  onClick={() => setShowWorkflowTrigger(false)}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <WorkflowTrigger
                conversationId={selectedConversation.id}
                phone={selectedConversation.patientPhone}
                patientInfo={{
                  name: selectedConversation.patientName,
                  phone: selectedConversation.patientPhone,
                  isNewPatient: selectedConversation.metadata?.isNewPatient,
                }}
                onComplete={() => {
                  setShowWorkflowTrigger(false);
                  setSelectedConversation(null);
                }}
                onCancel={() => {
                  setShowWorkflowTrigger(false);
                  setSelectedConversation(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};