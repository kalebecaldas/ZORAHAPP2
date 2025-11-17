import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  User, 
  Bot, 
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  Info,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Settings,
  ArrowRight,
  Users
} from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { api } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { WorkflowExecution } from './WorkflowExecution';

interface Message {
  id: string;
  conversationId: string;
  sender: 'BOT' | 'PATIENT' | 'AGENT';
  messageText: string;
  messageType: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'AUDIO';
  direction: 'SENT' | 'RECEIVED';
  timestamp: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ';
  metadata?: any;
}

interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  insuranceCompany?: string;
  preferences?: any;
}

interface Conversation {
  id: string;
  status: 'BOT' | 'PRINCIPAL' | 'HUMAN' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedTo?: {
    id: string;
    name: string;
  };
  patient: Patient;
}

interface MessageListProps {
  conversationId: string;
  conversation: Conversation;
  onStatusChange: (status: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({ conversationId, conversation, onStatusChange }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [workflowRunning, setWorkflowRunning] = useState(false);
  const [showTransferMenu, setShowTransferMenu] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [convState, setConvState] = useState<Conversation | null>(conversation);
  const [updatingUI, setUpdatingUI] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [disableProgress, setDisableProgress] = useState(0);
  const prevConvRef = useRef<Conversation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();
  const { user } = useAuth();
  const isAssignedToMe = !!(convState?.assignedTo && user?.id && convState.assignedTo.id === user.id);
  const canWrite = isAssignedToMe;

  const fetchMessages = async () => {
    try {
      const response = await api.get(`/api/conversations/${conversationId}`, { params: { limit: 50 } });
      const msgs = (response.data?.messages || []).map((m: any) => ({
        id: m.id,
        conversationId: response.data.id || conversationId,
        sender: (m.from === 'USER' ? 'PATIENT' : (m.from === 'BOT' ? 'BOT' : 'AGENT')),
        messageText: m.messageText,
        messageType: 'TEXT',
        direction: m.direction,
        timestamp: m.timestamp,
        status: m.direction === 'SENT' ? 'SENT' : 'PENDING',
      }))
      setMessages(msgs)
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setConvState(conversation)
    fetchMessages();

    if (socket) {
      socket.emit('join_conversation', conversationId);

      const appendFromPayload = (payload: any) => {
        const m = payload?.message || payload
        if (!m) return
        if (m.conversationId || m.phoneNumber === conversationId) {
          const mapped: Message = {
            id: m.id,
            conversationId: m.conversationId || conversationId,
            sender: (m.from === 'USER' ? 'PATIENT' : (m.from === 'BOT' ? 'BOT' : 'AGENT')),
            messageText: m.messageText,
            messageType: 'TEXT',
            direction: m.direction,
            timestamp: m.timestamp,
            status: m.direction === 'SENT' ? 'SENT' : 'PENDING',
          }
          setMessages(prev => prev.some(x => x.id === mapped.id) ? prev : [...prev, mapped])
        }
      }

      const onNewMessage = (payload: any) => appendFromPayload(payload)
      const onMessageSent = (payload: any) => appendFromPayload(payload)
      const onAIMessageSent = (payload: any) => appendFromPayload(payload)
      const onUserTyping = (data: { phone: string; isTyping: boolean }) => {
        if (data.phone === conversationId) setIsTyping(data.isTyping)
      }

      socket.on('new_message', onNewMessage)
      socket.on('message_sent', onMessageSent)
      socket.on('ai_message_sent', onAIMessageSent)
      socket.on('user_typing', onUserTyping)
      const onConversationUpdated = (updated: any) => {
        const statusMap = (s: string) => s === 'EM_ATENDIMENTO' ? 'HUMAN' : (s === 'BOT_QUEUE' ? 'BOT' : (s === 'FECHADA' ? 'CLOSED' : s))
        if (updated?.phone === conversationId || updated?.id === convState?.id) {
          const mapped: Conversation = {
            id: updated.id,
            status: statusMap(updated.status) as any,
            priority: (updated.priority || 'LOW'),
            assignedTo: updated.assignedTo ? { id: updated.assignedTo.id, name: updated.assignedTo.name } : undefined,
            patient: {
              id: updated.patient?.id || '',
              name: updated.patient?.name || updated.phone,
              phone: updated.phone,
              email: updated.patient?.email,
              insuranceCompany: updated.patient?.insuranceCompany,
              preferences: updated.patient?.preferences,
            }
          }
          setConvState(mapped)
          setUpdatingUI(true)
          window.setTimeout(() => setUpdatingUI(false), 250)
        }
      }
      socket.on('conversation_updated', onConversationUpdated)

      return () => {
        socket.emit('leave_conversation', conversationId)
        socket.off('new_message', onNewMessage)
        socket.off('message_sent', onMessageSent)
        socket.off('ai_message_sent', onAIMessageSent)
        socket.off('user_typing', onUserTyping)
        socket.off('conversation_updated', onConversationUpdated)
      }
    }

    return () => {}
  }, [conversationId, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const tempId = `temp-${Date.now()}`
    const optimistic: Message = {
      id: tempId,
      conversationId,
      sender: 'AGENT',
      messageText: newMessage,
      messageType: 'TEXT',
      direction: 'SENT',
      timestamp: new Date().toISOString(),
      status: 'PENDING',
    }
    setMessages(prev => [...prev, optimistic])

    setSending(true);
    try {
      const response = await api.post(`/api/conversations/send`, {
        phone: conversationId,
        text: newMessage,
        from: 'AGENT'
      });
      const sent = response.data?.message
      const delivery = response.data?.delivery
      if (sent) {
        setMessages(prev => prev.map(m => m.id === tempId ? {
          ...m,
          id: sent.id,
          timestamp: sent.timestamp,
          status: delivery === 'failed' ? 'PENDING' : 'SENT',
        } : m))
      } else {
        await fetchMessages()
      }
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'PENDING' } : m))
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const response = await api.post(`/api/conversations/${conversationId}/files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.message) {
        // Add the system message about file upload to the messages
        const fileMessage = {
          id: response.data.message.id,
          conversationId: conversationId,
          sender: 'AGENT' as const,
          messageText: response.data.message.messageText,
          messageType: 'TEXT' as const,
          direction: 'SENT' as const,
          timestamp: response.data.message.timestamp,
          status: 'SENT' as const,
        };
        setMessages(prev => [...prev, fileMessage]);
      }

      toast.success(`${files.length} arquivo(s) enviado(s) com sucesso!`);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Erro ao enviar arquivos');
    } finally {
      setUploadingFiles(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-3 w-3 text-gray-400" />;
      case 'SENT': return <CheckCircle className="h-3 w-3 text-blue-500" />;
      case 'DELIVERED': return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'READ': return <CheckCircle className="h-3 w-3 text-green-600" />;
      default: return null;
    }
  };

  const getSenderAvatar = (sender: string) => {
    switch (sender) {
      case 'BOT': return <Bot className="h-4 w-4" />;
      case 'PATIENT': return <User className="h-4 w-4" />;
      case 'AGENT': return <User className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const startWorkflow = () => {
    setShowWorkflow(true);
    setWorkflowRunning(true);
  };

  const handleWorkflowComplete = async () => {
    setWorkflowRunning(false);
    
    // Check if we have enough data to create an appointment
    if (conversation && 
        conversation.patient && 
        conversation.patient.name && 
        conversation.patient.phone) {
      
      try {
        const proceduresRes = await api.get('/api/appointments/procedures');
        const locationsRes = await api.get('/api/appointments/locations');
        const firstProcedure = (proceduresRes.data || [])[0];
        const firstLocation = (locationsRes.data || [])[0];
        const dateISO = new Date(Date.now() + 24 * 60 * 60 * 1000);
        dateISO.setHours(9, 0, 0, 0);

        const appointmentData = {
          patientName: conversation.patient.name,
          patientPhone: conversation.patient.phone,
          procedureId: firstProcedure?.id,
          date: dateISO.toISOString(),
          timeSlot: '09:00',
          locationId: firstLocation?.id,
          conversationId: conversationId
        };

        await api.post('/api/appointments', appointmentData);
        toast.success('Agendamento criado com sucesso!');
      } catch (error) {
        console.error('Error creating appointment:', error);
        // Don't show error to user, workflow completion is still success
      }
    }
    
    toast.success('Fluxo de trabalho concluído com sucesso!');
    fetchMessages(); // Refresh messages after workflow completion
  };

  const handleWorkflowError = (error: string) => {
    setWorkflowRunning(false);
    toast.error(error);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col h-full transition-opacity duration-400 ${(updatingUI || transferring) ? 'opacity-75' : 'opacity-100'}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gray-200 p-2 rounded-full">
              <User className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{conversation.patient.name}</h3>
              <p className="text-sm text-gray-500">{conversation.patient.phone}</p>
              {conversation.patient.insuranceCompany && (
                <p className="text-xs text-gray-400">{conversation.patient.insuranceCompany}</p>
              )}
            </div>
        </div>
        
        <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs rounded-full ${
              (convState || conversation).assignedTo ? (
                isAssignedToMe ? 'bg-green-100 text-green-800' : 'bg-green-100 text-green-800'
              ) : (
                (convState || conversation).status === 'BOT' ? 'bg-blue-100 text-blue-800' :
                (convState || conversation).status === 'PRINCIPAL' ? 'bg-yellow-100 text-yellow-800' :
                (convState || conversation).status === 'HUMAN' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              )
            }`}>
              {(convState || conversation).assignedTo
                ? (isAssignedToMe ? 'Com você' : (conversation.assignedTo.name || 'Em atendimento'))
                : ((convState || conversation).status === 'BOT' ? 'Bot' :
                   (convState || conversation).status === 'PRINCIPAL' ? 'Principal' :
                   (convState || conversation).status === 'HUMAN' ? 'Humano' : 'Fechado')}
            </span>
            
            {(convState || conversation).status === 'BOT' && !(convState || conversation).assignedTo && (
              <button
                onClick={startWorkflow}
                disabled={workflowRunning || !canWrite}
                className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-xs rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="h-3 w-3" />
                <span>{workflowRunning ? 'Executando...' : 'Iniciar Fluxo'}</span>
              </button>
            )}
            
            <button className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canWrite || (transferring && disableProgress >= 2)}>
              <Phone className="h-4 w-4 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canWrite || (transferring && disableProgress >= 1)}>
              <Video className="h-4 w-4 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canWrite || (transferring && disableProgress >= 1)}>
              <Info className="h-4 w-4 text-gray-600" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowTransferMenu(v => !v)}
                className="flex items-center space-x-1 px-3 py-1 border border-gray-200 rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!canWrite || transferring}
              >
                <ArrowRight className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-700">Transferir</span>
              </button>
              {showTransferMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <button
                    onClick={async () => {
                      setShowTransferMenu(false)
                      prevConvRef.current = convState || conversation
                      setTransferring(true)
                      setDisableProgress(0)
                      setUpdatingUI(true)
                      const prev = prevConvRef.current
                      const target: Conversation = {
                        id: prev?.id || conversation.id,
                        status: 'PRINCIPAL',
                        priority: prev?.priority || 'LOW',
                        assignedTo: undefined,
                        patient: prev?.patient || conversation.patient,
                      }
                      setConvState(target)
                      ;[0,1,2,3].forEach((s, i) => window.setTimeout(() => setDisableProgress(s), i * 100))
                      try {
                        await api.post('/api/conversations/actions', { action: 'return', phone: conversationId })
                        toast.success('Transferido para fila principal')
                        window.setTimeout(() => {
                          setTransferring(false)
                          setUpdatingUI(false)
                        }, 400)
                      } catch (e) {
                        window.setTimeout(() => {
                          const ok = (convState || conversation)?.status === 'PRINCIPAL'
                          if (ok) {
                            toast.success('Transferido para fila principal')
                            setTransferring(false)
                            setUpdatingUI(false)
                          } else {
                            setConvState(prevConvRef.current || conversation)
                            setTransferring(false)
                            setDisableProgress(0)
                            setUpdatingUI(false)
                            toast.error('Falha ao transferir para principal')
                          }
                        }, 800)
                      }
                    }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50"
                  >
                    <Users className="inline h-4 w-4 mr-2 text-gray-600" />
                    Transferir para fila principal
                  </button>
                  <button
                    onClick={async () => {
                      setShowTransferMenu(false)
                      try {
                        await api.post('/api/conversations/actions', { action: 'to_bot', phone: conversationId })
                        toast.success('Transferido para fila do bot')
                      } catch (e) {
                        toast.error('Falha ao transferir para bot')
                      }
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50"
                  >
                    <Bot className="inline h-4 w-4 mr-2 text-gray-600" />
                    Transferir para fila do bot
                  </button>
                  <button
                    onClick={async () => {
                      setShowTransferMenu(false)
                      setShowUserModal(true)
                      setUsers([])
                      setUserSearch('')
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-b-lg"
                  >
                    <User className="inline h-4 w-4 mr-2 text-gray-600" />
                    Transferir para usuário
                  </button>
                </div>
              )}
            </div>
            {transferring && (
              <div className="mt-2 text-xs text-gray-500 flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400 mr-2"></div>
                Transferindo para fila principal...
              </div>
            )}
        </div>
      </div>
    </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {/* Workflow Execution */}
        {showWorkflow && workflowRunning && (
          <div className="mb-4">
              <WorkflowExecution
                conversationId={conversationId}
                patientPhone={conversation.patient.phone}
                onComplete={handleWorkflowComplete}
                onError={handleWorkflowError}
              />
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.direction === 'SENT' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-2 max-w-[80%] ${
              message.direction === 'SENT' ? 'flex-row-reverse space-x-reverse' : ''
            }`}>
              <div className={`p-2 rounded-full ${
                message.sender === 'BOT' ? 'bg-blue-100' :
                message.sender === 'PATIENT' ? 'bg-gray-100' : 'bg-green-100'
              }`}>
                {getSenderAvatar(message.sender)}
              </div>
              
              <div className={`px-4 py-2 shadow-sm ${
                message.direction === 'SENT' 
                  ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm' 
                  : 'bg-white text-gray-900 rounded-2xl rounded-bl-sm'
              }`}>
                <p className="text-sm whitespace-pre-line break-words">{message.messageText}</p>
                
                {/* File attachments */}
                {message.metadata?.files && (
                  <div className="mt-2 space-y-1">
                    {message.metadata.files.map((file: any, index: number) => (
                      <div key={index} className={`flex items-center space-x-2 p-2 rounded ${
                        message.direction === 'SENT' ? 'bg-blue-500' : 'bg-gray-100'
                      }`}>
                        <Paperclip className="h-4 w-4" />
                        <span className="text-xs truncate">{file.originalName}</span>
                        <span className="text-xs opacity-75">({Math.round(file.size / 1024)}KB)</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className={`flex items-center space-x-1 mt-1 ${
                  message.direction === 'SENT' ? 'justify-end' : 'justify-start'
                }`}>
                  <span className={`text-xs ${
                    message.direction === 'SENT' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {message.direction === 'SENT' && getStatusIcon(message.status)}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        {(!canWrite || transferring) && (
          <div className="mb-3 flex items-center space-x-2 bg-gray-100 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700">
            <AlertCircle className="h-4 w-4 text-gray-600" />
            <span>Somente leitura — assuma a conversa para responder</span>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.wav"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploadingFiles || !canWrite || transferring}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFiles || !canWrite || transferring}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Paperclip className="h-5 w-5 text-gray-600" />
          </button>
          
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value)
                if (socket) {
                  socket.emit('typing', { phone: conversationId, isTyping: true })
                  if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current)
                  typingTimeoutRef.current = window.setTimeout(() => {
                    socket.emit('typing', { phone: conversationId, isTyping: false })
                  }, 1000)
                }
              }}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="w-full resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              disabled={sending || uploadingFiles || !canWrite || transferring}
            />
          </div>
          
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <Smile className="h-5 w-5 text-gray-600" />
          </button>
          
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending || uploadingFiles || !canWrite || transferring}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        {isTyping && (
          <div className="mt-2 text-xs text-gray-500">Digitando…</div>
        )}
        {uploadingFiles && (
          <div className="mt-2 text-xs text-blue-600">Enviando arquivos...</div>
        )}
      </div>

      {/* Transfer to user modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Transferir para usuário</h3>
            <input
              value={userSearch}
              onChange={async (e) => {
                const val = e.target.value
                setUserSearch(val)
                setLoadingUsers(true)
                try {
                  const res = await api.get('/api/users', { params: { search: val, limit: 10 } })
                  setUsers(res.data?.users || [])
                } catch {}
                setLoadingUsers(false)
              }}
              placeholder="Buscar por nome ou email"
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3"
            />
            <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-md">
              {loadingUsers ? (
                <div className="p-3 text-sm text-gray-500">Carregando...</div>
              ) : (
                users.map((u) => (
                  <button
                    key={u.id}
                    onClick={async () => {
                      try {
                        await api.post('/api/conversations/actions', { action: 'transfer', phone: conversationId, assignTo: u.id })
                        toast.success(`Transferido para ${u.name}`)
                        setShowUserModal(false)
                      } catch {
                        toast.error('Falha ao transferir para usuário')
                      }
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-800">{u.name}</span>
                    <span className="text-xs text-gray-500">{u.email}</span>
                  </button>
                ))
              )}
              {(!loadingUsers && users.length === 0) && (
                <div className="p-3 text-sm text-gray-500">Nenhum usuário encontrado</div>
              )}
            </div>
            <div className="flex justify-end space-x-2 mt-3">
              <button onClick={() => setShowUserModal(false)} className="px-3 py-1 border border-gray-300 rounded-md">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;
