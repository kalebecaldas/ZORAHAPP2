import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    Phone, User, Bot, Clock, Users, UserCheck, Archive,
    Send, Paperclip, Mic, StopCircle, X, Image as ImageIcon,
    File, Trash2, Video, MoreVertical, PhoneCall, AlertCircle,
    Shield, CheckCircle2, History, FileText, Zap
} from 'lucide-react';
import { api } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { toast, Toaster } from 'sonner';
import ConversationHistoryModal from '../components/ConversationHistoryModal';
import QuickRepliesModal from '../components/QuickRepliesModal';
import '../styles/minimal-theme.css'; // ✅ Importar CSS do badge
import SystemMessage from '../components/chat/SystemMessage';

// ✅ NOVOS: Hooks refatorados
import { useConversations } from '../hooks/conversations/useConversations';
import { useMessages } from '../hooks/conversations/useMessages';
import { useAudioRecorder } from '../hooks/conversations/useAudioRecorder';

// ✅ NOVOS: Componentes refatorados
import { ConversationHeader } from '../components/conversations/ConversationHeader';
import { QueueTabs } from '../components/conversations/QueueTabs';

// ✅ Types importados dos hooks
import type { Conversation } from '../hooks/conversations/useConversations';
import type { Message } from '../hooks/conversations/useMessages';

type QueueType = 'BOT_QUEUE' | 'PRINCIPAL' | 'EM_ATENDIMENTO' | 'MINHAS_CONVERSAS' | 'ENCERRADOS';

const ConversationsPage: React.FC = () => {
    const { phone } = useParams<{ phone: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { socket } = useSocket();

    // States
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    
    // ✅ Debug: Log quando selectedConversation muda
    useEffect(() => {
        console.log('🔄 [selectedConversation] Mudou:', {
            id: selectedConversation?.id,
            phone: selectedConversation?.phone,
            status: selectedConversation?.status,
            assignedToId: selectedConversation?.assignedToId
        });
    }, [selectedConversation]);
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

    // ✅ Quick Replies modal
    const [showQuickRepliesModal, setShowQuickRepliesModal] = useState(false);

    // ✅ Quick Replies autocomplete
    const [quickReplies, setQuickReplies] = useState<any[]>([]);
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const [filteredReplies, setFilteredReplies] = useState<any[]>([]);
    const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(0);

    // ✅ Lazy Loading para Encerrados
    const [closedConversations, setClosedConversations] = useState<Conversation[]>([]);
    const [closedPage, setClosedPage] = useState(1);
    const [closedTotal, setClosedTotal] = useState(0);
    const [loadingClosed, setLoadingClosed] = useState(false);
    const [hasMoreClosed, setHasMoreClosed] = useState(true);


    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [autoSendAfterStop, setAutoSendAfterStop] = useState(false);
    const processedMessageIdsRef = useRef<Set<string>>(new Set());
    const isUserScrollingRef = useRef(false);
    const shouldAutoScrollRef = useRef(true);

    // ✅ Verificar se sessão expirou
    const isSessionExpired = useMemo(() => {
        if (!selectedConversation?.sessionExpiryTime) return false;
        return new Date(selectedConversation.sessionExpiryTime) < new Date();
    }, [selectedConversation]);

    // Permission check
    const canWrite = !!(
        selectedConversation?.assignedTo &&
        user?.id &&
        selectedConversation.assignedTo.id === user.id &&
        selectedConversation.status === 'EM_ATENDIMENTO' &&
        !isSessionExpired // ✅ Bloquear se sessão expirada
    );

    // Memoizar condições para evitar re-renderizações desnecessárias e melhorar performance
    const showMicButton = useMemo(() => {
        return !newMessage.trim() && !isRecording && !audioBlob && pendingFiles.length === 0;
    }, [newMessage, isRecording, audioBlob, pendingFiles.length]);

    const canSend = useMemo(() => {
        return (newMessage.trim() || pendingFiles.length > 0 || audioBlob) && !sending && canWrite;
    }, [newMessage, pendingFiles.length, audioBlob, sending, canWrite]);


    // Fetch conversations
    // Fetch conversations
    // ✅ Fetch active conversations (for counts and active queues)
    const fetchConversations = async () => {
        try {
            // ✅ Buscar conversas ativas E conversas atribuídas ao usuário (mesmo se expiradas)
            // Isso garante que conversas expiradas apareçam em "MINHAS_CONVERSAS"
            const [activeResponse, myConversationsResponse] = await Promise.all([
                api.get('/api/conversations?status=ACTIVE&limit=100'),
                user?.id ? api.get(`/api/conversations?assignedTo=${user.id}&limit=100`).catch(() => ({ data: { conversations: [] } })) : Promise.resolve({ data: { conversations: [] } })
            ]);
            
            const activeConvs = activeResponse.data.conversations || [];
            const myConvs = myConversationsResponse.data.conversations || [];
            
            // ✅ Combinar e remover duplicatas (usar Map para garantir IDs únicos)
            const conversationsMap = new Map<string, any>();
            
            // Adicionar conversas ativas primeiro
            activeConvs.forEach((c: any) => {
                conversationsMap.set(c.id, c);
            });
            
            // Adicionar conversas do usuário (mesmo expiradas) - sobrescreve se já existir
            myConvs.forEach((c: any) => {
                conversationsMap.set(c.id, c);
            });
            
            const convs = Array.from(conversationsMap.values());
            setConversations(convs);
        } catch (error) {
            console.error('Error fetching conversations:', error);
            toast.error('Erro ao carregar conversas');
        } finally {
            setLoading(false);
        }
    };

    // ✅ Fetch closed conversations with pagination and search
    const fetchClosedConversations = async (page = 1, append = false, search = '') => {
        try {
            setLoadingClosed(true);
            // Adicionar timestamp para evitar cache quando necessário
            const response = await api.get(`/api/conversations?status=CLOSED&page=${page}&limit=20&search=${search}&_t=${Date.now()}`);

            const newConversations = response.data.conversations || [];
            const total = response.data.pagination.total;

            setClosedTotal(total);
            setHasMoreClosed(newConversations.length === 20); // If less than limit, no more pages

            if (append) {
                setClosedConversations(prev => [...prev, ...newConversations]);
            } else {
                setClosedConversations(newConversations);
            }
        } catch (error) {
            console.error('Error fetching closed conversations:', error);
            toast.error('Erro ao carregar conversas encerradas');
        } finally {
            setLoadingClosed(false);
        }
    };

    // Fetch messages for selected conversation
    const fetchMessages = async (conversationPhone: string, conversationId?: string) => {
        try {
            console.log('📨 [fetchMessages] Buscando mensagens:', { conversationPhone, conversationId });
            // ✅ Se conversationId for fornecido, buscar por ID (conversa específica)
            // Caso contrário, buscar por phone (conversa mais recente)
            const response = conversationId 
                ? await api.get(`/api/conversations/id/${conversationId}`)
                : await api.get(`/api/conversations/${conversationPhone}`);
            
            console.log('📨 [fetchMessages] Resposta recebida:', { 
                conversationId: response.data?.id, 
                phone: response.data?.phone,
                messagesCount: response.data?.messages?.length 
            });
            
            const msgs = (response.data?.messages || []).map((m: any) => {
                const mapped = {
                    id: m.id,
                    conversationId: response.data.id || conversationPhone,
                    // Use direction as primary source: RECEIVED = PATIENT, SENT = BOT/AGENT
                    sender: m.direction === 'RECEIVED' ? 'PATIENT' : (m.from === 'BOT' ? 'BOT' : 'AGENT'),
                    messageText: m.messageText,
                    messageType: m.messageType || 'TEXT',
                    mediaUrl: m.mediaUrl,
                    direction: m.direction,
                    timestamp: m.timestamp,
                    status: m.direction === 'SENT' ? 'SENT' : 'PENDING',
                    metadata: m.metadata
                };
                // #region agent log
                if (m.metadata?.isClosingMessage) {
                    fetch('http://127.0.0.1:7246/ingest/66ca0116-31ec-44b0-a99a-003bb5ba1c50',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConversationsNew.tsx:227',message:'CLOSING MESSAGE FOUND in fetchMessages',data:{messageId:m.id,direction:m.direction,from:m.from,metadata:m.metadata,mappedSender:mapped.sender,mappedDirection:mapped.direction},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                }
                // #endregion
                return mapped;
            });
            setMessages(msgs);

            // Update selected conversation data with complete response
            const conv = response.data;
            if (conv) {
                console.log('✅ [fetchMessages] Atualizando selectedConversation:', conv.id, 'status:', conv.status);
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
                    channel: conv.channel || 'whatsapp',
                    unreadCount: conv.unreadCount || 0
                });
            } else {
                // If no conversation data, clear selection
                setSelectedConversation(null);
                setMessages([]);
            }

            // ✅ Marcar conversa como lida APENAS se estiver EM_ATENDIMENTO
            // Se não estiver EM_ATENDIMENTO, manter o contador de não lidas
            try {
                const conv = response.data;
                if (conv && conv.status === 'EM_ATENDIMENTO') {
                    // Só marcar como lida se estiver na fila do atendente
                await api.post(`/api/conversations/${conversationPhone}/mark-read`);
                    console.log('📖 Conversa marcada como lida (EM_ATENDIMENTO):', conversationPhone, conversationId ? `(ID: ${conversationId})` : '');
                } else {
                    console.log('⏭️ Conversa não marcada como lida (não está EM_ATENDIMENTO):', conversationPhone, 'status:', conv?.status);
                }
            } catch (error) {
                console.warn('⚠️ Erro ao marcar como lida:', error);
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

    // ✅ Filter conversations by queue FIRST, then apply search
    const filteredConversations = conversations.filter(c => {
        // 1️⃣ Filtrar por fila ativa PRIMEIRO
        if (activeQueue === 'MINHAS_CONVERSAS') {
            if (c.assignedToId !== user?.id) return false;
        } else if (activeQueue === 'ENCERRADOS') {
            if (c.status !== 'FECHADA') return false;
        } else if (activeQueue === 'PRINCIPAL') {
            // ✅ Incluir tanto 'PRINCIPAL' quanto 'AGUARDANDO' (são equivalentes)
            // ✅ Incluir tanto 'PRINCIPAL' quanto 'AGUARDANDO' (são equivalentes)
            const isPrincipal = c.status === 'PRINCIPAL' || (c.status as string) === 'AGUARDANDO';
            if (!isPrincipal || c.assignedToId !== null) return false;
        } else if (activeQueue === 'EM_ATENDIMENTO') {
            if (c.status !== 'EM_ATENDIMENTO' || c.assignedToId === null) return false;
        } else if (activeQueue === 'BOT_QUEUE') {
            if (c.status !== 'BOT_QUEUE') return false;
        } else {
            // Default case if activeQueue is not recognized, or no specific filter applies
            return false;
        }

        // 2️⃣ DEPOIS aplicar busca (somente na fila filtrada)
        if (searchQuery && c.patient) {
            const search = searchQuery.toLowerCase();
            return (
                c.patient.name?.toLowerCase().includes(search) ||
                c.phone.includes(search)
            );
        }

        return true;
    });

    const getQueueCount = (queue: QueueType) => {
        if (queue === ('ENCERRADOS' as QueueType)) return closedTotal; // ✅ Usar total do backend
        return conversations.filter(c => {
            switch (queue) {
                case 'BOT_QUEUE': return c.status === 'BOT_QUEUE';
                case 'PRINCIPAL': 
                    // ✅ Incluir tanto 'PRINCIPAL' quanto 'AGUARDANDO' (são equivalentes)
                    const isPrincipal = c.status === 'PRINCIPAL' || (c.status as string) === 'AGUARDANDO';
                    return isPrincipal && !c.assignedToId;
                case 'EM_ATENDIMENTO': return c.status === 'EM_ATENDIMENTO' && c.assignedToId !== null;
                case 'MINHAS_CONVERSAS': return c.assignedToId === user?.id;
                case 'ENCERRADOS' as QueueType: return c.status === 'FECHADA';
                default: return false;
            }
        }).length;
    };

    // Assume conversation
    const handleAssume = async (conversation: Conversation) => {
        try {
            const response = await api.post('/api/conversations/actions', {
                action: 'take',
                conversationId: conversation.id, // ✅ Usar ID específico
                phone: conversation.phone, // Manter para compatibilidade
                assignTo: user?.id
            });
            
            // ✅ Atualizar selectedConversation com os dados atualizados
            if (selectedConversation?.phone === conversation.phone) {
                const updatedConv = response.data;
                setSelectedConversation({
                    ...selectedConversation,
                    status: updatedConv.status,
                    assignedToId: updatedConv.assignedToId,
                    assignedTo: updatedConv.assignedTo
                });
                // Recarregar mensagens para garantir dados atualizados
                fetchMessages(conversation.phone);
            }
            
            toast.success('Conversa assumida com sucesso!');
            fetchConversations();
        } catch (error: any) {
            console.error('Error assuming conversation:', error);
            toast.error(error?.response?.data?.error || 'Erro ao assumir conversa');
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
                conversationId: selectedConversation.id, // ✅ Usar ID específico
                phone: selectedConversation.phone, // Manter para compatibilidade
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

        const phoneToReload = selectedConversation.phone;
        const conversationIdToReload = selectedConversation.id;

        try {
            await api.post('/api/conversations/actions', {
                action: 'close',
                conversationId: selectedConversation.id,
                phone: selectedConversation.phone
            });

            toast.success('Conversa encerrada com sucesso');
            setShowCloseModal(false);
            
            // ✅ Recarregar mensagens após encerramento para mostrar mensagem template
            // Aguardar um pouco para garantir que o backend processou
            setTimeout(() => {
                if (phoneToReload && conversationIdToReload) {
                    fetchMessages(phoneToReload, conversationIdToReload);
                }
            }, 1000); // Aumentar delay para garantir processamento
            
            // Não limpar selectedConversation imediatamente para manter a conversa visível
            // setSelectedConversation(null);
            fetchConversations();
        } catch (error) {
            console.error('❌ Error closing conversation:', error);
            toast.error('Erro ao encerrar conversa');
        }
    };

    // Reopen conversation
    const handleReopen = async (conversation: Conversation) => {
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/66ca0116-31ec-44b0-a99a-003bb5ba1c50',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConversationsNew.tsx:458',message:'handleReopen ENTRY',data:{conversationId:conversation.id,phone:conversation.phone,closedCountBefore:closedConversations.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        try {
            await api.post('/api/conversations/actions', {
                action: 'reopen',
                conversationId: conversation.id,
                phone: conversation.phone
            });
            
            // ✅ NÃO remover aqui - deixar o evento Socket.IO fazer isso para evitar duplicação
            // O evento Socket.IO já vai remover quando receber conversation_reopened
            
            toast.success('Conversa reaberta com sucesso');
            // #region agent log
            fetch('http://127.0.0.1:7246/ingest/66ca0116-31ec-44b0-a99a-003bb5ba1c50',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConversationsNew.tsx:475',message:'handleReopen CALLING fetchConversations',data:{conversationId:conversation.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            fetchConversations(); // Recarregar todas as conversas
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
    const sendMessage = async (overrideText?: string) => {
        const messageToSend = overrideText || newMessage.trim();
        if ((!messageToSend && pendingFiles.length === 0 && !audioBlob) || sending) return;

        const messageText = messageToSend;
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
        
        // ✅ Buscar total inicial de conversas encerradas para inicializar contador
        const initClosedTotal = async () => {
            try {
                const response = await api.get(`/api/conversations?status=CLOSED&page=1&limit=1&_t=${Date.now()}`);
                const total = response.data.pagination?.total;
                if (total !== undefined) {
                    setClosedTotal(total);
                }
            } catch (err) {
                console.error('Erro ao buscar total inicial de encerradas:', err);
            }
        };
        initClosedTotal();
        
        // ✅ Atualizar contador de encerrados periodicamente (a cada 30s)
        const updateClosedTotal = async () => {
            try {
                const response = await api.get(`/api/conversations?status=CLOSED&page=1&limit=1&_t=${Date.now()}`);
                const total = response.data.pagination?.total;
                if (total !== undefined) {
                    setClosedTotal(total);
                }
            } catch (err) {
                console.error('Erro ao atualizar contador de encerradas:', err);
            }
        };
        
        const interval = setInterval(fetchConversations, 30000);
        const closedTotalInterval = setInterval(updateClosedTotal, 30000);
        
        return () => {
            clearInterval(interval);
            clearInterval(closedTotalInterval);
        };
    }, []);

    // ✅ Carregar atalhos ao montar componente
    useEffect(() => {
        const fetchQuickReplies = async () => {
            try {
                const response = await api.get('/api/quick-replies');
                setQuickReplies(response.data);
            } catch (error) {
                console.error('Erro ao carregar atalhos:', error);
            }
        };
        fetchQuickReplies();
    }, []);

    // ✅ Detectar autocomplete ao digitar /
    useEffect(() => {
        if (newMessage.startsWith('/')) {
            const query = newMessage.slice(1).toLowerCase().trim();
            const matches = quickReplies.filter(qr =>
                qr.shortcut.toLowerCase().includes(query)
            );
            setFilteredReplies(matches);
            setShowAutocomplete(matches.length > 0);
            setSelectedAutocompleteIndex(0);
        } else {
            setShowAutocomplete(false);
        }
    }, [newMessage, quickReplies]);

    // ✅ Carregar conversas encerradas quando mudar para a aba ou buscar
    useEffect(() => {
        if (activeQueue === 'ENCERRADOS') {
            setClosedPage(1);
            const timeoutId = setTimeout(() => {
                fetchClosedConversations(1, false, searchQuery);
            }, 500);
            return () => clearTimeout(timeoutId);
        }
    }, [activeQueue, searchQuery]);

    // ✅ Listener global para conversas encerradas (funciona mesmo sem conversa selecionada)
    useEffect(() => {
        if (!socket) return;

        const onConversationClosed = (data: any) => {
            console.log('🔒 [GLOBAL] conversation:closed evento recebido:', data);

            if (data.conversationId) {
                // ✅ Se a conversa encerrada é a selecionada, limpar seleção
                if (selectedConversation && (selectedConversation.id === data.conversationId || selectedConversation.phone === data.phone)) {
                    console.log('🔒 Conversa selecionada foi encerrada - limpando seleção');
                    setSelectedConversation(null);
                    setMessages([]);
                }

                // ✅ Verificar se é fechamento por expiração de sessão (pode ter nova conversa sendo criada)
                const isSessionExpired = data.reason === 'session_expired';
                
                // ✅ Atualização otimista: incrementar contador imediatamente
                setClosedTotal(prev => prev + 1);

                // Remover da lista de conversas ativas
                setConversations(prev => {
                    const exists = prev.find(c => c.id === data.conversationId);
                    if (exists) {
                        // Adicionar à lista de encerradas
                        setClosedConversations(prevClosed => {
                            const alreadyInClosed = prevClosed.some(c => c.id === data.conversationId);
                            if (!alreadyInClosed) {
                                const closedConv = {
                                    ...exists,
                                    status: 'FECHADA' as const
                                };
                                return [closedConv, ...prevClosed];
                            }
                            return prevClosed;
                        });
                    }
                    // ✅ Se for expiração de sessão, não remover imediatamente (aguardar nova conversa)
                    // A nova conversa será adicionada pelo evento conversation:updated
                    if (isSessionExpired) {
                        console.log('⏳ Conversa expirada - aguardando nova conversa antes de remover da lista');
                        // Remover apenas após pequeno delay para dar tempo da nova conversa aparecer
                        setTimeout(() => {
                            setConversations(prevList => prevList.filter(c => c.id !== data.conversationId));
                        }, 1000);
                        return prev; // Não remover ainda
                    }
                    return prev.filter(c => c.id !== data.conversationId);
                });

                // ✅ Buscar total atualizado do backend para garantir consistência
                if (activeQueue === 'ENCERRADOS') {
                    // Se estiver na aba, recarregar tudo (forçar atualização com timestamp)
                    api.get(`/api/conversations?status=CLOSED&page=1&limit=20&search=${searchQuery}&_t=${Date.now()}`)
                        .then(response => {
                            const newConversations = response.data.conversations || [];
                            setClosedConversations(newConversations);
                            setClosedTotal(response.data.pagination.total); // ✅ Confirmar com backend
                        })
                        .catch(err => console.error('Erro ao recarregar encerradas:', err));
                } else {
                    // ✅ Se não estiver na aba, buscar apenas o total (requisição leve)
                    // Forçar atualização mesmo com cache (adicionar timestamp)
                    api.get(`/api/conversations?status=CLOSED&page=1&limit=1&_t=${Date.now()}`)
                        .then(response => {
                            const total = response.data.pagination?.total;
                            if (total !== undefined) {
                                setClosedTotal(total); // ✅ Confirmar com backend
                            }
                        })
                        .catch(err => {
                            console.error('Erro ao buscar total de encerradas:', err);
                            // Se falhar, manter o incremento otimista
                        });
                }
            }
        };

        const onConversationUpdatedGlobal = (data: any) => {
            // ✅ Processar conversas encerradas
            if (data.status === 'FECHADA' && data.conversationId) {
                console.log('🔄 [GLOBAL] conversation:updated com status FECHADA:', data);
                
                // ✅ Atualização otimista: incrementar contador imediatamente
                setClosedTotal(prev => prev + 1);
                
                setConversations(prev => {
                    const exists = prev.find(c => c.id === data.conversationId);
                    if (exists) {
                        // Adicionar à lista de encerradas se não estiver lá
                        setClosedConversations(prevClosed => {
                            const alreadyInClosed = prevClosed.some(c => c.id === data.conversationId);
                            if (!alreadyInClosed) {
                                const closedConv = {
                                    ...exists,
                                    status: 'FECHADA' as const,
                                    ...(data.lastMessage && { lastMessage: data.lastMessage }),
                                    ...(data.lastTimestamp && { lastTimestamp: data.lastTimestamp })
                                };
                                return [closedConv, ...prevClosed];
                            }
                            return prevClosed.map(c => 
                                c.id === data.conversationId 
                                    ? { ...c, ...(data.lastMessage && { lastMessage: data.lastMessage }), ...(data.lastTimestamp && { lastTimestamp: data.lastTimestamp }) }
                                    : c
                            );
                        });
                    }
                    return prev.filter(c => c.id !== data.conversationId);
                });

                // ✅ Buscar total atualizado do backend para garantir consistência
                if (activeQueue === 'ENCERRADOS') {
                    // Se estiver na aba, recarregar tudo
                    setClosedConversations(prev => {
                        const exists = prev.find(c => c.id === data.conversationId);
                        if (!exists) {
                            // Se não existe, recarregar (forçar atualização com timestamp)
                            api.get(`/api/conversations?status=CLOSED&page=1&limit=20&search=${searchQuery}&_t=${Date.now()}`)
                                .then(response => {
                                    const newConversations = response.data.conversations || [];
                                    setClosedConversations(newConversations);
                                    setClosedTotal(response.data.pagination.total); // ✅ Confirmar com backend
                                })
                                .catch(err => console.error('Erro ao recarregar encerradas:', err));
                        } else {
                            // Se existe, apenas buscar total
                            api.get(`/api/conversations?status=CLOSED&page=1&limit=1&_t=${Date.now()}`)
                                .then(response => {
                                    const total = response.data.pagination?.total;
                                    if (total !== undefined) {
                                        setClosedTotal(total); // ✅ Confirmar com backend
                                    }
                                })
                                .catch(err => console.error('Erro ao buscar total:', err));
                        }
                        return prev;
                    });
                } else {
                    // ✅ Se não estiver na aba, buscar apenas o total (requisição leve)
                    // Forçar atualização mesmo com cache (adicionar timestamp)
                    api.get(`/api/conversations?status=CLOSED&page=1&limit=1&_t=${Date.now()}`)
                        .then(response => {
                            const total = response.data.pagination?.total;
                            if (total !== undefined) {
                                setClosedTotal(total); // ✅ Confirmar com backend
                            }
                        })
                        .catch(err => {
                            console.error('Erro ao buscar total de encerradas:', err);
                            // Se falhar, manter o incremento otimista
                        });
                }
            }
            // ✅ Processar conversas reabertas (FECHADA -> PRINCIPAL)
            else if (data.conversationId && data.status === 'PRINCIPAL' && data.reason === 'conversation_reopened') {
                console.log('🔄 [GLOBAL] conversation:updated - Conversa reaberta:', data);
                
                // #region agent log
                fetch('http://127.0.0.1:7246/ingest/66ca0116-31ec-44b0-a99a-003bb5ba1c50',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConversationsNew.tsx:891',message:'Socket.IO conversation_reopened EVENT',data:{conversationId:data.conversationId,closedCountBefore:closedConversations.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                
                // ✅ Remover da lista de encerradas (se estiver lá) - apenas uma vez
                setClosedConversations(prev => {
                    const exists = prev.find(c => c.id === data.conversationId);
                    if (!exists) {
                        // #region agent log
                        fetch('http://127.0.0.1:7246/ingest/66ca0116-31ec-44b0-a99a-003bb5ba1c50',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConversationsNew.tsx:896',message:'Socket.IO SKIP - already removed',data:{conversationId:data.conversationId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                        // #endregion
                        return prev; // Já foi removida, não remover novamente
                    }
                    const filtered = prev.filter(c => c.id !== data.conversationId);
                    // #region agent log
                    fetch('http://127.0.0.1:7246/ingest/66ca0116-31ec-44b0-a99a-003bb5ba1c50',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConversationsNew.tsx:900',message:'Socket.IO AFTER filter',data:{conversationId:data.conversationId,closedCountBefore:prev.length,closedCountAfter:filtered.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                    // #endregion
                    return filtered;
                });
                setClosedTotal(prev => Math.max(0, prev - 1));
                
                // ✅ Buscar dados completos da conversa reaberta
                api.get(`/api/conversations/id/${data.conversationId}`)
                    .then(response => {
                        const reopenedConv = response.data;
                        if (reopenedConv) {
                            console.log('✅ Dados completos da conversa reaberta recebidos:', reopenedConv.id);
                            
                            // ✅ Adicionar/atualizar conversa na lista ativa
                            setConversations(prev => {
                                const exists = prev.find(c => c.id === reopenedConv.id);
                                if (!exists) {
                                    const fullConv: Conversation = {
                                        id: reopenedConv.id,
                                        phone: reopenedConv.phone,
                                        status: reopenedConv.status,
                                        priority: reopenedConv.priority || 'MEDIUM',
                                        lastMessage: reopenedConv.lastMessage || '',
                                        lastTimestamp: reopenedConv.lastTimestamp || new Date(),
                                        sessionExpiryTime: reopenedConv.sessionExpiryTime,
                                        sessionStatus: reopenedConv.sessionStatus || 'active',
                                        lastUserActivity: reopenedConv.lastUserActivity || new Date(),
                                        unreadCount: reopenedConv.unreadCount || 1,
                                        patient: reopenedConv.patient || null,
                                        assignedTo: reopenedConv.assignedTo || null,
                                        assignedToId: reopenedConv.assignedToId || null,
                                        channel: reopenedConv.channel || 'whatsapp',
                                        createdAt: reopenedConv.createdAt,
                                        updatedAt: reopenedConv.updatedAt
                                    };
                                    console.log('✅ Conversa reaberta adicionada à lista:', fullConv.id, 'status:', fullConv.status);
                                    return [fullConv, ...prev];
                                }
                                // Se já existe, atualizar com dados mais recentes
                                return prev.map(c => {
                                    if (c.id === reopenedConv.id) {
                                        return {
                                            ...c,
                                            id: reopenedConv.id,
                                            phone: reopenedConv.phone,
                                            status: reopenedConv.status,
                                            priority: reopenedConv.priority || c.priority || 'MEDIUM',
                                            lastMessage: reopenedConv.lastMessage || '',
                                            lastTimestamp: reopenedConv.lastTimestamp || new Date(),
                                            sessionExpiryTime: reopenedConv.sessionExpiryTime,
                                            sessionStatus: reopenedConv.sessionStatus || 'active',
                                            lastUserActivity: reopenedConv.lastUserActivity || new Date(),
                                            unreadCount: reopenedConv.unreadCount || 1,
                                            patient: reopenedConv.patient || null,
                                            assignedTo: reopenedConv.assignedTo || null,
                                            assignedToId: reopenedConv.assignedToId || null,
                                            channel: reopenedConv.channel || 'whatsapp',
                                            createdAt: reopenedConv.createdAt || c.createdAt,
                                            updatedAt: reopenedConv.updatedAt || c.updatedAt
                                        };
                                    }
                                    return c;
                                });
                            });
                            
                            // Se a conversa selecionada for do mesmo phone, atualizar
                            if (selectedConversation?.phone === data.phone) {
                                console.log('🔄 Atualizando conversa selecionada para a reaberta:', reopenedConv.id);
                                fetchMessages(data.phone, reopenedConv.id);
                            }
                        }
                    })
                    .catch(err => {
                        console.error('⚠️ Erro ao buscar dados completos da conversa reaberta:', err);
                        // Fallback: atualizar otimisticamente com dados do evento
                        setConversations(prev => prev.map(c => {
                            if (c.id === data.conversationId || c.phone === data.phone) {
                                return {
                                    ...c,
                                    status: 'PRINCIPAL',
                                    assignedToId: null,
                                    assignedTo: null,
                                    ...(data.sessionExpiryTime && { sessionExpiryTime: data.sessionExpiryTime }),
                                    ...(data.lastMessage && { lastMessage: data.lastMessage }),
                                    ...(data.lastTimestamp && { lastTimestamp: data.lastTimestamp })
                                };
                            }
                            return c;
                        }));
                    });
                
                // ✅ Recarregar lista completa após delay para garantir consistência
                setTimeout(() => {
                    fetchConversations();
                }, 500);
            }
            // ✅ Processar novas conversas criadas (BOT_QUEUE, PRINCIPAL, etc)
            else if (data.conversationId && data.status && data.status !== 'FECHADA' && (data.reason === 'new_conversation' || data.reason === 'new_conversation_after_expired')) {
                console.log('🔄 [GLOBAL] conversation:updated - Nova conversa criada:', data);
                
                // ✅ Buscar dados completos da nova conversa do backend
                api.get(`/api/conversations/id/${data.conversationId}`)
                    .then(response => {
                        const newConv = response.data;
                        if (newConv) {
                            console.log('✅ Dados completos da nova conversa recebidos:', newConv.id);
                            
                            // ✅ Adicionar nova conversa à lista com dados completos
                            setConversations(prev => {
                                const exists = prev.find(c => c.id === newConv.id);
                                if (!exists) {
                                    const fullConv: Conversation = {
                                        id: newConv.id,
                                        phone: newConv.phone,
                                        status: newConv.status,
                                        priority: newConv.priority || 'MEDIUM',
                                        lastMessage: newConv.lastMessage || '',
                                        lastTimestamp: newConv.lastTimestamp || new Date(),
                                        sessionExpiryTime: newConv.sessionExpiryTime,
                                        sessionStatus: newConv.sessionStatus || 'active',
                                        lastUserActivity: newConv.lastUserActivity || new Date(),
                                        unreadCount: newConv.unreadCount || 1, // Nova mensagem = não lida
                                        patient: newConv.patient || null,
                                        assignedTo: newConv.assignedTo || null,
                                        assignedToId: newConv.assignedToId || null,
                                        channel: newConv.channel || 'whatsapp',
                                        createdAt: newConv.createdAt,
                                        updatedAt: newConv.updatedAt
                                    };
                                    console.log('✅ Nova conversa adicionada à lista:', fullConv.id, 'status:', fullConv.status);
                                    return [fullConv, ...prev];
                                }
                                // Se já existe, atualizar com dados mais recentes
                                return prev.map(c => {
                                    if (c.id === newConv.id) {
                                        return {
                                            ...c,
                                            id: newConv.id,
                                            phone: newConv.phone,
                                            status: newConv.status,
                                            priority: newConv.priority || c.priority || 'MEDIUM',
                                            lastMessage: newConv.lastMessage || '',
                                            lastTimestamp: newConv.lastTimestamp || new Date(),
                                            sessionExpiryTime: newConv.sessionExpiryTime,
                                            sessionStatus: newConv.sessionStatus || 'active',
                                            lastUserActivity: newConv.lastUserActivity || new Date(),
                                            unreadCount: newConv.unreadCount || 1,
                                            patient: newConv.patient || null,
                                            assignedTo: newConv.assignedTo || null,
                                            assignedToId: newConv.assignedToId || null,
                                            channel: newConv.channel || 'whatsapp',
                                            createdAt: newConv.createdAt || c.createdAt,
                                            updatedAt: newConv.updatedAt || c.updatedAt
                                        };
                                    }
                                    return c;
                                });
                            });
                            
                            // Se a conversa selecionada for do mesmo phone, atualizar para a nova
                            if (selectedConversation?.phone === data.phone) {
                                console.log('🔄 Atualizando conversa selecionada para a nova:', newConv.id);
                                fetchMessages(data.phone, newConv.id);
                            }
                        }
                    })
                    .catch(err => {
                        console.error('⚠️ Erro ao buscar dados completos da nova conversa:', err);
                        // Fallback: adicionar otimisticamente com dados do evento
                        setConversations(prev => {
                            const exists = prev.find(c => c.id === data.conversationId);
                            if (!exists) {
                                const newConv: Conversation = {
                                    id: data.conversationId,
                                    phone: data.phone,
                                    status: data.status,
                                    priority: 'MEDIUM',
                                    lastMessage: data.lastMessage || '',
                                    lastTimestamp: data.lastTimestamp || new Date(),
                                    sessionExpiryTime: data.sessionExpiryTime,
                                    sessionStatus: data.sessionStatus || 'active',
                                    lastUserActivity: data.lastUserActivity || new Date(),
                                    unreadCount: 1,
                                    patient: null,
                                    assignedTo: null,
                                    assignedToId: null,
                                    channel: data.channel || 'whatsapp',
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString()
                                };
                                return [newConv, ...prev];
                            }
                            return prev;
                        });
                    });
                
                // ✅ Recarregar lista completa após delay para garantir consistência
                setTimeout(() => {
                    fetchConversations();
                }, 1000);
            }
            // ✅ Processar atualizações gerais de conversas (sem reason específico)
            else if (data.conversationId && data.status && data.status !== 'FECHADA' && !data.reason) {
                console.log('🔄 [GLOBAL] conversation:updated - Atualização geral:', data);
                // Atualizar conversa existente na lista
                setConversations(prev => prev.map(c => {
                    if (c.id === data.conversationId || c.phone === data.phone) {
                        return {
                            ...c,
                            ...(data.status && { status: data.status }),
                            ...(data.lastMessage && { lastMessage: data.lastMessage }),
                            ...(data.lastTimestamp && { lastTimestamp: data.lastTimestamp }),
                            ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
                            ...(data.assignedTo && { assignedTo: data.assignedTo }),
                            ...(data.unreadCount !== undefined && { unreadCount: data.unreadCount }),
                            ...(data.sessionExpiryTime && { sessionExpiryTime: data.sessionExpiryTime }),
                            ...(data.sessionStatus && { sessionStatus: data.sessionStatus }),
                            ...(data.lastUserActivity && { lastUserActivity: data.lastUserActivity })
                        };
                    }
                    return c;
                }));
                
                // Se for a conversa selecionada, atualizar também
                if (selectedConversation?.id === data.conversationId || selectedConversation?.phone === data.phone) {
                    setSelectedConversation(prev => prev ? {
                        ...prev,
                        ...(data.status && { status: data.status }),
                        ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
                        ...(data.assignedTo && { assignedTo: data.assignedTo }),
                        ...(data.unreadCount !== undefined && { unreadCount: data.unreadCount })
                    } : null);
                }
            }
        };

        socket.on('conversation:closed', onConversationClosed);
        socket.on('conversation:updated', onConversationUpdatedGlobal);

        return () => {
            socket.off('conversation:closed', onConversationClosed);
            socket.off('conversation:updated', onConversationUpdatedGlobal);
        };
    }, [socket, activeQueue, searchQuery, fetchConversations, selectedConversation]);


    useEffect(() => {
        if (phone) {
            // ✅ Ler conversationId da URL usando useLocation (reativo)
            const urlParams = new URLSearchParams(location.search);
            const conversationId = urlParams.get('conversationId');
            
            console.log('🔍 [useEffect] phone:', phone, 'conversationId:', conversationId, 'conversations.length:', conversations.length, 'location.search:', location.search);
            
            if (conversationId) {
                console.log('🔍 Buscando conversa específica por ID:', conversationId);
                // Buscar conversa específica por ID
                const conv = conversations.find(c => c.id === conversationId);
                if (conv) {
                    console.log('✅ Conversa encontrada na lista local:', conv.id, 'status:', conv.status);
                    setSelectedConversation(conv);
                    // ✅ Passar conversationId para buscar mensagens da conversa específica
                    fetchMessages(phone, conversationId);
                } else {
                    console.log('⚠️ Conversa não encontrada na lista, buscando da API...');
                    // Se não estiver na lista, buscar diretamente por ID
                    api.get(`/api/conversations/id/${conversationId}`)
                        .then(response => {
                            const conv = response.data;
                            console.log('✅ Conversa encontrada na API:', conv.id, 'status:', conv.status);
                            const updatedConv = {
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
                                channel: conv.channel || 'whatsapp',
                                unreadCount: conv.unreadCount || 0
                            };
                            setSelectedConversation(updatedConv);
                            // ✅ Passar conversationId para buscar mensagens da conversa específica
                            fetchMessages(conv.phone, conversationId);
                        })
                        .catch((error) => {
                            console.error('Error fetching conversation by ID:', error);
                            toast.error('Conversa não encontrada');
                        });
                }
            } else {
                // Comportamento normal: buscar conversa mais recente por phone
            const conv = conversations.find(c => c.phone === phone);
            if (conv) {
                    console.log('✅ Conversa encontrada na lista (sem conversationId):', conv.id);
                setSelectedConversation(conv);
                fetchMessages(phone);
            } else {
                    console.log('⚠️ Conversa não encontrada na lista, buscando por phone...');
                // If conversation not in list, try to fetch it directly
                // This handles cases where conversation was just moved to a queue
                fetchMessages(phone).catch((error) => {
                    console.error('Error fetching conversation:', error);
                    // Don't redirect, just show error
                    toast.error('Conversa não encontrada');
                });
                }
            }
        } else {
            setSelectedConversation(null);
            setMessages([]);
        }
    }, [phone, conversations, location.search]);

    // Fetch session info when conversation is selected
    useEffect(() => {
        if (selectedConversation?.id) {
            fetchSessionInfo(selectedConversation.id);
        } else {
            setSessionInfo(null);
        }
    }, [selectedConversation?.id]);

    // Scroll inteligente: só faz auto-scroll se o usuário estiver próximo do final
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const checkIfNearBottom = (): boolean => {
        const container = messagesContainerRef.current;
        if (!container) return true;
        
        const threshold = 100; // 100px de margem
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        return distanceFromBottom <= threshold;
    };

    // Scroll inicial quando a conversa é carregada pela primeira vez
    useEffect(() => {
        if (messages.length > 0 && selectedConversation?.id && shouldAutoScrollRef.current) {
            // Pequeno delay para garantir que o DOM foi renderizado
            setTimeout(() => {
                scrollToBottom();
                shouldAutoScrollRef.current = true;
            }, 100);
        }
    }, [selectedConversation?.id]); // Apenas quando muda a conversa

    // Auto-scroll inteligente: só se o usuário estiver próximo do final
    useEffect(() => {
        if (messages.length === 0) return;
        
        // Se o usuário está rolando manualmente, não fazer auto-scroll
        if (isUserScrollingRef.current) {
            isUserScrollingRef.current = false;
            return;
        }

        // Só fazer auto-scroll se estiver próximo do final
        if (checkIfNearBottom()) {
            setTimeout(() => {
                scrollToBottom();
            }, 100);
        }
    }, [messages]);

    // Detectar quando o usuário está rolando manualmente
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        let scrollTimeout: NodeJS.Timeout;
        const handleScroll = () => {
            isUserScrollingRef.current = true;
            shouldAutoScrollRef.current = checkIfNearBottom();
            
            // Resetar flag após um tempo sem scroll
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isUserScrollingRef.current = false;
            }, 150);
        };

        container.addEventListener('scroll', handleScroll);
        return () => {
            container.removeEventListener('scroll', handleScroll);
            clearTimeout(scrollTimeout);
        };
    }, []);

    useEffect(() => {
        if (!socket || !selectedConversation) return;

        // Join both phone and conversation ID rooms for compatibility
        socket.emit('join_conversation', selectedConversation.phone);
        socket.emit('join_conversation', selectedConversation.id);
        console.log(`🔌 Joined rooms: conv:${selectedConversation.phone} and conv:${selectedConversation.id}`);

        const onNewMessage = (payload: any) => {
            const timestamp = new Date().toISOString();
            console.log(`📨 [${timestamp}] Message event received:`, {
                payload,
                selectedPhone: selectedConversation.phone,
                selectedId: selectedConversation.id,
                payloadPhone: payload?.phone,
                payloadConvId: payload?.conversation?.id,
                messageConvId: payload?.message?.conversationId
            });

            const phoneMatch = payload?.phone === selectedConversation.phone;
            const idMatch = payload?.message?.conversationId === selectedConversation.id || payload?.conversation?.id === selectedConversation.id;

            console.log(`🔍 Match check: phoneMatch=${phoneMatch}, idMatch=${idMatch}`);

            if (phoneMatch || idMatch) {
                console.log(`✅ Match found! Processing message...`);
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
                        // Use direction as primary source: RECEIVED = PATIENT, SENT = BOT/AGENT
                        sender: messageData.direction === 'RECEIVED' ? 'PATIENT' : (messageData.from === 'BOT' ? 'BOT' : 'AGENT'),
                        messageText: messageData.messageText,
                        messageType: messageData.messageType || 'TEXT',
                        mediaUrl: messageData.mediaUrl || messageData.media_url, // ✅ Preservar mediaUrl (pode vir como media_url também)
                        direction: messageData.direction,
                        timestamp: messageData.timestamp || new Date().toISOString(),
                        status: messageData.direction === 'SENT' ? 'SENT' : 'PENDING',
                        metadata: messageData.metadata || {} // ✅ Garantir que metadata sempre existe
                    };

                    // Verificar se a mensagem já existe ou substituir mensagem otimista
                    setMessages(prev => {
                        // Verificar duplicatas PRIMEIRO
                        const existingIndex = prev.findIndex(m => m.id === newMessage.id)
                        if (existingIndex !== -1) {
                            console.log('⚠️ Mensagem já existe, atualizando preservando mediaUrl/metadata:', newMessage.id);
                            // ✅ ATUALIZAR mensagem existente preservando mediaUrl e metadata se não vierem no evento
                            // Isso é crítico para PDFs que podem perder dados na atualização
                            return prev.map((msg, idx) => {
                                if (idx === existingIndex) {
                                    const updated = {
                                        ...msg,
                                        ...newMessage,
                                        // ✅ PRESERVAR mediaUrl e metadata se não vierem no evento (CRÍTICO para PDFs!)
                                        mediaUrl: newMessage.mediaUrl || msg.mediaUrl,
                                        metadata: newMessage.metadata || msg.metadata || {}
                                    }
                                    if (msg.messageType === 'DOCUMENT' && !newMessage.mediaUrl && msg.mediaUrl) {
                                        console.log('⚠️ [PDF] Preservando mediaUrl durante atualização:', msg.mediaUrl)
                                    }
                                    return updated
                                }
                                return msg
                            })
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
                        console.log('✅ Adicionando mensagem ao estado:', newMessage.id, 'mediaUrl:', !!newMessage.mediaUrl, 'metadata:', !!newMessage.metadata);
                        return [...filtered, newMessage];
                    });

                    // ✅ Atualizar última mensagem da conversa selecionada
                    if (payload?.conversation) {
                        setSelectedConversation(prev => prev ? {
                            ...prev,
                            lastMessage: messageData.messageText,
                            lastTimestamp: messageData.timestamp
                        } : prev);
                    }
                    
                    // ✅ ATUALIZAR CARD NA LISTA DE CONVERSAS imediatamente
                    setConversations(prev => prev.map(c => {
                        // Verificar se é a conversa correta (por ID ou phone)
                        const matches = c.id === messageData.conversationId || 
                                       c.id === payload?.conversation?.id ||
                                       c.phone === payload?.phone ||
                                       c.phone === selectedConversation?.phone
                        
                        if (matches) {
                            console.log('✅ Atualizando card da conversa com última mensagem:', messageData.messageText?.substring(0, 20) || '[vazio]')
                            return {
                                ...c,
                                lastMessage: messageData.messageText,
                                lastTimestamp: messageData.timestamp || new Date().toISOString()
                            }
                        }
                        return c
                    }))
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
                console.log('📤 [onMessageSent] Mensagem enviada detectada, atualizando card...');
                onNewMessage(payload);
                
                // ✅ ATUALIZAR CARD IMEDIATAMENTE quando mensagem é enviada
                if (payload?.message && (payload?.conversation || payload?.phone)) {
                    const messageData = payload.message;
                    const conversationId = messageData.conversationId || payload?.conversation?.id;
                    const phone = payload.phone || payload?.conversation?.phone;
                    
                    setConversations(prev => prev.map(c => {
                        const matches = c.id === conversationId || 
                                       c.phone === phone ||
                                       (selectedConversation && (c.id === selectedConversation.id || c.phone === selectedConversation.phone))
                        
                        if (matches) {
                            console.log('✅ [onMessageSent] Atualizando card imediatamente:', messageData.messageText?.substring(0, 20));
                            return {
                                ...c,
                                lastMessage: messageData.messageText || messageData.text,
                                lastTimestamp: messageData.timestamp || new Date().toISOString()
                            };
                        }
                        return c;
                    }));
                }
            }
        };

        const onNewMessageReceived = (payload: any) => {
            // Processar todas as mensagens recebidas via new_message
            // O filtro por conversa é feito dentro de onNewMessage
            onNewMessage(payload);
        };

        socket.on('message_sent', onMessageSent);
        socket.on('new_message', onNewMessageReceived);
        socket.on('conversation_updated', onConversationUpdated);
        socket.on('queue_updated', onConversationUpdated);

        // ✅ NOVOS EVENTOS: Escutar eventos do backend
        socket.on('message:new', (data) => {
            console.log('📨 [message:new] Evento recebido:', data);

            // Processar como nova mensagem
            onNewMessage({ message: data.message, conversation: { id: data.conversationId } });

            // ✅ Se for mensagem do PACIENTE e não estamos na conversa, incrementar unreadCount
            // ✅ Se for mensagem ENVIADA (AGENT), atualizar lastMessage mesmo estando na conversa
            const isReceived = data.message?.direction === 'RECEIVED'
            const isSent = data.message?.direction === 'SENT'
            const isNotSelected = selectedConversation?.id !== data.conversationId
            
            if ((isReceived && isNotSelected) || isSent) {
                console.log('📊 Atualizando card da conversa:', { isReceived, isSent, isNotSelected });
                setConversations(prev => prev.map(c => {
                    if (c.id === data.conversationId || c.phone === data.message?.phoneNumber) {
                        return {
                            ...c,
                            ...(isReceived && isNotSelected && { unreadCount: (c.unreadCount ?? 0) + 1 }),
                            lastMessage: data.message.messageText,
                            lastTimestamp: data.message.timestamp || new Date().toISOString()
                        };
                    }
                    return c;
                }));
            }
        });

        socket.on('conversation:updated', (data) => {
            console.log('🔄 [conversation:updated] Evento recebido:', data);

            // ✅ Se a conversa foi encerrada e é a selecionada, limpar seleção
            if (data.status === 'FECHADA' && selectedConversation && 
                (selectedConversation.id === data.conversationId || selectedConversation.phone === data.phone)) {
                console.log('🔒 Conversa selecionada foi encerrada - limpando seleção');
                setSelectedConversation(null);
                setMessages([]);
                return; // Não continuar processamento
            }

            // ✅ Atualizar selectedConversation se for a conversa selecionada (e não foi encerrada)
            if (selectedConversation && (selectedConversation.id === data.conversationId || selectedConversation.phone === data.phone)) {
                console.log('🔄 Atualizando selectedConversation com dados do evento:', {
                    currentId: selectedConversation.id,
                    eventId: data.conversationId,
                    currentPhone: selectedConversation.phone,
                    eventPhone: data.phone
                });
                setSelectedConversation(prev => {
                    if (!prev) return null;
                    const updated = {
                        ...prev,
                        status: data.status || prev.status,
                        assignedToId: data.assignedToId !== undefined ? data.assignedToId : prev.assignedToId,
                        assignedTo: data.assignedTo || prev.assignedTo,
                        ...(data.lastMessage && { lastMessage: data.lastMessage }),
                        ...(data.lastTimestamp && { lastTimestamp: data.lastTimestamp })
                    };
                    console.log('✅ selectedConversation atualizado:', updated.id, updated.status);
                    return updated;
                });
            }
            
            // ✅ ATUALIZAR CARD NA LISTA se houver lastMessage ou lastTimestamp no evento
            if (data.lastMessage || data.lastTimestamp) {
                setConversations(prev => prev.map(c => {
                    if (c.id === data.conversationId || c.phone === data.phone) {
                        return {
                            ...c,
                            ...(data.lastMessage && { lastMessage: data.lastMessage }),
                            ...(data.lastTimestamp && { lastTimestamp: data.lastTimestamp }),
                            ...(data.status && { status: data.status }),
                            ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
                            ...(data.assignedTo && { assignedTo: data.assignedTo })
                        }
                    }
                    return c
                }))
            }

            // Atualizar conversa localmente se tivermos os dados
            if (data.conversationId) {
                const isClosed = data.status === 'FECHADA';

                // Se conversa foi encerrada, remover da lista ativa e adicionar à lista de encerradas
                if (isClosed) {
                    // Remover da lista de conversas ativas
                    setConversations(prev => {
                        const exists = prev.find(c => c.id === data.conversationId);
                        if (exists) {
                            // Adicionar à lista de encerradas se não estiver lá
                            setClosedConversations(prevClosed => {
                                const alreadyInClosed = prevClosed.some(c => c.id === data.conversationId);
                                if (!alreadyInClosed) {
                                    // Buscar dados completos da conversa para adicionar
                                    const closedConv = {
                                        ...exists,
                                        status: 'FECHADA' as const,
                            ...(data.lastMessage && { lastMessage: data.lastMessage }),
                            ...(data.lastTimestamp && { lastTimestamp: data.lastTimestamp })
                        };
                                    // Adicionar no início da lista
                                    return [closedConv, ...prevClosed];
                                }
                                // Se já está na lista, apenas atualizar
                                return prevClosed.map(c => 
                                    c.id === data.conversationId 
                                        ? { ...c, ...(data.lastMessage && { lastMessage: data.lastMessage }), ...(data.lastTimestamp && { lastTimestamp: data.lastTimestamp }) }
                                        : c
                                );
                            });
                            // Atualizar contador
                            setClosedTotal(prev => prev + 1);
                        }
                        // Remover da lista ativa
                        return prev.filter(c => c.id !== data.conversationId);
                    });

                    // Se estiver na aba de encerrados, atualizar a conversa na lista
                    if (activeQueue === 'ENCERRADOS') {
                        setClosedConversations(prev => {
                            const exists = prev.find(c => c.id === data.conversationId);
                            if (!exists) {
                                // Se não existe, buscar dados completos
                                fetchClosedConversations(1, false, searchQuery);
                            } else {
                                // Se existe, apenas atualizar
                                return prev.map(c => 
                                    c.id === data.conversationId 
                                        ? { ...c, ...(data.lastMessage && { lastMessage: data.lastMessage }), ...(data.lastTimestamp && { lastTimestamp: data.lastTimestamp }) }
                                        : c
                                );
                            }
                            return prev;
                        });
                    }
                } else {
                    // Se não foi encerrada, apenas atualizar na lista ativa
                    setConversations(prev => prev.map(c => {
                        if (c.id === data.conversationId || c.phone === data.phone) {
                            console.log('📊 Atualizando conversa local:', c.id, 'status:', data.status, 'assignedToId:', data.assignedToId);
                            return {
                                ...c,
                                // Atualizar campos que vêm no evento
                                ...(data.status && { status: data.status }),
                                ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
                                ...(data.assignedTo && { assignedTo: data.assignedTo }),
                                ...(data.unreadCount !== undefined && { unreadCount: data.unreadCount }),
                                ...(data.lastMessage && { lastMessage: data.lastMessage }),
                                ...(data.lastTimestamp && { lastTimestamp: data.lastTimestamp })
                            };
                        }
                        return c;
                    }));
                }
            }

            // Fallback: refetch se não tivermos conversationId
            if (!data.conversationId) {
                fetchConversations();
            }
        });

        // ✅ Listener específico para conversas encerradas
        socket.on('conversation:closed', (data) => {
            console.log('🔒 [conversation:closed] Evento recebido:', data);

            if (data.conversationId) {
                // Remover da lista de conversas ativas
                setConversations(prev => {
                    const exists = prev.find(c => c.id === data.conversationId);
                    if (exists) {
                        // Adicionar à lista de encerradas
                        setClosedConversations(prevClosed => {
                            const alreadyInClosed = prevClosed.some(c => c.id === data.conversationId);
                            if (!alreadyInClosed) {
                                const closedConv = {
                                    ...exists,
                                    status: 'FECHADA' as const
                                };
                                return [closedConv, ...prevClosed];
                            }
                            return prevClosed;
                        });
                        // Atualizar contador
                        setClosedTotal(prev => prev + 1);
                    }
                    return prev.filter(c => c.id !== data.conversationId);
                });

                // Se estiver na aba de encerrados, recarregar para garantir dados atualizados
                if (activeQueue === 'ENCERRADOS') {
                    fetchClosedConversations(1, false, searchQuery);
                }
            }
        });

        // Listener para timeout de inatividade
        socket.on('conversation:timeout', (data) => {
            console.log('⏰ [conversation:timeout] Conversa retornou por inatividade:', data);

            // Remover conversa da lista atual
            setConversations(prev => prev.filter(c => c.id !== data.conversationId));

            // Mostrar notificação
            toast.warning(`⏰ Conversa retornou para fila por inatividade`, {
                description: `Agente: ${data.previousAgent || 'Desconhecido'}`
            });

            // Atualizar lista de conversas
            fetchConversations();
        });

        return () => {
            socket.emit('leave_conversation', selectedConversation.phone);
            socket.emit('leave_conversation', selectedConversation.id);
            socket.off('message_sent', onMessageSent);
            socket.off('new_message', onNewMessageReceived);
            socket.off('conversation_updated', onConversationUpdated);
            socket.off('queue_updated', onConversationUpdated);
            socket.off('message:new');
            socket.off('conversation:updated');
            socket.off('conversation:closed');
        };
    }, [socket, selectedConversation]);

    // ✅ Intersection Observer for Lazy Loading
    const observer = useRef<IntersectionObserver>();
    const lastConversationElementRef = useCallback((node: HTMLDivElement) => {
        if (loadingClosed) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMoreClosed && activeQueue === 'ENCERRADOS') {
                setClosedPage(prev => prev + 1);
                fetchClosedConversations(closedPage + 1, true, searchQuery);
            }
        });
        if (node) observer.current.observe(node);
    }, [loadingClosed, hasMoreClosed, activeQueue, closedPage, searchQuery]);

    const conversationsToRender = activeQueue === 'ENCERRADOS' ? closedConversations : filteredConversations;

    return (
        <div className="flex h-screen bg-gray-50 overflow-x-hidden conversations-page">
            {/* Custom Scrollbar Styles */}
            <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 20px;
        }
        .animate-pulse-slow {
            animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .7; }
        }
        /* ✅ Estilos customizados para notificações na área do chat */
        [data-sonner-toaster] {
            position: fixed !important;
            top: 80px !important;
            right: 20px !important;
            z-index: 9999 !important;
        }
        /* Aplicar apenas quando estiver na página de conversas */
        .conversations-page [data-sonner-toaster] {
            position: absolute !important;
            top: 80px !important;
            right: 20px !important;
        }
      `}</style>

            {/* Sidebar */}
            <div className="w-[420px] bg-white border-r border-gray-200 flex flex-col">{/* Increased from 384px to 420px */}
                {/* Sidebar Header */}
                <div className="p-4 border-b border-gray-200">
                    <h1 className="text-xl font-bold text-gray-900 mb-3">Conversas</h1>
                    <input
                        type="text"
                        placeholder="Buscar conversas..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Queue Tabs - REFATORADO ✅ */}
                <QueueTabs
                    activeQueue={activeQueue}
                    onQueueChange={setActiveQueue}
                    counts={{
                        BOT_QUEUE: getQueueCount('BOT_QUEUE'),
                        PRINCIPAL: getQueueCount('PRINCIPAL'),
                        EM_ATENDIMENTO: getQueueCount('EM_ATENDIMENTO'),
                        MINHAS_CONVERSAS: getQueueCount('MINHAS_CONVERSAS'),
                        ENCERRADOS: closedTotal
                    }}
                />

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {conversationsToRender.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            {loadingClosed ? 'Carregando...' : 'Nenhuma conversa nesta fila'}
                        </div>
                    ) : (
                        conversationsToRender.map((conversation, index) => {
                            const isSelected = selectedConversation?.id === conversation.id;

                            // ✅ Ref para último elemento (lazy loading)
                            const isLast = index === conversationsToRender.length - 1;
                            const ref = (isLast && activeQueue === 'ENCERRADOS') ? lastConversationElementRef : null;
                            // ✅ Incluir 'AGUARDANDO' como equivalente a 'PRINCIPAL' para permitir assumir
                            const canAssume = (
                                conversation.status === 'BOT_QUEUE' || 
                                conversation.status === 'PRINCIPAL' || 
                                (conversation.status as string) === 'AGUARDANDO'
                            ) && !conversation.assignedToId;

                            // ✅ Verificar se sessão expirou (24h desde última mensagem do usuário)
                            const isSessionExpired = (() => {
                                if (!conversation.lastUserActivity) return false;
                                const lastActivityTime = new Date(conversation.lastUserActivity);
                                const now = new Date();
                                const hoursSinceLastActivity = (now.getTime() - lastActivityTime.getTime()) / (1000 * 60 * 60);
                                return hoursSinceLastActivity >= 24;
                            })();

                            // ✅ Badge de mensagens não lidas: mostrar sempre que houver mensagens não lidas
                            // EXCETO se a conversa estiver selecionada no momento (já está sendo visualizada)
                            const shouldShowUnreadBadge = (conversation.unreadCount ?? 0) > 0 && selectedConversation?.id !== conversation.id;

                            return (
                                <div
                                    key={conversation.id}
                                    ref={ref}
                                    onClick={() => navigate(`/conversations/${conversation.phone}?conversationId=${conversation.id}`)}
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
                                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                        </svg>
                                                    )}
                                                    {conversation.channel === 'instagram' && (
                                                        <svg className="w-3.5 h-3.5 text-pink-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                                        </svg>
                                                    )}
                                                    {conversation.channel === 'messenger' && (
                                                        <svg className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M12 2C6.486 2 2 6.262 2 11.5c0 2.847 1.277 5.44 3.355 7.156l-.319 2.73a.5.5 0 00.72.544l3.045-1.373A10.963 10.963 0 0012 21c5.514 0 10-4.262 10-9.5S17.514 2 12 2zm1.222 12.278l-2.508-2.672-4.896 2.672 5.381-5.713 2.57 2.672 4.834-2.672-5.381 5.713z" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500">{conversation.phone}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400">
                                                {conversation.lastTimestamp ? formatTimestamp(conversation.lastTimestamp) : ''}
                                            </span>
                                            {/* ✅ Badge de mensagens não lidas (não mostrar se EM_ATENDIMENTO) */}
                                            {shouldShowUnreadBadge && (
                                                <span className="inline-flex items-center justify-center w-5 h-5 bg-gradient-to-br from-red-500 to-red-600 text-white text-[10px] font-semibold rounded-full shadow-sm">
                                                    {conversation.unreadCount! > 9 ? '9+' : conversation.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {conversation.lastMessage && (
                                        <p className="text-xs text-gray-600 mb-2 line-clamp-1 ml-12">
                                            {conversation.lastMessage}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between ml-12">
                                        <div className="flex items-center gap-2">
                                            {/* ✅ Tag "Expirada" se sessão expirada */}
                                            {isSessionExpired && (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-xs">
                                                    <Clock className="h-3 w-3 text-red-600" />
                                                    <span className="text-red-700 font-medium">Expirada</span>
                                                </span>
                                            )}
                                            
                                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${conversation.status === 'PRINCIPAL'
                                            ? 'bg-orange-100 text-orange-700'
                                            : conversation.status === 'EM_ATENDIMENTO'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {/* Channel icon */}
                                            {conversation.channel === 'whatsapp' && (
                                                <svg className="w-3 h-3 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                </svg>
                                            )}
                                            {conversation.channel === 'instagram' && (
                                                <svg className="w-3 h-3 text-pink-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                                </svg>
                                            )}
                                            {conversation.channel === 'messenger' && (
                                                <svg className="w-3 h-3 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 2C6.486 2 2 6.262 2 11.5c0 2.847 1.277 5.44 3.355 7.156l-.319 2.73a.5.5 0 00.72.544l3.045-1.373A10.963 10.963 0 0012 21c5.514 0 10-4.262 10-9.5S17.514 2 12 2zm1.222 12.278l-2.508-2.672-4.896 2.672 5.381-5.713 2.57 2.672 4.834-2.672-5.381 5.713z" />
                                                </svg>
                                            )}
                                            {conversation.status === 'PRINCIPAL' ? 'Fila Principal' :
                                                conversation.status === 'EM_ATENDIMENTO' ? (conversation.assignedToId === user?.id ? 'Com você' : conversation.assignedTo?.name || 'Em atendimento') :
                                                    conversation.status === 'BOT_QUEUE' ? 'Bot' : 'Encerrado'}
                                        </span>
                                        </div>

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
                <div className="flex-1 flex flex-col relative">
                    {/* ✅ Toaster específico para notificações na área do chat (topo direito) */}
                    <Toaster 
                        position="top-right"
                        richColors
                        closeButton
                    />
                    {/* Chat Header - REFATORADO ✅ */}
                    <ConversationHeader
                        conversation={selectedConversation}
                        sessionInfo={sessionInfo}
                        canWrite={canWrite}
                        userId={user?.id}
                        isSessionExpired={isSessionExpired} // ✅ Passar flag de sessão expirada
                        onShowHistory={() => setShowHistoryModal(true)}
                        onShowTransfer={() => setShowTransferModal(true)}
                        onShowClose={() => setShowCloseModal(true)}
                        onTakeOver={() => selectedConversation && handleAssume(selectedConversation)}
                    />

                    {/* Messages */}
                    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-3 bg-gray-50 custom-scrollbar">
                        {messages.map((message) => {
                            // Use direction as the source of truth for alignment
                            const isFromBot = message.direction === 'SENT';
                            const isAgent = message.sender === 'AGENT';
                            const isBot = message.sender === 'BOT';
                            const isPatient = message.sender === 'PATIENT';

                            // Renderizar mensagem do sistema
                            if (message.messageType === 'SYSTEM') {
                                return (
                                    <SystemMessage
                                        key={message.id}
                                        type={message.systemMessageType || 'INFO'}
                                        content={message.messageText}
                                        metadata={message.systemMetadata}
                                        timestamp={message.timestamp}
                                    />
                                );
                            }

                            return (
                                <div key={message.id} className={`flex ${isFromBot ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-md px-4 py-2 rounded-2xl shadow-sm relative group ${isFromBot
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

                        {/* ✅ Aviso de Sessão Expirada */}
                        {isSessionExpired && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-red-600" />
                                    <div>
                                        <p className="text-sm font-medium text-red-700">
                                            Sessão Expirada (24h sem atividade)
                                        </p>
                                        <p className="text-xs text-red-600 mt-1">
                                            Esta conversa foi encerrada. Se o paciente enviar uma nova mensagem, será criada uma nova conversa.
                                        </p>
                                    </div>
                                </div>
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

                            {/* ✅ Botão de Atalhos Rápidos */}
                            <button
                                type="button"
                                onClick={() => setShowQuickRepliesModal(true)}
                                disabled={!canWrite}
                                className="p-2 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 group"
                                title={!canWrite ? 'Assuma a conversa para usar atalhos' : 'Atalhos rápidos'}
                            >
                                <Zap className="h-5 w-5 text-purple-600 group-hover:text-purple-700" />
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
                                    <textarea
                                        value={newMessage}
                                        rows={1}
                                        onChange={(e) => {
                                            // Atualização direta sem debounce para resposta instantânea
                                            const textarea = e.target as HTMLTextAreaElement;
                                            setNewMessage(textarea.value);
                                            // Ajustar altura automaticamente conforme o conteúdo
                                            textarea.style.height = 'auto';
                                            const newHeight = Math.min(textarea.scrollHeight, 120);
                                            textarea.style.height = `${newHeight}px`;
                                        }}
                                        onKeyDown={(e) => {
                                            // ✅ Verificar se o texto atual corresponde exatamente a um atalho
                                            if (newMessage.startsWith('/')) {
                                                const query = newMessage.slice(1).toLowerCase().trim();
                                                const exactMatch = quickReplies.find(qr => 
                                                    qr.shortcut.toLowerCase() === query
                                                );
                                                
                                                // ✅ Se corresponder exatamente e pressionar Enter ou Tab, substituir automaticamente
                                                if (exactMatch) {
                                                    if (e.key === 'Tab') {
                                                        e.preventDefault();
                                                        setNewMessage(exactMatch.text);
                                                        setShowAutocomplete(false);
                                                        return;
                                                    }
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        // Substituir o texto pelo conteúdo do atalho
                                                        setNewMessage(exactMatch.text);
                                                        setShowAutocomplete(false);
                                                        // Enviar diretamente com o texto do atalho
                                                        if (canSend && !sending) {
                                                            sendMessage(exactMatch.text);
                                                        }
                                                        return;
                                                    }
                                                }
                                            }
                                            
                                            // ✅ Autocomplete com Tab ou Enter (sem Shift para permitir Shift+Enter)
                                            if (showAutocomplete && filteredReplies.length > 0) {
                                                if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
                                                    e.preventDefault();
                                                    const selected = filteredReplies[selectedAutocompleteIndex];
                                                    setNewMessage(selected.text);
                                                    setShowAutocomplete(false);
                                                    return;
                                                }
                                                // Navegar com setas
                                                if (e.key === 'ArrowDown') {
                                                    e.preventDefault();
                                                    setSelectedAutocompleteIndex(prev =>
                                                        prev < filteredReplies.length - 1 ? prev + 1 : 0
                                                    );
                                                    return;
                                                }
                                                if (e.key === 'ArrowUp') {
                                                    e.preventDefault();
                                                    setSelectedAutocompleteIndex(prev =>
                                                        prev > 0 ? prev - 1 : filteredReplies.length - 1
                                                    );
                                                    return;
                                                }
                                                // Escape para fechar
                                                if (e.key === 'Escape') {
                                                    setShowAutocomplete(false);
                                                    return;
                                                }
                                            }

                                            // ✅ Shift+Enter: pular linha (comportamento padrão do textarea - não prevenir)
                                            // Enter sem Shift: enviar mensagem (prevenir quebra de linha)
                                            if (e.key === 'Enter' && !e.shiftKey && !showAutocomplete && (canSend || isRecording)) {
                                                e.preventDefault(); // Prevenir quebra de linha ao enviar
                                                if (isRecording) {
                                                    setAutoSendAfterStop(true);
                                                    stopRecording();
                                                    return;
                                                }
                                                sendMessage();
                                            }
                                            // Se for Shift+Enter, deixar o comportamento padrão do textarea (quebrar linha)
                                        }}
                                        placeholder="Digite sua mensagem... (Shift+Enter para pular linha)"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        style={{ 
                                            minHeight: '40px', 
                                            maxHeight: '120px',
                                            lineHeight: '1.5',
                                            overflowY: 'auto',
                                            whiteSpace: 'pre-wrap',
                                            wordWrap: 'break-word'
                                        }}
                                        disabled={!canWrite}
                                    />
                                )}

                                {/* ✅ Dropdown de Autocomplete */}
                                {showAutocomplete && filteredReplies.length > 0 && (
                                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                                        {filteredReplies.map((reply, index) => (
                                            <div
                                                key={reply.id}
                                                onClick={() => {
                                                    setNewMessage(reply.text);
                                                    setShowAutocomplete(false);
                                                }}
                                                className={`px-4 py-2 cursor-pointer transition-colors ${index === selectedAutocompleteIndex
                                                    ? 'bg-blue-50 border-l-2 border-blue-500'
                                                    : 'hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <code className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-mono">
                                                        /{reply.shortcut}
                                                    </code>
                                                    <span className="text-sm text-gray-700 truncate">
                                                        {reply.text.substring(0, 50)}{reply.text.length > 50 ? '...' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                                            <p className="text-xs text-gray-500">
                                                ↑↓ Navegar • Tab/Enter Selecionar • Esc Fechar
                                            </p>
                                        </div>
                                    </div>
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
            {/* ✅ Modal de Atalhos Rápidos */}
            <QuickRepliesModal
                isOpen={showQuickRepliesModal}
                onClose={() => setShowQuickRepliesModal(false)}
                onSelect={(text) => {
                    setNewMessage(text);
                    setShowQuickRepliesModal(false);
                }}
            />

        </div>

    );
};

export default ConversationsPage;