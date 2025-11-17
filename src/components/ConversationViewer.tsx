import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Phone, 
  User, 
  Calendar, 
  MapPin, 
  FileText, 
  Paperclip,
  Clock,
  AlertCircle,
  CheckCircle,
  MoreVertical,
  ArrowLeft,
  UserCheck,
  Star,
  Tag,
  History,
  MessageSquare
} from 'lucide-react';
import { api } from '../lib/utils';
import { toast } from 'sonner';

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
  attachments?: Array<{
    id: string;
    filename: string;
    type: string;
    url: string;
  }>;
}

interface Conversation {
  id: string;
  patientPhone: string;
  status: 'BOT' | 'BOT_QUEUE' | 'PRINCIPAL' | 'HUMAN' | 'MINHAS_CONVERSAS' | 'CLOSED' | 'HISTORY';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedTo?: string;
  assignedUser?: User;
  patient: Patient;
  workflowId?: string;
  currentWorkflowNode?: string;
  scheduledProcedures?: string[];
  preferredLocation?: string;
  preferredDate?: string;
  preferredTime?: string;
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  sessionExpiry?: string;
}

interface ConversationViewerProps {
  conversationId: string;
  currentUserId: string;
  onBack?: () => void;
}

const ConversationViewer: React.FC<ConversationViewerProps> = ({
  conversationId,
  currentUserId,
  onBack
}) => {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showPatientInfo, setShowPatientInfo] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchConversation = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/conversations/${conversationId}`);
      const c = response.data.conversation || response.data;
      const mapped: Conversation = {
        id: c.id,
        patientPhone: c.phone || c.patient?.phone,
        status: ((s => {
          if (s === 'EM_ATENDIMENTO') return 'HUMAN';
          if (s === 'BOT_QUEUE') return 'BOT_QUEUE';
          if (s === 'FECHADA') return 'CLOSED';
          if (s === 'PRINCIPAL') return 'PRINCIPAL';
          return s || 'PRINCIPAL';
        })(c.status)) as Conversation['status'],
        priority: (c.priority || 'LOW') as Conversation['priority'],
        assignedTo: c.assignedTo?.id || c.assignedToId || undefined,
        assignedUser: c.assignedTo || c.assignedUser,
        patient: {
          id: c.patient?.id || '',
          name: c.patient?.name || c.phone,
          phone: c.patient?.phone || c.phone,
          email: c.patient?.email,
          insuranceCompany: c.patient?.insuranceCompany,
          avatar: c.patient?.avatar,
        },
        workflowId: c.workflowId,
        currentWorkflowNode: c.currentWorkflowNode,
        scheduledProcedures: c.scheduledProcedures || [],
        preferredLocation: c.preferredLocation,
        preferredDate: c.preferredDate,
        preferredTime: c.preferredTime,
        tags: c.tags || [],
        notes: c.notes,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messages: c.messages || [],
        sessionExpiry: c.sessionExpiry,
      };
      setConversation(mapped);
      setNotes(mapped.notes || '');
    } catch (error) {
      console.error('Error fetching conversation:', error);
      toast.error('Erro ao carregar conversa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversation();
    const interval = setInterval(fetchConversation, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const sendMessage = async () => {
    if (!message.trim() || !conversation) return;

    try {
      setSending(true);
      await api.post(`/api/conversations/${conversationId}/messages`, {
        message,
        sender: 'AGENT'
      });
      setMessage('');
      fetchConversation();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const updateNotes = async () => {
    if (!conversation) return;

    try {
      await api.patch(`/api/conversations/${conversationId}`, { notes });
      toast.success('Notas atualizadas com sucesso!');
      setShowNotes(false);
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error('Erro ao atualizar notas');
    }
  };

  const transferConversation = async () => {
    if (!conversation) return;

    try {
      await api.post(`/api/conversations/${conversationId}/transfer`, {
        fromUserId: currentUserId
      });
      toast.success('Conversa transferida com sucesso!');
      onBack?.();
    } catch (error) {
      console.error('Error transferring conversation:', error);
      toast.error('Erro ao transferir conversa');
    }
  };

  const closeConversation = async () => {
    if (!conversation) return;

    if (confirm('Tem certeza que deseja fechar esta conversa?')) {
      try {
        await api.patch(`/api/conversations/${conversationId}`, { status: 'CLOSED' });
        toast.success('Conversa fechada com sucesso!');
        onBack?.();
      } catch (error) {
        console.error('Error closing conversation:', error);
        toast.error('Erro ao fechar conversa');
      }
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'URGENT': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Carregando conversa...</span>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Conversa não encontrada</h3>
          <p className="text-gray-600">Esta conversa pode ter sido excluída ou não existe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">{conversation.patient.name}</h2>
                <p className="text-sm text-gray-600">{conversation.patient.phone}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(conversation.priority)}`}>
              {conversation.priority === 'URGENT' && <AlertCircle className="h-3 w-3 mr-1" />}
              {conversation.priority}
            </span>
            
            {conversation.assignedTo === currentUserId && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                <UserCheck className="h-3 w-3 mr-1" />
                Minha Conversa
              </span>
            )}

            <div className="relative">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Patient Info Bar */}
        <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-gray-100">
          {conversation.patient.insuranceCompany && (
            <div className="flex items-center space-x-1 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>{conversation.patient.insuranceCompany}</span>
            </div>
          )}
          
          {conversation.preferredLocation && (
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{conversation.preferredLocation}</span>
            </div>
          )}
          
          {conversation.preferredDate && (
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{new Date(conversation.preferredDate).toLocaleDateString('pt-BR')}</span>
            </div>
          )}
          
          <button
            onClick={() => setShowPatientInfo(!showPatientInfo)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showPatientInfo ? 'Ocultar' : 'Ver'} Informações
          </button>
        </div>
      </div>

      {/* Patient Info Panel */}
      {showPatientInfo && (
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Paciente</h4>
              <p className="text-sm text-gray-900">{conversation.patient.name}</p>
              <p className="text-xs text-gray-600">{conversation.patient.phone}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Email</h4>
              <p className="text-sm text-gray-900">{conversation.patient.email || 'Não informado'}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Convênio</h4>
              <p className="text-sm text-gray-900">{conversation.patient.insuranceCompany || 'Não informado'}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Sessão</h4>
              <p className="text-xs text-gray-600">
                {conversation.sessionExpiry 
                  ? `Expira em ${new Date(conversation.sessionExpiry).toLocaleDateString('pt-BR')}`
                  : 'Sem expiração'
                }
              </p>
            </div>
          </div>
          
          {conversation.scheduledProcedures && conversation.scheduledProcedures.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Procedimentos Agendados</h4>
              <div className="flex flex-wrap gap-2">
                {conversation.scheduledProcedures.map((procedure, index) => (
                  <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                    {procedure}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-4">
          {conversation.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === 'USER' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender === 'USER'
                    ? 'bg-blue-600 text-white'
                    : message.sender === 'BOT'
                    ? 'bg-gray-200 text-gray-900'
                    : 'bg-green-100 text-green-900'
                }`}
              >
                <p className="text-sm">{message.messageText}</p>
                <p className={`text-xs mt-1 ${
                  message.sender === 'USER' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {formatTime(message.createdAt)}
                </p>
                
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center space-x-2 text-xs">
                        <FileText className="h-3 w-3" />
                        <span>{attachment.filename}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Notes Section */}
      {showNotes && (
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">Notas da Conversa</h4>
            <div className="flex items-center space-x-2">
              <button
                onClick={updateNotes}
                className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
              >
                Salvar
              </button>
              <button
                onClick={() => setShowNotes(false)}
                className="text-xs text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
            </div>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Adicione notas sobre esta conversa..."
          />
        </div>
      )}

      {/* Input Area */}
      {((conversation.status === 'HUMAN' || conversation.status === 'MINHAS_CONVERSAS') && conversation.assignedTo === currentUserId) && (
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4 mb-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
            >
              <FileText className="h-4 w-4" />
              <span>Notas</span>
            </button>
            
            <button
              onClick={transferConversation}
              className="flex items-center space-x-1 text-sm text-orange-600 hover:text-orange-700"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Transferir</span>
            </button>
            
            <button
              onClick={closeConversation}
              className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-700"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Fechar</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-3">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.wav"
              onChange={(e) => {
                // Handle file upload
                console.log('File selected:', e.target.files?.[0]);
              }}
            />
            
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Digite sua mensagem..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            
            <button
              onClick={sendMessage}
              disabled={!message.trim() || sending}
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Read Only View */}
      {!(conversation.assignedTo && conversation.assignedTo === currentUserId) && (
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="text-center text-gray-600">
            <p className="text-sm">
              {conversation.assignedTo && conversation.assignedTo !== currentUserId
                ? `Esta conversa está atribuída a outro atendente`
                : conversation.status === 'CLOSED'
                ? 'Esta conversa está fechada'
                : 'Você precisa assumir esta conversa para responder'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export { ConversationViewer };
export default ConversationViewer;
