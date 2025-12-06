import { useState, useCallback } from 'react';
import { api } from '../../lib/utils';
import { toast } from 'sonner';

export interface Message {
    id: string;
    conversationId: string;
    sender: 'BOT' | 'PATIENT' | 'AGENT' | 'SYSTEM';
    messageText: string;
    messageType: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'AUDIO' | 'SYSTEM';
    mediaUrl?: string | null;
    direction: 'SENT' | 'RECEIVED' | 'SYSTEM';
    timestamp: string;
    status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ';
    metadata?: any;
    systemMessageType?: string;
    systemMetadata?: any;
}

export const useMessages = (conversationId: string) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const fetchMessages = useCallback(async (phone: string) => {
        try {
            setLoading(true);
            const response = await api.get(`/api/conversations/${phone}`, {
                params: { limit: 50 }
            });
            const msgs = (response.data?.messages || []).map((m: any) => ({
                id: m.id,
                conversationId: response.data.id || phone,
                sender: m.direction === 'RECEIVED' ? 'PATIENT' : (m.from === 'BOT' ? 'BOT' : 'AGENT'),
                messageText: m.messageText,
                messageType: m.messageType || 'TEXT',
                mediaUrl: m.mediaUrl,
                metadata: m.metadata,
                direction: m.direction,
                timestamp: m.timestamp,
                status: m.direction === 'SENT' ? 'SENT' : 'PENDING',
            }));
            setMessages(msgs);
        } catch (error) {
            console.error('Error fetching messages:', error);
            toast.error('Erro ao carregar mensagens');
        } finally {
            setLoading(false);
        }
    }, []);

    const sendMessage = useCallback(async (text: string, phone: string) => {
        if (!text.trim() || sending) return;

        setSending(true);
        try {
            const tempId = `temp-${Date.now()}`;
            const optimistic: Message = {
                id: tempId,
                conversationId: phone,
                sender: 'AGENT',
                messageText: text,
                messageType: 'TEXT',
                direction: 'SENT',
                timestamp: new Date().toISOString(),
                status: 'PENDING',
            };
            setMessages(prev => [...prev, optimistic]);

            const response = await api.post(`/api/conversations/send`, {
                phone,
                text,
                from: 'AGENT'
            });

            const sent = response.data?.message;
            if (sent) {
                setMessages(prev => prev.map(m => m.id === tempId ? { ...m, ...sent, status: 'SENT' } : m));
            } else {
                await fetchMessages(phone);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Erro ao enviar mensagem');
        } finally {
            setSending(false);
        }
    }, [sending, fetchMessages]);

    const sendFiles = useCallback(async (files: File[], conversationId: string) => {
        try {
            const formData = new FormData();
            files.forEach(file => formData.append('files', file));

            await api.post(`/api/conversations/${conversationId}/files`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            toast.success(`${files.length} arquivo(s) enviado(s)`);
        } catch (error) {
            console.error('Error sending files:', error);
            toast.error('Erro ao enviar arquivos');
        }
    }, []);

    const addMessage = useCallback((message: Message) => {
        setMessages(prev => {
            if (prev.some(m => m.id === message.id)) return prev;
            return [...prev, message];
        });
    }, []);

    return {
        messages,
        loading,
        sending,
        setMessages,
        fetchMessages,
        sendMessage,
        sendFiles,
        addMessage
    };
};
