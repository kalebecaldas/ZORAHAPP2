import React, { useState, useEffect } from 'react';
import { X, Clock, MessageSquare, User, Calendar, Shield, Trash2, Eye, Copy } from 'lucide-react';
import { api } from '../lib/utils';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface ConversationHistoryModalProps {
  patientId?: string;
  patientPhone?: string;
  patientName?: string;
  onClose: () => void;
}

interface ConversationSession {
  id: string;
  phone: string;
  status: string;
  sessionStartTime: string | null;
  sessionExpiryTime: string | null;
  sessionStatus: string;
  lastUserActivity: string | null;
  lastMessage: string;
  lastTimestamp: string;
  channel: string;
  messagesCount?: number;
  messages?: any[];
  createdAt: string;
  assignedTo?: {
    name: string;
  };
}

const ConversationHistoryModal: React.FC<ConversationHistoryModalProps> = ({
  patientId,
  patientPhone,
  patientName,
  onClose
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationSession[]>([]);
  const [patient, setPatient] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Verificar se usuário é master (role pode ser string, então usar comparação flexível)
  const isMaster = String(user?.role) === 'MASTER';

  useEffect(() => {
    fetchHistory();
  }, [patientId, patientPhone]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      
      if (patientId) {
        // Buscar por ID do paciente
        try {
          const response = await api.get(`/api/patients/${patientId}`);
          setPatient(response.data);
          setConversations(response.data.conversations || []);
        } catch (err: any) {
          // Se não encontrar por ID, tentar por telefone
          if (err.response?.status === 404 && patientPhone) {
            console.log('Patient not found by ID, trying by phone:', patientPhone);
            await fetchByPhone();
          } else {
            throw err;
          }
        }
      } else if (patientPhone) {
        await fetchByPhone();
      }
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      toast.error('Erro ao buscar histórico de conversas');
    } finally {
      setLoading(false);
    }
  };

  const fetchByPhone = async () => {
    if (!patientPhone) return;
    
    try {
      // Buscar todas as conversas por telefone
      const response = await api.get('/api/conversations', {
        params: {
          search: patientPhone,
          includeHistory: true
        }
      });
      const convs = response.data.conversations || [];
      setConversations(convs.filter((c: any) => c.phone === patientPhone));
      
      // Tentar buscar dados do paciente
      if (convs.length > 0 && convs[0].patient) {
        setPatient(convs[0].patient);
      } else {
        // Se não tiver paciente associado, criar um objeto básico
        setPatient({
          id: null,
          name: patientName || `Paciente ${patientPhone.slice(-4)}`,
          phone: patientPhone
        });
      }
    } catch (error) {
      console.error('Error fetching by phone:', error);
      throw error;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSessionStatus = (session: ConversationSession) => {
    if (!session.sessionExpiryTime) return { label: 'Sem sessão', color: 'gray' };
    
    const now = new Date();
    const expiry = new Date(session.sessionExpiryTime);
    
    if (expiry < now) {
      return { label: 'Expirada', color: 'red' };
    }
    
    const timeRemaining = expiry.getTime() - now.getTime();
    const hoursRemaining = timeRemaining / (1000 * 60 * 60);
    
    if (hoursRemaining < 1) {
      return { label: `${Math.round(hoursRemaining * 60)}min`, color: 'yellow' };
    }
    
    return { label: `${Math.round(hoursRemaining)}h restante`, color: 'green' };
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      BOT_QUEUE: 'bg-blue-100 text-blue-700',
      PRINCIPAL: 'bg-orange-100 text-orange-700',
      EM_ATENDIMENTO: 'bg-green-100 text-green-700',
      FECHADA: 'bg-gray-100 text-gray-700',
      MINHAS_CONVERSAS: 'bg-purple-100 text-purple-700'
    };
    
    const labels = {
      BOT_QUEUE: 'Bot',
      PRINCIPAL: 'Aguardando',
      EM_ATENDIMENTO: 'Em Atendimento',
      FECHADA: 'Encerrada',
      MINHAS_CONVERSAS: 'Atendimento'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getChannelIcon = (channel: string) => {
    if (channel === 'whatsapp') {
      return (
        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      );
    }
    return null;
  };

  const handleDeleteSession = async (conversationId: string) => {
    if (!isMaster) {
      toast.error('Apenas usuários Master podem deletar sessões');
      return;
    }

    if (!window.confirm('Tem certeza que deseja deletar esta sessão? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setDeletingId(conversationId);
      await api.delete(`/api/conversations/id/${conversationId}`);
      toast.success('Sessão deletada com sucesso');
      // Recarregar histórico
      await fetchHistory();
    } catch (error: any) {
      console.error('Error deleting session:', error);
      toast.error(error?.response?.data?.error || 'Erro ao deletar sessão');
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewConversation = (conversationId: string, conversationPhone: string) => {
    // ✅ Navegar usando o ID da conversa para abrir a conversa específica (não apenas a mais recente)
    navigate(`/conversations/${conversationPhone}?conversationId=${conversationId}`);
    onClose(); // Fechar modal ao navegar
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Histórico de Conversas
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {patientName || patient?.name || patientPhone || 'Paciente'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {conversations.map((conv) => {
                const sessionStatus = getSessionStatus(conv);
                return (
                  <div
                    key={conv.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    {/* Header da conversa */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        {getChannelIcon(conv.channel)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">
                              {formatDate(conv.createdAt)}
                            </span>
                            {getStatusBadge(conv.status)}
                            {/* ✅ ID da sessão - COMPLETO e COPIÁVEL */}
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 rounded text-xs">
                              <span className="text-gray-600 font-medium">ID:</span>
                              <span className="text-gray-800 font-mono">{conv.id}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(conv.id, 'ID da sessão');
                                }}
                                className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                                title="Copiar ID completo"
                              >
                                <Copy className="h-3 w-3 text-gray-500 hover:text-gray-700" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {conv.messagesCount || conv.messages?.length || 0} mensagens
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Session status */}
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                          sessionStatus.color === 'green' ? 'bg-green-50 border border-green-200' :
                          sessionStatus.color === 'yellow' ? 'bg-yellow-50 border border-yellow-200' :
                          sessionStatus.color === 'red' ? 'bg-red-50 border border-red-200' :
                          'bg-gray-50 border border-gray-200'
                        }`}>
                          <Shield className={`h-4 w-4 ${
                            sessionStatus.color === 'green' ? 'text-green-600' :
                            sessionStatus.color === 'yellow' ? 'text-yellow-600' :
                            sessionStatus.color === 'red' ? 'text-red-600' :
                            'text-gray-400'
                          }`} />
                          <span className={`text-xs font-medium ${
                            sessionStatus.color === 'green' ? 'text-green-700' :
                            sessionStatus.color === 'yellow' ? 'text-yellow-700' :
                            sessionStatus.color === 'red' ? 'text-red-700' :
                            'text-gray-500'
                          }`}>
                            {sessionStatus.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Última mensagem */}
                    {conv.lastMessage && (
                      <div className="bg-gray-50 rounded-md p-3 mb-3">
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {conv.lastMessage}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(conv.lastTimestamp)}
                        </p>
                      </div>
                    )}

                    {/* Informações adicionais */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {conv.sessionStartTime && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Início: {formatDate(conv.sessionStartTime)}</span>
                          </div>
                        )}
                        {conv.lastUserActivity && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Última atividade: {formatDate(conv.lastUserActivity)}</span>
                          </div>
                        )}
                        {conv.assignedTo && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{conv.assignedTo.name}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* ✅ Botões de ação */}
                      <div className="flex items-center gap-2">
                        {/* Botão Visualizar Conversa */}
                        <button
                          onClick={() => handleViewConversation(conv.id, conv.phone)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                          title="Visualizar conversa"
                        >
                          <Eye className="h-4 w-4" />
                          Visualizar
                        </button>
                        
                        {/* Botão DELETE SESSÃO (apenas para Master) */}
                        {isMaster && (
                          <button
                            onClick={() => handleDeleteSession(conv.id)}
                            disabled={deletingId === conv.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Deletar sessão (apenas Master)"
                          >
                            {deletingId === conv.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700"></div>
                                Deletando...
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4" />
                                Deletar
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Total: <span className="font-medium">{conversations.length}</span> conversa{conversations.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationHistoryModal;

