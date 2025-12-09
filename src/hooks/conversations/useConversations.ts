import { useState, useCallback } from 'react';
import { api } from '../../lib/utils';
import { toast } from 'sonner';

export interface Conversation {
    id: string;
    phone: string;
    status: 'BOT_QUEUE' | 'PRINCIPAL' | 'AGUARDANDO' | 'EM_ATENDIMENTO' | 'FECHADA';
    assignedToId?: string;
    assignedTo?: { id: string; name: string };
    patient?: {
        id: string;
        name: string;
        phone: string;
        cpf?: string;
        email?: string;
        birthDate?: string;
        insuranceCompany?: string;
        insuranceNumber?: string;
    };
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
    unreadCount?: number;
}

export const useConversations = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [closedConversations, setClosedConversations] = useState<Conversation[]>([]);
    const [closedTotal, setClosedTotal] = useState(0);
    const [closedPage, setClosedPage] = useState(1);
    const [hasMoreClosed, setHasMoreClosed] = useState(true);
    const [loading, setLoading] = useState(true);
    const [loadingClosed, setLoadingClosed] = useState(false);

    const fetchConversations = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/conversations');
            const data = response.data || [];
            setConversations(data);
        } catch (error) {
            console.error('Error fetching conversations:', error);
            toast.error('Erro ao carregar conversas');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchClosedConversations = useCallback(async (page = 1, append = false, search = '') => {
        try {
            setLoadingClosed(true);
            const response = await api.get('/api/conversations/closed', {
                params: { page, limit: 20, search }
            });
            const { conversations: newConversations, total } = response.data;

            if (append) {
                setClosedConversations(prev => [...prev, ...newConversations]);
            } else {
                setClosedConversations(newConversations);
            }

            setClosedTotal(total);
            setHasMoreClosed(newConversations.length === 20);
        } catch (error) {
            console.error('Error fetching closed conversations:', error);
            toast.error('Erro ao carregar conversas encerradas');
        } finally {
            setLoadingClosed(false);
        }
    }, []);

    const handleAssume = useCallback(async (conversation: Conversation) => {
        try {
            await api.post('/api/conversations/actions', {
                action: 'assume',
                phone: conversation.phone
            });
            toast.success('Conversa assumida com sucesso!');
            await fetchConversations();
        } catch (error) {
            console.error('Error assuming conversation:', error);
            toast.error('Erro ao assumir conversa');
        }
    }, [fetchConversations]);

    const handleReopen = useCallback(async (conversation: Conversation) => {
        try {
            await api.post('/api/conversations/actions', {
                action: 'reopen',
                phone: conversation.phone
            });
            toast.success('Conversa reaberta com sucesso!');
            await fetchConversations();
        } catch (error) {
            console.error('Error reopening conversation:', error);
            toast.error('Erro ao reabrir conversa');
        }
    }, [fetchConversations]);

    const handleTransfer = useCallback(async (conversationId: string, targetId: string, targetType: 'queue' | 'bot' | 'agent') => {
        try {
            const actionMap = {
                queue: 'return',
                bot: 'to_bot',
                agent: 'transfer'
            };

            await api.post('/api/conversations/actions', {
                action: actionMap[targetType],
                phone: conversationId,
                ...(targetType === 'agent' && { targetAgentId: targetId })
            });

            toast.success('Conversa transferida com sucesso!');
            await fetchConversations();
        } catch (error) {
            console.error('Error transferring conversation:', error);
            toast.error('Erro ao transferir conversa');
        }
    }, [fetchConversations]);

    const handleClose = useCallback(async (conversationId: string) => {
        try {
            await api.post('/api/conversations/actions', {
                action: 'close',
                phone: conversationId
            });
            toast.success('Conversa encerrada com sucesso!');
            await fetchConversations();
        } catch (error) {
            console.error('Error closing conversation:', error);
            toast.error('Erro ao encerrar conversa');
        }
    }, [fetchConversations]);

    return {
        conversations,
        closedConversations,
        closedTotal,
        closedPage,
        hasMoreClosed,
        loading,
        loadingClosed,
        setClosedPage,
        setConversations,
        fetchConversations,
        fetchClosedConversations,
        handleAssume,
        handleReopen,
        handleTransfer,
        handleClose
    };
};
