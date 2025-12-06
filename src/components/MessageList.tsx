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
  Users,
  Mic,
  StopCircle,
  X,
  File,
  Image as ImageIcon,
  Trash2,
  Pause
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
  mediaUrl?: string;
}

interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  cpf?: string;
  birthDate?: string;
  insuranceCompany?: string;
  insuranceNumber?: string;
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

  // Media & File States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const prevConvRef = useRef<Conversation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { socket } = useSocket();
  const { user } = useAuth();

  // Simplified permission logic: ONLY check if assigned to current user AND status is HUMAN
  const canWrite = !!(
    convState?.assignedTo &&
    user?.id &&
    convState.assignedTo.id === user.id &&
    convState.status === 'HUMAN'
  );

  const getBlockedReason = () => {
    if (!convState) return null;

    if (convState.status === 'BOT') {
      return 'Esta conversa está sendo atendida pelo bot. Clique em "Assumir" para atender.';
    }
    if (convState.status === 'PRINCIPAL') {
      return 'Esta conversa está aguardando atendimento. Clique em "Assumir" para começar.';
    }
    if (convState.status === 'CLOSED') {
      return 'Esta conversa foi encerrada.';
    }
    if (convState.assignedTo && convState.assignedTo.id !== user?.id) {
      return `Esta conversa está sendo atendida por ${convState.assignedTo.name}.`;
    }
    return 'Você precisa assumir esta conversa para responder.';
  };

  const fetchMessages = async () => {
    try {
      const response = await api.get(`/api/conversations/${conversationId}`, { params: { limit: 50 } });
      const msgs = (response.data?.messages || []).map((m: any) => ({
        id: m.id,
        conversationId: response.data.id || conversationId,
        // Use direction as primary source: RECEIVED = PATIENT, SENT = BOT/AGENT
        sender: m.direction === 'RECEIVED' ? 'PATIENT' : (m.from === 'BOT' ? 'BOT' : 'AGENT'),
        messageText: m.messageText,
        messageType: m.messageType || 'TEXT',
        mediaUrl: m.mediaUrl,
        metadata: m.metadata,
        direction: m.direction,
        timestamp: m.timestamp,
        status: m.direction === 'SENT' ? 'SENT' : 'PENDING',
      }))
      console.log('🔍 Mensagens carregadas:', msgs.slice(-3).map(m => ({
        type: m.messageType,
        text: m.messageText?.substring(0, 20),
        hasUrl: !!m.mediaUrl,
        url: m.mediaUrl
      })))
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
      // Join both conversation ID and phone rooms for compatibility
      socket.emit('join_conversation', conversationId);
      const conversationPhone = (conversation as any)?.phone || (conversation as any)?.patient?.phone;
      if (conversationPhone) {
        socket.emit('join_conversation', conversationPhone);
      }
      console.log(`🔌 MessageList: Joined rooms for conv:${conversationId} and phone:${conversationPhone}`);

      const appendFromPayload = (payload: any) => {
        const m = payload?.message || payload
        if (!m || !m.id) return
        const matchesConversation = m.conversationId === conversationId ||
          m.phoneNumber === conversationId ||
          payload?.phone === conversationPhone ||
          payload?.conversation?.id === conversationId

        if (matchesConversation) {
          console.log('📨 MessageList: Adding new message to list:', m);
          const mapped: Message = {
            id: m.id,
            conversationId: m.conversationId || conversationId,
            // Use direction as primary source: RECEIVED = PATIENT, SENT = BOT/AGENT
            sender: m.direction === 'RECEIVED' ? 'PATIENT' : (m.from === 'BOT' ? 'BOT' : 'AGENT'),
            messageText: m.messageText,
            messageType: m.messageType || 'TEXT',
            direction: m.direction,
            timestamp: m.timestamp || new Date().toISOString(),
            status: m.direction === 'SENT' ? 'SENT' : 'PENDING',
            metadata: m.metadata,
            mediaUrl: m.mediaUrl
          }
          setMessages(prev => {
            if (prev.some(x => x.id === mapped.id)) {
              console.log('⚠️ MessageList: Message already exists, skipping');
              return prev;
            }
            console.log('✅ MessageList: Adding new message instantly');
            // Adicionar no final da lista para manter ordem cronológica
            return [...prev, mapped];
          })
        }
      }

      const onNewMessage = (payload: any) => {
        const timestamp = new Date().toISOString();
        console.log(`📨 [${timestamp}] MessageList: new_message event received:`, {
          payload,
          conversationId,
          conversationPhone,
          payloadPhone: payload?.phone,
          payloadConvId: payload?.conversation?.id,
          messageConvId: payload?.message?.conversationId
        });
        appendFromPayload(payload);
      }
      const onMessageSent = (payload: any) => {
        console.log('📨 MessageList: message_sent event received:', payload);
        appendFromPayload(payload);
      }
      const onAIMessageSent = (payload: any) => {
        console.log('📨 MessageList: ai_message_sent event received:', payload);
        appendFromPayload(payload);
      }
      const onUserTyping = (data: { phone: string; isTyping: boolean }) => {
        if (data.phone === conversationId || data.phone === conversationPhone) setIsTyping(data.isTyping)
      }

      socket.on('new_message', onNewMessage)
      socket.on('message_sent', onMessageSent)
      socket.on('ai_message_sent', onAIMessageSent)
      socket.on('user_typing', onUserTyping)
      const onConversationUpdated = (updated: any) => {
        const statusMap = (s: string) => s === 'EM_ATENDIMENTO' ? 'HUMAN' : (s === 'BOT_QUEUE' ? 'BOT' : (s === 'FECHADA' ? 'CLOSED' : s))
        if (updated?.phone === conversationId || updated?.id === convState?.id) {
          // If conversation is assigned to current user, create assignedTo object
          let assignedTo = undefined;
          if (updated.assignedTo) {
            assignedTo = { id: updated.assignedTo.id, name: updated.assignedTo.name };
          } else if (updated.assignedToId === user?.id) {
            // If only ID is provided and it matches current user, use current user data
            assignedTo = { id: user.id, name: user.name || user.email || 'You' };
          }

          const mapped: Conversation = {
            id: updated.id,
            status: statusMap(updated.status) as any,
            priority: (updated.priority || 'LOW'),
            assignedTo,
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
        if (conversationPhone) {
          socket.emit('leave_conversation', conversationPhone)
        }
        socket.off('new_message', onNewMessage)
        socket.off('message_sent', onMessageSent)
        socket.off('ai_message_sent', onAIMessageSent)
        socket.off('user_typing', onUserTyping)
        socket.off('conversation_updated', onConversationUpdated)
      }
    }

    return () => { }
  }, [conversationId, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);

      // Start timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Erro ao acessar microfone');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleCancelRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && pendingFiles.length === 0 && !audioBlob) || sending) return;

    setSending(true);
    try {
      // 1. Send Text Message if exists
      if (newMessage.trim()) {
        const tempId = `temp-${Date.now()}`;
        const optimistic: Message = {
          id: tempId,
          conversationId,
          sender: 'AGENT',
          messageText: newMessage,
          messageType: 'TEXT',
          direction: 'SENT',
          timestamp: new Date().toISOString(),
          status: 'PENDING',
        };
        setMessages(prev => [...prev, optimistic]);

        const response = await api.post(`/api/conversations/send`, {
          phone: conversationId,
          text: newMessage,
          from: 'AGENT'
        });

        const sent = response.data?.message;
        if (sent) {
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, ...sent, status: 'SENT' } : m));
        } else {
          await fetchMessages();
        }
        setNewMessage('');
      }

      // 2. Send Pending Files
      if (pendingFiles.length > 0) {
        const formData = new FormData();
        pendingFiles.forEach(file => formData.append('files', file));

        // Use conversation.id explicitly for the endpoint
        const targetId = conversation?.id || conversationId;
        console.log('📤 Uploading files to conversation:', targetId);

        const response = await api.post(`/api/conversations/${targetId}/files`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (response.data.message) {
          // The backend might return a single message or we might need to fetch
          await fetchMessages();
        }
        setPendingFiles([]);
        toast.success(`${pendingFiles.length} arquivos enviados`);
      }

      // 3. Send Audio Recording
      if (audioBlob) {
        const formData = new FormData();
        formData.append('files', audioBlob, 'audio_message.webm');

        // Use conversation.id explicitly for the endpoint
        const targetId = conversation?.id || conversationId;

        await api.post(`/api/conversations/${targetId}/files`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setAudioBlob(null);
        setAudioUrl(null);
        await fetchMessages();
        toast.success('Áudio enviado');
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setPendingFiles(prev => [...prev, ...Array.from(files)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
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
      <div className="bg-white border-b border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="bg-gray-200 p-2 rounded-full">
              <User className="h-6 w-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-blue-900">{conversation.patient.name || conversation.patient.phone}</h3>
                {conversation.patient.name && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(conversation.patient.name);
                      toast.success('Nome copiado!');
                    }}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Copiar nome"
                  >
                    <svg className="h-3 w-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                <span className="flex items-center gap-1">
                  📱 {conversation.patient.phone}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(conversation.patient.phone);
                      toast.success('Telefone copiado!');
                    }}
                    className="p-0.5 hover:bg-gray-100 rounded"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </span>
                {conversation.patient.cpf && (
                  <span className="flex items-center gap-1">
                    🆔 {conversation.patient.cpf}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(conversation.patient.cpf!);
                        toast.success('CPF copiado!');
                      }}
                      className="p-0.5 hover:bg-gray-100 rounded"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </span>
                )}
                {conversation.patient.email && (
                  <span className="flex items-center gap-1">
                    📧 {conversation.patient.email}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(conversation.patient.email!);
                        toast.success('Email copiado!');
                      }}
                      className="p-0.5 hover:bg-gray-100 rounded"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </span>
                )}
                {conversation.patient.birthDate && (
                  <span className="flex items-center gap-1">
                    🎂 {new Date(conversation.patient.birthDate).toLocaleDateString('pt-BR')}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(new Date(conversation.patient.birthDate!).toLocaleDateString('pt-BR'));
                        toast.success('Data de nascimento copiada!');
                      }}
                      className="p-0.5 hover:bg-gray-100 rounded"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </span>
                )}
                {conversation.patient.insuranceCompany && (
                  <span className="flex items-center gap-1">
                    💳 {conversation.patient.insuranceCompany}
                    {conversation.patient.insuranceNumber && ` (${conversation.patient.insuranceNumber})`}
                    <button
                      onClick={() => {
                        const text = conversation.patient.insuranceNumber
                          ? `${conversation.patient.insuranceCompany} - ${conversation.patient.insuranceNumber}`
                          : conversation.patient.insuranceCompany!;
                        navigator.clipboard.writeText(text);
                        toast.success('Convênio copiado!');
                      }}
                      className="p-0.5 hover:bg-gray-100 rounded"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs rounded-full ${(convState || conversation).assignedTo ? (
              canWrite ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
            ) : (
              (convState || conversation).status === 'BOT' ? 'bg-blue-100 text-blue-800' :
                (convState || conversation).status === 'PRINCIPAL' ? 'bg-yellow-100 text-yellow-800' :
                  (convState || conversation).status === 'HUMAN' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
            )
              }`}>
              {(convState || conversation).assignedTo
                ? (canWrite ? 'Com você' : (conversation.assignedTo.name || 'Em atendimento'))
                : ((convState || conversation).status === 'BOT' ? 'Bot' :
                  (convState || conversation).status === 'PRINCIPAL' ? 'Aguardando' :
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
                        ;[0, 1, 2, 3].forEach((s, i) => window.setTimeout(() => setDisableProgress(s), i * 100))
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

        {messages.map((message) => {
          // Debug: log message mapping
          if (message.id.startsWith('cmin')) {
            console.log('🔍 Message mapping:', {
              id: message.id.substring(0, 15),
              direction: message.direction,
              sender: message.sender,
              from: (message as any).from,
              shouldBeRight: message.direction === 'SENT'
            })
          }

          // Use direction as the source of truth for alignment
          const isFromBot = message.direction === 'SENT'

          return (
            <div
              key={message.id}
              className={`flex ${isFromBot ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-2 max-w-[80%] ${isFromBot ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                <div className={`p-2 rounded-full ${message.sender === 'BOT' ? 'bg-blue-100' :
                  message.sender === 'PATIENT' ? 'bg-gray-100' : 'bg-green-100'
                  }`}>
                  {getSenderAvatar(message.sender)}
                </div>

                <div className={`px-4 py-2 shadow-sm ${isFromBot
                  ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
                  : 'bg-white text-gray-900 rounded-2xl rounded-bl-sm'
                  }`}>
                  {/* Show text only if it exists and is not a media-only message */}
                  {message.messageText && !message.messageText.startsWith('[IMAGE]') && !message.messageText.startsWith('[AUDIO]') && !message.messageText.startsWith('[DOCUMENT]') && (
                    <p className="text-sm whitespace-pre-line break-words">{message.messageText}</p>
                  )}

                  {/* File att attachments & Media */}
                  {message.messageType === 'AUDIO' && (
                    <div className="mt-2 min-w-[200px]">
                      {message.mediaUrl ? (
                        <audio controls src={message.mediaUrl} className="w-full h-8" />
                      ) : (
                        <p className="text-xs italic opacity-75">🎤 Áudio não disponível</p>
                      )}
                    </div>
                  )}

                  {(() => {
                    if (message.messageType === 'IMAGE') {
                      console.log('🖼️ Renderizando IMAGE:', { id: message.id.substring(0, 10), hasUrl: !!message.mediaUrl, url: message.mediaUrl })
                    }
                    return null;
                  })()}
                  {message.messageType === 'IMAGE' && (
                    <div className="mt-2">
                      {message.mediaUrl ? (
                        <img
                          src={message.mediaUrl}
                          alt="Imagem"
                          className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(message.mediaUrl!, '_blank')}
                        />
                      ) : (
                        <p className="text-xs italic opacity-75">📷 Imagem não disponível</p>
                      )}
                    </div>
                  )}

                  {message.metadata?.files && (
                    <div className="mt-2 space-y-1">
                      {message.metadata.files.map((file: any, index: number) => (
                        <a
                          key={index}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center space-x-2 p-2 rounded hover:bg-opacity-80 transition-colors ${message.direction === 'SENT' ? 'bg-blue-500' : 'bg-gray-200'
                            }`}
                        >
                          {file.type?.startsWith('image/') ? <ImageIcon className="h-4 w-4" /> : <File className="h-4 w-4" />}
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-xs truncate font-medium">{file.originalName}</span>
                            <span className="text-[10px] opacity-75">{Math.round(file.size / 1024)}KB</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}

                  <div className={`flex items-center space-x-1 mt-1 ${message.direction === 'SENT' ? 'justify-end' : 'justify-start'
                    }`}>
                    <span className={`text-xs ${message.direction === 'SENT' ? 'text-blue-100' : 'text-gray-500'
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
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        {(!canWrite || transferring) && (
          <div className="mb-3 flex items-center space-x-2 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2 text-sm text-yellow-800">
            <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
            <span>{transferring ? 'Transferindo conversa...' : (getBlockedReason() || 'Somente leitura')}</span>
          </div>
        )}

        {/* Previews */}
        {(pendingFiles.length > 0 || audioBlob) && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
            {pendingFiles.map((file, i) => (
              <div key={i} className="relative group bg-gray-50 border border-gray-200 rounded-lg p-2 w-24 flex-shrink-0">
                <button
                  onClick={() => removePendingFile(i)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="flex flex-col items-center justify-center h-full">
                  {file.type.startsWith('image/') ? (
                    <ImageIcon className="h-8 w-8 text-gray-400 mb-1" />
                  ) : (
                    <File className="h-8 w-8 text-gray-400 mb-1" />
                  )}
                  <span className="text-[10px] text-gray-600 truncate w-full text-center">{file.name}</span>
                </div>
              </div>
            ))}
            {audioBlob && (
              <div className="relative bg-blue-50 border border-blue-200 rounded-lg p-2 w-48 flex-shrink-0 flex items-center justify-center">
                <button
                  onClick={handleCancelRecording}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
                <audio controls src={audioUrl!} className="w-full h-8" />
              </div>
            )}
          </div>
        )}

        <div className="flex items-center space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.wav"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploadingFiles || !canWrite || transferring}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFiles || !canWrite || transferring}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-gray-500"
            title="Anexar arquivo"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          <div className="flex-1 relative">
            {isRecording ? (
              <div className="absolute inset-0 bg-red-50 rounded-lg flex items-center justify-between px-4 border border-red-100">
                <div className="flex items-center space-x-2 text-red-600 animate-pulse">
                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                  <span className="text-sm font-medium">{formatDuration(recordingTime)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={handleCancelRecording} className="p-1 hover:bg-red-100 rounded text-red-600">
                    <Trash2 className="h-5 w-5" />
                  </button>
                  <button onClick={handleStopRecording} className="p-1 hover:bg-red-100 rounded text-red-600">
                    <StopCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
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
            )}
          </div>

          {!newMessage.trim() && !isRecording && !audioBlob && pendingFiles.length === 0 ? (
            <button
              onClick={handleStartRecording}
              disabled={!canWrite || transferring}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-red-600 transition-colors"
              title="Gravar áudio"
            >
              <Mic className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={(!newMessage.trim() && pendingFiles.length === 0 && !audioBlob) || sending || uploadingFiles || !canWrite || transferring}
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-5 w-5" />
            </button>
          )}
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
                } catch { }
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
