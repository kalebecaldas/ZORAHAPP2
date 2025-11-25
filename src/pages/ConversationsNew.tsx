import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Phone, User, Bot, Clock, Users, UserCheck, Archive,
    Send, Paperclip, Mic, StopCircle, X, Image as ImageIcon,
    File, Trash2, Video, MoreVertical, PhoneCall, AlertCircle,
    Shield, CheckCircle2, History, FileText
} from 'lucide-react';
import { api } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { toast } from 'sonner';
import ConversationHistoryModal from '../components/ConversationHistoryModal';

// Types
interface Message {
    id: string;
    conversationId: string;
    sender: 'BOT' | 'PATIENT' | 'AGENT';
    messageText: string;
    messageType: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'AUDIO';
    mediaUrl?: string | null;
    direction: 'SENT' | 'RECEIVED';
    timestamp: string;
    status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ';
    metadata?: any;
}

interface Conversation {
    id: string;
    phone: string;
    status: 'BOT_QUEUE' | 'PRINCIPAL' | 'EM_ATENDIMENTO' | 'FECHADA';
    assignedToId?: string;
    assignedTo?: { id: string; name: string };
    patient?: { id: string; name: string; phone: string; insuranceCompany?: string };
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    lastMessage?: string;
    lastTimestamp?: string;
    createdAt: string;
    updatedAt: string;
    sessionStartTime?: string | null;
    sessionExpiryTime?: string | null;
    sessionStatus?: string;
    lastUserActivity?: string | null;
    channel?: string;
}

type QueueType = 'BOT_QUEUE' | 'PRINCIPAL' | 'EM_ATENDIMENTO' | 'MINHAS_CONVERSAS' | 'ENCERRADOS';

const ConversationsPage: React.FC = () => {
    const { phone } = useParams<{ phone: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { socket } = useSocket();

    // States
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    // Começar sempre com "Minhas Conversas" por padrão
    const [activeQueue, setActiveQueue] = useState<QueueType>('MINHAS_CONVERSAS');
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Audio states
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioMime, setAudioMime] = useState<string>('');
    const [audioExt, setAudioExt] = useState<string>('webm');

    // File states
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);

    // Transfer and close states
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [availableAgents, setAvailableAgents] = useState<any[]>([]);
    const [transferTarget, setTransferTarget] = useState<string>('');
    
    // Session state
    const [sessionInfo, setSessionInfo] = useState<any>(null);
    
    // History modal
    const [showHistoryModal, setShowHistoryModal] = useState(false);


    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [autoSendAfterStop, setAutoSendAfterStop] = useState(false);
    const processedMessageIdsRef = useRef<Set<string>>(new Set());

    // Permission check
    const canWrite = !!(
        selectedConversation?.assignedTo &&
        user?.id &&
        selectedConversation.assignedTo.id === user.id &&
        selectedConversation.status === 'EM_ATENDIMENTO'
    );

    // Memoizar condições para evitar re-renderizações desnecessárias e melhorar performance
    const showMicButton = useMemo(() => {
        return !newMessage.trim() && !isRecording && !audioBlob && pendingFiles.length === 0;
    }, [newMessage, isRecording, audioBlob, pendingFiles.length]);

    const canSend = useMemo(() => {
        return (newMessage.trim() || pendingFiles.length > 0 || audioBlob) && !sending && canWrite;
    }, [newMessage, pendingFiles.length, audioBlob, sending, canWrite]);

    // Queue configurations
    const queueConfigs = {
        BOT_QUEUE: { label: 'Bot', icon: Bot, color: 'blue', bgClass: 'bg-blue-50', textClass: 'text-blue-700', borderClass: 'border-blue-200' },
        PRINCIPAL: { label: 'Aguardando', icon: Clock, color: 'yellow', bgClass: 'bg-yellow-50', textClass: 'text-yellow-700', borderClass: 'border-yellow-200' },
        EM_ATENDIMENTO: { label: 'Em Atend.', icon: Users, color: 'purple', bgClass: 'bg-purple-50', textClass: 'text-purple-700', borderClass: 'border-purple-200' },
        MINHAS_CONVERSAS: { label: 'Minhas', icon: UserCheck, color: 'green', bgClass: 'bg-green-50', textClass: 'text-green-700', borderClass: 'border-green-200' },
        ENCERRADOS: { label: 'Encerrados', icon: Archive, color: 'gray', bgClass: 'bg-gray-50', textClass: 'text-gray-700', borderClass: 'border-gray-200' }
    };

    // Dynamic color for Principal queue based on count
    const getPrincipalQueueStyle = (count: number) => {
        if (count === 0) return { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200', pulse: false };
        if (count <= 3) return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', pulse: false };
        if (count <= 7) return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', pulse: false };
        return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', pulse: true };
    };

    // Fetch conversations
    const fetchConversations = async () => {
        try {
            const response = await api.get('/api/conversations');
            setConversations(response.data.conversations || []);
        } catch (error) {
            console.error('Error fetching conversations:', error);
            toast.error('Erro ao carregar conversas');
        } finally {
            setLoading(false);
        }
    };

    // Fetch messages for selected conversation
    const fetchMessages = async (conversationPhone: string) => {
        try {
            const response = await api.get(`/api/conversations/${conversationPhone}`);
            const msgs = (response.data?.messages || []).map((m: any) => ({
                id: m.id,
                conversationId: response.data.id || conversationPhone,
                sender: (m.from === 'USER' ? 'PATIENT' : (m.from === 'BOT' ? 'BOT' : 'AGENT')),
                messageText: m.messageText,
                messageType: m.messageType || 'TEXT',
                mediaUrl: m.mediaUrl,
                direction: m.direction,
                timestamp: m.timestamp,
                status: m.direction === 'SENT' ? 'SENT' : 'PENDING',
                metadata: m.metadata
            }));
            setMessages(msgs);

            // Update selected conversation data with complete response
            const conv = response.data;
            if (conv) {
                setSelectedConversation({
                    id: conv.id,
                    phone: conv.phone,
                    status: conv.status,
                    lastMessage: conv.lastMessage,
                    lastTimestamp: conv.lastTimestamp,
                    patient: conv.patient,
                    assignedTo: conv.assignedTo,
                    assignedToId: conv.assignedToId,
                    priority: conv.priority || 'MEDIUM',
                    createdAt: conv.createdAt,
                    updatedAt: conv.updatedAt,
                    sessionStartTime: conv.sessionStartTime,
                    sessionExpiryTime: conv.sessionExpiryTime,
                    sessionStatus: conv.sessionStatus,
                    lastUserActivity: conv.lastUserActivity,
                    channel: conv.channel || 'whatsapp'
                });
            } else {
                // If no conversation data, clear selection
                setSelectedConversation(null);
                setMessages([]);
            }
        } catch (error: any) {
            console.error('Error fetching messages:', error);
            console.error('Error details:', {
                status: error?.response?.status,
                statusText: error?.response?.statusText,
                data: error?.response?.data,
                message: error?.message
            });
            
            // Check if it's a 404 or auth error
            if (error?.response?.status === 404) {
                toast.error('Conversa não encontrada');
                setSelectedConversation(null);
                setMessages([]);
            } else if (error?.response?.status === 401 || error?.response?.status === 403) {
                toast.error('Sem permissão para acessar esta conversa');
                // Don't redirect, just clear selection
                setSelectedConversation(null);
                setMessages([]);
                // Prevent interceptor from redirecting
                error._handled = true;
            } else {
                toast.error('Erro ao carregar conversa');
                setSelectedConversation(null);
                setMessages([]);
            }
        }
    };

    // Filter conversations by queue
    const filteredConversations = conversations.filter(c => {
        // Search filter
        if (searchQuery && c.patient) {
            const search = searchQuery.toLowerCase();
            const matchesSearch =
                c.patient.name?.toLowerCase().includes(search) ||
                c.phone.includes(search);
            if (!matchesSearch) return false;
        }

        // Queue filter
        switch (activeQueue) {
            case 'BOT_QUEUE':
                return c.status === 'BOT_QUEUE';
            case 'PRINCIPAL':
                return c.status === 'PRINCIPAL' && !c.assignedToId;
            case 'EM_ATENDIMENTO':
                return c.status === 'EM_ATENDIMENTO' && c.assignedToId !== null;
            case 'MINHAS_CONVERSAS':
                return c.assignedToId === user?.id;
            case 'ENCERRADOS':
                return c.status === 'FECHADA';
            default:
                return false;
        }
    });

    const getQueueCount = (queue: QueueType) => {
        return conversations.filter(c => {
            switch (queue) {
                case 'BOT_QUEUE': return c.status === 'BOT_QUEUE';
                case 'PRINCIPAL': return c.status === 'PRINCIPAL' && !c.assignedToId;
                case 'EM_ATENDIMENTO': return c.status === 'EM_ATENDIMENTO' && c.assignedToId !== null;
                case 'MINHAS_CONVERSAS': return c.assignedToId === user?.id;
                case 'ENCERRADOS': return c.status === 'FECHADA';
                default: return false;
            }
        }).length;
    };

    // Assume conversation
    const handleAssume = async (conversation: Conversation) => {
        try {
            await api.post('/api/conversations/actions', {
                action: 'take',
                phone: conversation.phone,
                assignTo: user?.id
            });
            toast.success('Conversa assumida com sucesso!');
            fetchConversations();
            if (selectedConversation?.id === conversation.id) {
                fetchMessages(conversation.phone);
            }
        } catch (error) {
            console.error('Error assuming conversation:', error);
            toast.error('Erro ao assumir conversa');
        }
    };

    // Fetch available agents
    const fetchAgents = async () => {
        try {
            const response = await api.get('/api/users?role=AGENT');
            setAvailableAgents(response.data.users || response.data);
        } catch (error) {
            console.error('Error fetching agents:', error);
            toast.error('Erro ao buscar atendentes');
        }
    };

    // Transfer conversation
    const handleTransfer = async () => {
        if (!selectedConversation || !transferTarget) return;

        try {
            const action = transferTarget === 'QUEUE' ? 'return' : 'transfer';
            await api.post('/api/conversations/actions', {
                action,
                phone: selectedConversation.phone,
                assignTo: transferTarget === 'QUEUE' ? null : transferTarget
            });

            toast.success(
                transferTarget === 'QUEUE'
                    ? 'Conversa retornada para fila principal'
                    : 'Conversa transferida com sucesso'
            );

            setShowTransferModal(false);
            setTransferTarget('');
            fetchConversations();
        } catch (error) {
            console.error('Error transferring conversation:', error);
            toast.error('Erro ao transferir conversa');
        }
    };

    // Close conversation
    const handleClose = async () => {
        if (!selectedConversation) return;

        try {
            await api.post('/api/conversations/actions', {
                action: 'close',
                phone: selectedConversation.phone
            });

            toast.success('Conversa encerrada com sucesso');
            setShowCloseModal(false);
            setSelectedConversation(null);
            fetchConversations();
        } catch (error) {
            console.error('Error closing conversation:', error);
            toast.error('Erro ao encerrar conversa');
        }
    };

    // Reopen conversation
    const handleReopen = async (conversation: Conversation) => {
        try {
            await api.post('/api/conversations/actions', {
                action: 'reopen',
                phone: conversation.phone
            });
            toast.success('Conversa reaberta com sucesso');
            fetchConversations();
            if (selectedConversation?.id === conversation.id) {
                setSelectedConversation(null);
            }
        } catch (error) {
            console.error('Error reopening conversation:', error);
            toast.error('Erro ao reabrir conversa');
        }
    };

    // Fetch session information
    const fetchSessionInfo = async (conversationId: string) => {
        try {
            const response = await api.get(`/api/conversations/${conversationId}/session`);
            const session = response.data.session;
            
            // Ensure timeRemainingFormatted is calculated if missing
            if (!session.timeRemainingFormatted && session.timeRemaining) {
                const formatMs = (ms: number): string => {
                    const hours = Math.floor(ms / (1000 * 60 * 60));
                    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
                    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                };
                session.timeRemainingFormatted = formatMs(session.timeRemaining);
            }
            
            setSessionInfo(session);
        } catch (error) {
            console.error('Error fetching session info:', error);
            setSessionInfo(null);
        }
    };




    // Send message with optimistic update
    const sendMessage = async () => {
        if ((!newMessage.trim() && pendingFiles.length === 0 && !audioBlob) || sending) return;

        const messageText = newMessage.trim();
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        const now = new Date().toISOString();

        // OPTIMISTIC UPDATE: Adicionar mensagem imediatamente ao estado
        if (messageText) {
            const optimisticMessage: Message = {
                id: tempId,
                conversationId: selectedConversation!.id,
                sender: 'AGENT',
                messageText: messageText,
                messageType: 'TEXT',
                direction: 'SENT',
                timestamp: now,
                status: 'PENDING', // Será atualizado quando receber confirmação
            };
            
            setMessages(prev => [...prev, optimisticMessage]);
            setNewMessage(''); // Limpar campo imediatamente
        }

        setSending(true);
        try {
            // Send text
            if (messageText) {
                await api.post('/api/conversations/send', {
                    phone: selectedConversation!.phone,
                    text: messageText,
                    from: 'AGENT'
                });
                // Não precisa fazer fetchMessages - o evento Socket.IO vai atualizar
            }

            // Send files
            if (pendingFiles.length > 0) {
                const formData = new FormData();
                pendingFiles.forEach(file => formData.append('files', file));
                await api.post(`/api/conversations/${selectedConversation!.id}/files`, formData);
                setPendingFiles([]);
            }

            // Send audio
            if (audioBlob) {
                const formData = new FormData();
                formData.append('files', audioBlob, `audio_message.${audioExt}`);
                await api.post(`/api/conversations/${selectedConversation!.id}/files`, formData);
                setAudioBlob(null);
                setAudioUrl(null);
            }

            // Atualizar status da mensagem otimista para SENT quando receber confirmação
            // O evento Socket.IO vai substituir a mensagem temporária pela real
        } catch (error) {
            console.error('Error sending message:', error);
            
            // Remover mensagem otimista em caso de erro
            if (messageText) {
                setMessages(prev => prev.filter(m => m.id !== tempId));
            }
            
            // Restaurar texto no campo
            if (messageText) {
                setNewMessage(messageText);
            }
            
            toast.error('Erro ao enviar mensagem');
        } finally {
            setSending(false);
        }
    };

    // Audio recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const ogg = 'audio/ogg;codecs=opus';
            const supportsOgg = (window as any).MediaRecorder && (MediaRecorder as any).isTypeSupported && MediaRecorder.isTypeSupported(ogg);
            const recorder = supportsOgg ? new MediaRecorder(stream, { mimeType: ogg }) : new MediaRecorder(stream);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = () => {
                const baseMime = (recorder.mimeType || '').split(';')[0] || 'audio/webm';
                const ext = baseMime === 'audio/ogg' ? 'ogg' : 'webm';
                const blob = new Blob(chunks, { type: baseMime });
                const url = URL.createObjectURL(blob);
                setAudioBlob(blob);
                setAudioUrl(url);
                setAudioMime(baseMime);
                setAudioExt(ext);
                stream.getTracks().forEach(track => track.stop());
                if (autoSendAfterStop) {
                    setAutoSendAfterStop(false);
                    setTimeout(() => {
                        if (canWrite) {
                            sendMessage();
                        }
                    }, 50);
                }
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        } catch (error) {
            console.error('Error starting recording:', error);
            toast.error('Erro ao acessar microfone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const cancelRecording = () => {
        stopRecording();
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingTime(0);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    // Effects
    useEffect(() => {
        fetchConversations();
        fetchAgents();
        const interval = setInterval(fetchConversations, 30000);
        return () => clearInterval(interval);
    }, []);


    useEffect(() => {
        if (phone) {
            const conv = conversations.find(c => c.phone === phone);
            if (conv) {
                setSelectedConversation(conv);
                fetchMessages(phone);
            } else {
                // If conversation not in list, try to fetch it directly
                // This handles cases where conversation was just moved to a queue
                fetchMessages(phone).catch((error) => {
                    console.error('Error fetching conversation:', error);
                    // Don't redirect, just show error
                    toast.error('Conversa não encontrada');
                });
            }
        } else {
            setSelectedConversation(null);
            setMessages([]);
        }
    }, [phone, conversations]);

    // Fetch session info when conversation is selected
    useEffect(() => {
        if (selectedConversation?.id) {
            fetchSessionInfo(selectedConversation.id);
        } else {
            setSessionInfo(null);
        }
    }, [selectedConversation?.id]);


    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!socket || !selectedConversation) return;

        // Join both phone and conversation ID rooms for compatibility
        socket.emit('join_conversation', selectedConversation.phone);
        socket.emit('join_conversation', selectedConversation.id);
        console.log(`🔌 Joined rooms: conv:${selectedConversation.phone} and conv:${selectedConversation.id}`);

        const onNewMessage = (payload: any) => {
            console.log('📨 Message event received:', payload);
            const phoneMatch = payload?.phone === selectedConversation.phone;
            const idMatch = payload?.message?.conversationId === selectedConversation.id || payload?.conversation?.id === selectedConversation.id;
            
            if (phoneMatch || idMatch) {
                const messageData = payload?.message || payload;
                if (messageData && messageData.id) {
                    if (processedMessageIdsRef.current.has(messageData.id)) {
                        return;
                    }
                    processedMessageIdsRef.current.add(messageData.id);
                    if (processedMessageIdsRef.current.size > 200) {
                        const it = processedMessageIdsRef.current.values();
                        const first = it.next().value;
                        processedMessageIdsRef.current.delete(first);
                    }
                    // Adicionar mensagem diretamente ao estado (mais rápido!)
                    const newMessage: Message = {
                        id: messageData.id,
                        conversationId: messageData.conversationId || selectedConversation.id,
                        sender: (messageData.from === 'USER' ? 'PATIENT' : (messageData.from === 'BOT' ? 'BOT' : 'AGENT')),
                        messageText: messageData.messageText,
                        messageType: messageData.messageType || 'TEXT',
                        mediaUrl: messageData.mediaUrl,
                        direction: messageData.direction,
                        timestamp: messageData.timestamp || new Date().toISOString(),
                        status: messageData.direction === 'SENT' ? 'SENT' : 'PENDING',
                        metadata: messageData.metadata
                    };
                    
                    // Verificar se a mensagem já existe ou substituir mensagem otimista
                    setMessages(prev => {
                        // Verificar duplicatas PRIMEIRO
                        if (prev.some(m => m.id === newMessage.id)) {
                            console.log('⚠️ Mensagem já existe, ignorando duplicata:', newMessage.id);
                            return prev; // Não fazer nada se já existe
                        }
                        
                        // Remover mensagens temporárias (optimistic updates) com mesmo texto
                        const filtered = prev.filter(m => {
                            // Se for mensagem temporária e o texto corresponder, remover
                            if (m.id.startsWith('temp-') && m.messageText === newMessage.messageText && m.sender === 'AGENT') {
                                console.log('🔄 Substituindo mensagem otimista pela real:', m.id, '->', newMessage.id);
                                return false;
                            }
                            return true;
                        });
                        
                        // Adicionar a mensagem real
                        console.log('✅ Adicionando mensagem ao estado:', newMessage.id);
                        return [...filtered, newMessage];
                    });
                    
                    // Atualizar última mensagem da conversa
                    if (payload?.conversation) {
                        setSelectedConversation(prev => prev ? {
                            ...prev,
                            lastMessage: messageData.messageText,
                            lastTimestamp: messageData.timestamp
                        } : prev);
                    }
                } else {
                    // Fallback: se não tiver dados completos, fazer fetch
                    console.log('⚠️ Payload incompleto, fazendo fetch...');
                    fetchMessages(selectedConversation.phone);
                }
            }
        };

        const onConversationUpdated = (updated: any) => {
            console.log('🔄 Conversation updated event received:', updated);
            if (updated?.phone === selectedConversation.phone || updated?.id === selectedConversation.id) {
                // Avoid loops: refresh only if lastTimestamp changed
                const changed = !!updated?.lastTimestamp && updated.lastTimestamp !== selectedConversation.lastTimestamp;
                if (changed) {
                    console.log('✅ Conversation update matches (changed), refreshing...');
                    fetchMessages(selectedConversation.phone);
                    fetchConversations();
                } else {
                    console.log('⏭️ Conversation update ignored (no timestamp change)');
                }
            }
        };

        // Escutar eventos separadamente:
        // - message_sent: mensagens enviadas pelo agente (evita duplicatas com optimistic update)
        // - new_message: mensagens recebidas do paciente/bot
        const onMessageSent = (payload: any) => {
            // Apenas processar se for mensagem enviada pelo agente
            if (payload?.message?.from === 'AGENT' || payload?.message?.direction === 'SENT') {
                onNewMessage(payload);
            }
        };
        
        const onNewMessageReceived = (payload: any) => {
            // Apenas processar se for mensagem recebida (não enviada)
            if (payload?.message?.from === 'USER' || payload?.message?.from === 'BOT' || payload?.message?.direction === 'RECEIVED') {
                onNewMessage(payload);
            }
        };

        socket.on('message_sent', onMessageSent);
        socket.on('new_message', onNewMessageReceived);
        socket.on('conversation_updated', onConversationUpdated);
        socket.on('queue_updated', onConversationUpdated);

        return () => {
            socket.emit('leave_conversation', selectedConversation.phone);
            socket.emit('leave_conversation', selectedConversation.id);
            socket.off('message_sent', onMessageSent);
            socket.off('new_message', onNewMessageReceived);
            socket.off('conversation_updated', onConversationUpdated);
            socket.off('queue_updated', onConversationUpdated);
        };
    }, [socket, selectedConversation]);

    return (
        <div className="flex h-screen bg-gray-50 overflow-x-hidden">
            {/* Custom Scrollbar Styles */}
            <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>

            {/* Sidebar */}
            <div className="w-[420px] bg-white border-r border-gray-200 flex flex-col">{/* Increased from 384px to 420px */}
                {/* Sidebar Header */}
                <div className="p-4 border-b border-gray-200">
                    <h1 className="text-xl font-bold text-gray-900 mb-3">Conversas</h1>
                    <input
                        type="text"
                        placeholder="Buscar por nome, telefone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Queue Tabs */}
                <div className="px-3 py-2 border-b border-gray-200">
                    <div className="flex gap-1.5">
                        {(Object.keys(queueConfigs) as QueueType[]).map((queue) => {
                            const config = queueConfigs[queue];
                            const Icon = config.icon;
                            const count = getQueueCount(queue);
                            const isActive = activeQueue === queue;

                            // Special styling for Principal queue
                            let queueStyle = { bg: config.bgClass, text: config.textClass, border: config.borderClass, pulse: false };
                            if (queue === 'PRINCIPAL') {
                                queueStyle = getPrincipalQueueStyle(count);
                            }

                            return (
                                <button
                                    key={queue}
                                    onClick={() => setActiveQueue(queue)}
                                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${isActive
                                        ? `${queueStyle.bg} ${queueStyle.text} border ${queueStyle.border} ${queueStyle.pulse ? 'animate-pulse-slow' : ''}`
                                        : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                                    {isActive && <span className="whitespace-nowrap">{config.label}</span>}
                                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${isActive ? 'bg-white/60' : 'bg-gray-200'
                                        } ${queue === 'PRINCIPAL' && count > 0 ? 'bg-red-500 text-white animate-pulse' : ''}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            Nenhuma conversa nesta fila
                        </div>
                    ) : (
                        filteredConversations.map((conversation) => {
                            const isSelected = selectedConversation?.id === conversation.id;
                            const canAssume = (conversation.status === 'BOT_QUEUE' || conversation.status === 'PRINCIPAL') && !conversation.assignedToId;

                            return (
                                <div
                                    key={conversation.id}
                                    onClick={() => navigate(`/conversations/${conversation.phone}`)}
                                    className={`mx-2 my-2 p-3 border rounded-lg cursor-pointer transition-all ${isSelected
                                        ? 'bg-blue-100 border-blue-300 border-l-4 border-l-blue-600 shadow-md'
                                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:shadow-sm border-l-4 border-l-transparent'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                                <User className="h-5 w-5 text-gray-500" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <h3 className="font-medium text-gray-900 text-sm">
                                                        {conversation.patient?.name || conversation.phone}
                                                    </h3>
                                                    {/* Channel icon */}
                                                    {conversation.channel === 'whatsapp' && (
                                                        <svg className="w-3.5 h-3.5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                                        </svg>
                                                    )}
                                                    {conversation.channel === 'instagram' && (
                                                        <svg className="w-3.5 h-3.5 text-pink-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                                        </svg>
                                                    )}
                                                    {conversation.channel === 'messenger' && (
                                                        <svg className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M12 2C6.486 2 2 6.262 2 11.5c0 2.847 1.277 5.44 3.355 7.156l-.319 2.73a.5.5 0 00.72.544l3.045-1.373A10.963 10.963 0 0012 21c5.514 0 10-4.262 10-9.5S17.514 2 12 2zm1.222 12.278l-2.508-2.672-4.896 2.672 5.381-5.713 2.57 2.672 4.834-2.672-5.381 5.713z"/>
                                                        </svg>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500">{conversation.phone}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            {conversation.lastTimestamp ? formatTimestamp(conversation.lastTimestamp) : ''}
                                        </span>
                                    </div>

                                    {conversation.lastMessage && (
                                        <p className="text-xs text-gray-600 mb-2 line-clamp-1 ml-12">
                                            {conversation.lastMessage}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between ml-12">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${conversation.status === 'PRINCIPAL'
                                            ? 'bg-orange-100 text-orange-700'
                                            : conversation.status === 'EM_ATENDIMENTO'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {conversation.status === 'PRINCIPAL' ? 'Fila Principal' :
                                                conversation.status === 'EM_ATENDIMENTO' ? (conversation.assignedToId === user?.id ? 'Com você' : conversation.assignedTo?.name || 'Em atendimento') :
                                                    conversation.status === 'BOT_QUEUE' ? 'Bot' : 'Encerrado'}
                                        </span>

                                        {/* Show "Assumir" button for BOT_QUEUE and PRINCIPAL */}
                                        {canAssume && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAssume(conversation);
                                                }}
                                                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                                            >
                                                Assumir
                                            </button>
                                        )}

                                        {/* Show "Reabrir" button for FECHADA conversations */}
                                        {conversation.status === 'FECHADA' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleReopen(conversation);
                                                }}
                                                className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition-colors"
                                            >
                                                Reabrir
                                            </button>
                                        )}

                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            {selectedConversation ? (
                <div className="flex-1 flex flex-col">
                    {/* Chat Header */}
                    <div className="bg-white border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                    <User className="h-5 w-5 text-gray-500" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-gray-900">
                                        {selectedConversation.patient?.name || selectedConversation.phone}
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm text-gray-500">{selectedConversation.phone}</p>
                                        {/* Channel icon - small and next to phone */}
                                        {selectedConversation.channel === 'whatsapp' && (
                                            <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                            </svg>
                                        )}
                                        {selectedConversation.channel === 'instagram' && (
                                            <svg className="w-3.5 h-3.5 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                            </svg>
                                        )}
                                        {selectedConversation.channel === 'messenger' && (
                                            <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 2C6.486 2 2 6.262 2 11.5c0 2.847 1.277 5.44 3.355 7.156l-.319 2.73a.5.5 0 00.72.544l3.045-1.373A10.963 10.963 0 0012 21c5.514 0 10-4.262 10-9.5S17.514 2 12 2zm1.222 12.278l-2.508-2.672-4.896 2.672 5.381-5.713 2.57 2.672 4.834-2.672-5.381 5.713z"/>
                                            </svg>
                                        )}
                                        {/* Session status tag */}
                                        {sessionInfo && (() => {
                                            const formatTime = (ms: number | null | undefined): string => {
                                                if (!ms || ms <= 0) return 'Expirada';
                                                const hours = Math.floor(ms / (1000 * 60 * 60));
                                                const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
                                                return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                                            };
                                            
                                            const timeFormatted = sessionInfo.timeRemainingFormatted || 
                                                (sessionInfo.timeRemaining ? formatTime(sessionInfo.timeRemaining) : null);
                                            
                                            if (!timeFormatted && !sessionInfo.canSendMessage) {
                                                return (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                                        ⏰ Expirada
                                                    </span>
                                                );
                                            }
                                            
                                            if (!timeFormatted) {
                                                return null; // Não mostrar se não houver tempo
                                            }
                                            
                                            const isWarning = sessionInfo.status === 'warning' || 
                                                (sessionInfo.timeRemaining && sessionInfo.timeRemaining < 3600000);
                                            const isExpired = sessionInfo.status === 'expired' || !sessionInfo.canSendMessage;
                                            
                                            return (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    isExpired ? 'bg-red-50 text-red-700 border border-red-200' :
                                                    isWarning ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                                                    'bg-green-50 text-green-700 border border-green-200'
                                                }`}>
                                                    {isExpired ? '⏰ Expirada' :
                                                     isWarning ? `⚠️ ${timeFormatted}` :
                                                     `✅ ${timeFormatted}`}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${canWrite
                                    ? 'bg-green-100 text-green-700'
                                    : selectedConversation.assignedTo && selectedConversation.assignedTo.id !== user?.id
                                        ? 'bg-purple-100 text-purple-700'
                                        : selectedConversation.status === 'BOT_QUEUE'
                                            ? 'bg-blue-100 text-blue-700'
                                            : selectedConversation.status === 'PRINCIPAL'
                                                ? 'bg-yellow-100 text-yellow-700'
                                                : 'bg-gray-100 text-gray-700'
                                    }`}>
                                    {canWrite ? 'Com você' :
                                        selectedConversation.assignedTo && selectedConversation.assignedTo.id !== user?.id
                                            ? selectedConversation.assignedTo.name
                                            : selectedConversation.status === 'BOT_QUEUE' ? 'Bot'
                                                : selectedConversation.status === 'PRINCIPAL' ? 'Aguardando'
                                                    : selectedConversation.status === 'FECHADA' ? 'Encerrado' : 'Aguardando'}
                                </span>

                                {/* History button - always clickable */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        console.log('🔍 History button clicked!', {
                                            hasConversation: !!selectedConversation,
                                            conversationId: selectedConversation?.id,
                                            phone: selectedConversation?.phone,
                                            patientId: selectedConversation?.patient?.id,
                                            currentModalState: showHistoryModal
                                        });
                                        if (selectedConversation) {
                                            setShowHistoryModal(true);
                                            console.log('✅ Modal state set to true');
                                        } else {
                                            console.log('❌ No conversation selected');
                                        }
                                    }}
                                    disabled={!selectedConversation}
                                    className={`p-2 rounded-lg transition-colors group ${
                                        selectedConversation 
                                            ? 'hover:bg-purple-50 cursor-pointer' 
                                            : 'opacity-50 cursor-not-allowed'
                                    }`}
                                    title={selectedConversation ? "Ver histórico de conversas" : "Selecione uma conversa"}
                                >
                                    <History className={`h-5 w-5 ${
                                        selectedConversation 
                                            ? 'text-purple-600 group-hover:text-purple-700' 
                                            : 'text-gray-400'
                                    }`} />
                                </button>

                                {/* Transfer button - only if user has write access */}
                                {canWrite && (
                                    <button
                                        onClick={() => setShowTransferModal(true)}
                                        className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                                        title="Transferir conversa"
                                    >
                                        <Users className="h-5 w-5 text-blue-600 group-hover:text-blue-700" />
                                    </button>
                                )}

                                {/* Close button - only if user has write access */}
                                {canWrite && (
                                    <button
                                        onClick={() => setShowCloseModal(true)}
                                        className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                                        title="Encerrar conversa"
                                    >
                                        <Archive className="h-5 w-5 text-red-600 group-hover:text-red-700" />
                                    </button>
                                )}

                                {/* More options */}
                                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <MoreVertical className="h-5 w-5 text-gray-600" />
                                </button>

                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-3 bg-gray-50 custom-scrollbar">
                        {messages.map((message) => {
                            const isAgent = message.sender === 'AGENT';
                            const isBot = message.sender === 'BOT';
                            const isPatient = message.sender === 'PATIENT';

                            return (
                                <div key={message.id} className={`flex ${isAgent || isBot ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-md px-4 py-2 rounded-2xl shadow-sm relative group ${isAgent || isBot
                                        ? 'bg-blue-600 text-white rounded-br-sm'
                                        : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                                        }`}>
                                        {/* delete icon removed by request */}
                                        {message.messageType === 'TEXT' && (
                                            <p className="text-sm whitespace-pre-wrap">{message.messageText}</p>
                                        )}

                                        {message.messageType === 'IMAGE' && message.mediaUrl && (
                                            <div className="space-y-2">
                                                <img
                                                    src={message.mediaUrl}
                                                    alt="Imagem"
                                                    className="max-w-full max-h-96 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => window.open(message.mediaUrl!, '_blank')}
                                                />
                                                {message.messageText && message.messageText !== 'Imagem recebida' && message.messageText !== 'Imagem enviada' && (
                                                    <p className="text-sm whitespace-pre-wrap">{message.messageText}</p>
                                                )}
                                            </div>
                                        )}

                                        {message.messageType === 'AUDIO' && message.mediaUrl && (
                                            <div className="space-y-2">
                                                <audio controls src={message.mediaUrl} className="max-w-full" />
                                            </div>
                                        )}

                                        {message.messageType === 'DOCUMENT' && message.mediaUrl && (
                                            <div className="space-y-2">
                                                <a
                                                    href={message.mediaUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-sm hover:underline"
                                                >
                                                    <FileText className="h-4 w-4" />
                                                    {message.metadata?.filename || message.messageText || 'Documento'}
                                                </a>
                                            </div>
                                        )}

                                        <p className={`text-xs mt-1 ${isAgent || isBot ? 'text-white/70' : 'text-gray-500'}`}>
                                            {formatTimestamp(message.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="bg-white border-t border-gray-200 p-4">
                        {!canWrite && (
                            <div className="mb-3 flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-800">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span>
                                    {selectedConversation.status === 'BOT_QUEUE'
                                        ? 'Esta conversa está sendo atendida pelo bot. Clique em "Assumir" para atender.'
                                        : selectedConversation.status === 'PRINCIPAL'
                                            ? 'Esta conversa está aguardando atendimento. Clique em "Assumir" para começar.'
                                            : selectedConversation.status === 'FECHADA'
                                                ? 'Esta conversa foi encerrada.'
                                                : selectedConversation.assignedTo && selectedConversation.assignedTo.id !== user?.id
                                                    ? `Esta conversa está sendo atendida por ${selectedConversation.assignedTo.name}.`
                                                    : 'Você precisa assumir esta conversa para responder.'}
                                </span>
                            </div>
                        )}

                        {/* Previews */}
                        {(pendingFiles.length > 0 || audioBlob) && (
                            <div className="mb-3 flex gap-2 overflow-x-auto no-scrollbar pb-2">
                                {pendingFiles.map((file, i) => (
                                    <div key={i} className="relative group bg-gray-50 border border-gray-200 rounded-lg p-2 w-20 flex-shrink-0">
                                        <button
                                            onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                        <div className="flex flex-col items-center">
                                            {file.type.startsWith('image/') ? <ImageIcon className="h-8 w-8 text-gray-400" /> : <File className="h-8 w-8 text-gray-400" />}
                                            <span className="text-[10px] text-gray-600 truncate w-full text-center mt-1">{file.name}</span>
                                        </div>
                                    </div>
                                ))}
                                {audioBlob && audioUrl && (
                                    <div className="relative bg-blue-50 border border-blue-200 rounded-lg p-2 w-48 flex-shrink-0 flex items-center justify-center">
                                        <button
                                            onClick={cancelRecording}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                        <audio controls src={audioUrl} className="w-full h-8" />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*,audio/*,.pdf,.doc,.docx"
                                onChange={(e) => {
                                    console.log('📁 Arquivos selecionados:', e.target.files?.length);
                                    if (e.target.files) {
                                        const list = Array.from(e.target.files!);
                                        setPendingFiles(prev => [...prev, ...list]);
                                        if (canWrite && list.length > 0 && !sending) {
                                            setTimeout(() => sendMessage(), 10);
                                        }
                                        e.target.value = '';
                                    }
                                }}
                                className="hidden"
                                disabled={!canWrite}
                            />

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('📎 Clique no botão de anexar', { canWrite, fileInputRef: !!fileInputRef.current });
                                    fileInputRef.current?.click();
                                }}
                                disabled={!canWrite}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                title={!canWrite ? 'Assuma a conversa para enviar arquivos' : 'Anexar arquivo'}
                            >
                                <Paperclip className="h-5 w-5 text-gray-600" />
                            </button>

                            <div className="flex-1 relative">
                                {isRecording ? (
                                    <div className="flex items-center justify-center py-2">
                                        <div className="flex flex-col items-center">
                                            <button onClick={stopRecording} className="p-2 rounded-full bg-red-600 text-white animate-pulse" title="Parar gravação">
                                                <Mic className="h-5 w-5" />
                                            </button>
                                            <span className="mt-1 text-xs text-red-600 font-medium">{formatTime(recordingTime)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => {
                                            // Atualização direta sem debounce para resposta instantânea
                                            setNewMessage(e.target.value);
                                        }}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey && (canSend || isRecording)) {
                                                if (isRecording) {
                                                    setAutoSendAfterStop(true);
                                                    stopRecording();
                                                    return;
                                                }
                                                sendMessage();
                                            }
                                        }}
                                        placeholder="Digite sua mensagem..."
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={!canWrite}
                                    />
                                )}
                            </div>

                            {showMicButton ? (
                                <button
                                    onClick={startRecording}
                                    disabled={!canWrite}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-red-600 disabled:opacity-50"
                                >
                                    <Mic className="h-5 w-5" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        if (isRecording) {
                                            setAutoSendAfterStop(true);
                                            stopRecording();
                                            return;
                                        }
                                        sendMessage();
                                    }}
                                    disabled={!(canSend || isRecording)}
                                    className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                                >
                                    <Send className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                        <div className="bg-gray-200 p-6 rounded-full mx-auto mb-4 w-16 h-16 flex items-center justify-center">
                            <Phone className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione uma conversa</h3>
                        <p className="text-gray-500">Escolha uma conversa ao lado para começar</p>
                    </div>
                </div>
            )}

            {/* Transfer Modal */}
            {showTransferModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Transferir Conversa</h3>
                            <button
                                onClick={() => {
                                    setShowTransferModal(false);
                                    setTransferTarget('');
                                }}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-3 mb-6 max-h-96 overflow-y-auto custom-scrollbar">
                            {/* Return to queue option */}
                            <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                <input
                                    type="radio"
                                    name="transfer"
                                    value="QUEUE"
                                    checked={transferTarget === 'QUEUE'}
                                    onChange={(e) => setTransferTarget(e.target.value)}
                                    className="mr-3"
                                />
                                <div>
                                    <div className="font-medium text-gray-900">Fila Principal</div>
                                    <div className="text-sm text-gray-500">Retornar para fila de aguardo</div>
                                </div>
                            </label>

                            {/* Available agents */}
                            {availableAgents
                                .filter(agent => agent.id !== user?.id)
                                .map(agent => (
                                    <label
                                        key={agent.id}
                                        className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                                    >
                                        <input
                                            type="radio"
                                            name="transfer"
                                            value={agent.id}
                                            checked={transferTarget === agent.id}
                                            onChange={(e) => setTransferTarget(e.target.value)}
                                            className="mr-3"
                                        />
                                        <div>
                                            <div className="font-medium text-gray-900">{agent.name}</div>
                                            <div className="text-sm text-gray-500">{agent.email}</div>
                                        </div>
                                    </label>
                                ))}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowTransferModal(false);
                                    setTransferTarget('');
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleTransfer}
                                disabled={!transferTarget}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Transferir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Close Confirmation Modal */}
            {showCloseModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Encerrar Conversa</h3>
                            <button
                                onClick={() => setShowCloseModal(false)}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        <p className="text-gray-600 mb-6">
                            Tem certeza que deseja encerrar esta conversa?
                            Ela será movida para a aba "Encerrados".
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCloseModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleClose}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Encerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistoryModal && selectedConversation && (
                <>
                    {console.log('🎯 Rendering History Modal:', {
                        showHistoryModal,
                        conversationId: selectedConversation.id,
                        phone: selectedConversation.phone,
                        patientId: selectedConversation.patient?.id
                    })}
                    <ConversationHistoryModal
                        key={`history-modal-${selectedConversation.id}`}
                        patientId={selectedConversation.patient?.id}
                        patientPhone={selectedConversation.phone}
                        patientName={selectedConversation.patient?.name || `Paciente ${selectedConversation.phone.slice(-4)}`}
                        onClose={() => {
                            console.log('🔒 Closing modal');
                            setShowHistoryModal(false);
                        }}
                    />
                </>
            )}
        </div>

    );
};

export default ConversationsPage;
