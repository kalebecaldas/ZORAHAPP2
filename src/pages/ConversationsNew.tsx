import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Phone, User, Bot, Clock, Users, UserCheck, Archive,
    Send, Paperclip, Mic, StopCircle, X, Image as ImageIcon,
    File, Trash2, Video, MoreVertical, PhoneCall, AlertCircle
} from 'lucide-react';
import { api } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { toast } from 'sonner';

// Types
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
    const [activeQueue, setActiveQueue] = useState<QueueType>('BOT_QUEUE');
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

    // File states
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);

    // Transfer and close states
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [availableAgents, setAvailableAgents] = useState<any[]>([]);
    const [transferTarget, setTransferTarget] = useState<string>('');


    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Permission check
    const canWrite = !!(
        selectedConversation?.assignedTo &&
        user?.id &&
        selectedConversation.assignedTo.id === user.id &&
        selectedConversation.status === 'EM_ATENDIMENTO'
    );

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
                direction: m.direction,
                timestamp: m.timestamp,
                status: m.direction === 'SENT' ? 'SENT' : 'PENDING',
                metadata: m.metadata
            }));
            setMessages(msgs);

            // Update selected conversation data
            const conv = response.data;
            setSelectedConversation({
                ...selectedConversation!,
                status: conv.status,
                assignedToId: conv.assignedToId,
                assignedTo: conv.assignedTo,
                patient: conv.patient
            });
        } catch (error) {
            console.error('Error fetching messages:', error);
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



    // Send message
    const sendMessage = async () => {
        if ((!newMessage.trim() && pendingFiles.length === 0 && !audioBlob) || sending) return;

        setSending(true);
        try {
            // Send text
            if (newMessage.trim()) {
                await api.post('/api/conversations/send', {
                    phone: selectedConversation!.phone,
                    text: newMessage,
                    from: 'AGENT'
                });
                setNewMessage('');
            }

            // Send files
            if (pendingFiles.length > 0) {
                const formData = new FormData();
                pendingFiles.forEach(file => formData.append('files', file));
                await api.post(`/api/conversations/${selectedConversation!.phone}/files`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setPendingFiles([]);
            }

            // Send audio
            if (audioBlob) {
                const formData = new FormData();
                formData.append('files', audioBlob, 'audio_message.webm');
                await api.post(`/api/conversations/${selectedConversation!.phone}/files`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setAudioBlob(null);
                setAudioUrl(null);
            }

            fetchMessages(selectedConversation!.phone);
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Erro ao enviar mensagem');
        } finally {
            setSending(false);
        }
    };

    // Audio recording
    const startRecording = async () => {
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
            }
        }
    }, [phone, conversations]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!socket || !selectedConversation) return;

        socket.emit('join_conversation', selectedConversation.phone);

        const onNewMessage = (payload: any) => {
            if (payload?.phone === selectedConversation.phone || payload?.message?.conversationId === selectedConversation.id) {
                fetchMessages(selectedConversation.phone);
            }
        };

        const onConversationUpdated = (updated: any) => {
            if (updated?.phone === selectedConversation.phone || updated?.id === selectedConversation.id) {
                fetchMessages(selectedConversation.phone);
                fetchConversations();
            }
        };

        socket.on('new_message', onNewMessage);
        socket.on('message_sent', onNewMessage);
        socket.on('conversation_updated', onConversationUpdated);
        socket.on('queue_updated', onConversationUpdated);

        return () => {
            socket.emit('leave_conversation', selectedConversation.phone);
            socket.off('new_message', onNewMessage);
            socket.off('message_sent', onNewMessage);
            socket.off('conversation_updated', onConversationUpdated);
            socket.off('queue_updated', onConversationUpdated);
        };
    }, [socket, selectedConversation]);

    return (
        <div className="flex h-screen bg-gray-50">
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
                                        }`}>
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
                                            <div>
                                                <h3 className="font-medium text-gray-900 text-sm">
                                                    {conversation.patient?.name || conversation.phone}
                                                </h3>
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
                                    <p className="text-sm text-gray-500">{selectedConversation.phone}</p>
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
                    <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-gray-50 custom-scrollbar">
                        {messages.map((message) => {
                            const isAgent = message.sender === 'AGENT';
                            const isBot = message.sender === 'BOT';
                            const isPatient = message.sender === 'PATIENT';

                            return (
                                <div key={message.id} className={`flex ${isAgent || isBot ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-md px-4 py-2 rounded-2xl shadow-sm ${isAgent || isBot
                                        ? 'bg-blue-600 text-white rounded-br-sm'
                                        : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                                        }`}>
                                        {message.messageType === 'TEXT' && (
                                            <p className="text-sm whitespace-pre-wrap">{message.messageText}</p>
                                        )}

                                        {message.messageType === 'IMAGE' && (
                                            <img
                                                src={message.metadata?.url || message.messageText}
                                                alt="Imagem"
                                                className="max-w-full rounded-lg"
                                            />
                                        )}

                                        {message.messageType === 'AUDIO' && (
                                            <audio controls src={message.metadata?.url || message.messageText} className="max-w-full" />
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
                            <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
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
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.wav"
                                onChange={(e) => {
                                    if (e.target.files) {
                                        setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                        e.target.value = '';
                                    }
                                }}
                                className="hidden"
                                disabled={!canWrite}
                            />

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={!canWrite}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <Paperclip className="h-5 w-5 text-gray-600" />
                            </button>

                            <div className="flex-1 relative">
                                {isRecording ? (
                                    <div className="absolute inset-0 bg-red-50 rounded-lg flex items-center justify-between px-4 border border-red-200">
                                        <div className="flex items-center gap-2 text-red-600 animate-pulse">
                                            <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                                            <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={cancelRecording} className="p-1 hover:bg-red-100 rounded">
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                            <button onClick={stopRecording} className="p-1 hover:bg-red-100 rounded">
                                                <StopCircle className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                        placeholder="Digite sua mensagem..."
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={!canWrite}
                                    />
                                )}
                            </div>

                            {!newMessage.trim() && !isRecording && !audioBlob && pendingFiles.length === 0 ? (
                                <button
                                    onClick={startRecording}
                                    disabled={!canWrite}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-red-600 disabled:opacity-50"
                                >
                                    <Mic className="h-5 w-5" />
                                </button>
                            ) : (
                                <button
                                    onClick={sendMessage}
                                    disabled={(!newMessage.trim() && pendingFiles.length === 0 && !audioBlob) || sending || !canWrite}
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
        </div>

    );
};

export default ConversationsPage;
