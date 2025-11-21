import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ConversationList from '../components/ConversationList';
import MessageList from '../components/MessageList';
import { api } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';

interface Conversation {
  id: string;
  status: 'BOT' | 'PRINCIPAL' | 'HUMAN' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedTo?: {
    id: string;
    name: string;
  };
  patient: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    insuranceCompany?: string;
    preferences?: any;
  };
}

const Conversations: React.FC = () => {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, joinConversation } = useSocket();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchConversation = async (phone: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/conversations/${phone}`);
      const c = response.data

      // Map assignedTo properly
      let assignedTo = undefined;
      if (c.assignedTo) {
        assignedTo = { id: c.assignedTo.id, name: c.assignedTo.name };
      } else if (c.assignedToId) {
        if (c.assignedToId === user?.id) {
          assignedTo = { id: user.id, name: user.name || user.email || 'You' };
        } else {
          assignedTo = { id: c.assignedToId, name: 'Atendente' };
        }
      }

      const mapped: Conversation = {
        id: c.id,
        status: ((s => {
          if (s === 'BOT_QUEUE') return 'BOT'
          if (s === 'EM_ATENDIMENTO') return 'HUMAN'
          if (s === 'FECHADA') return 'CLOSED'
          return s || 'PRINCIPAL'
        })(c.status)) as any,
        priority: 'LOW',
        assignedTo,
        patient: {
          id: c.patient?.id || '',
          name: c.patient?.name || c.phone,
          phone: c.phone,
          email: c.patient?.email,
          insuranceCompany: c.patient?.insuranceCompany,
          preferences: c.patient?.preferences,
        }
      }
      setConversation(mapped);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      toast.error('Erro ao carregar conversa');
      navigate('/conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (phone) {
      fetchConversation(phone);
    } else {
      setConversation(null);
    }
  }, [phone]);

  useEffect(() => {
    if (!socket || !phone) return;
    joinConversation(phone);

    const onConversationUpdated = (updated: any) => {
      if (!updated || updated.phone !== phone) return;

      // Map assignedTo properly, including when only assignedToId is provided
      let assignedTo = undefined;
      if (updated.assignedTo) {
        assignedTo = { id: updated.assignedTo.id, name: updated.assignedTo.name };
      } else if (updated.assignedToId) {
        // If only ID is provided, check if it's the current user
        if (updated.assignedToId === user?.id) {
          assignedTo = { id: user.id, name: user.name || user.email || 'You' };
        } else {
          // For other users, we can't get the name, but we need to at least set the ID
          assignedTo = { id: updated.assignedToId, name: 'Atendente' };
        }
      }

      setConversation(prev => prev ? {
        ...prev,
        status: ((s => {
          if (s === 'BOT_QUEUE') return 'BOT'
          if (s === 'EM_ATENDIMENTO') return 'HUMAN'
          if (s === 'FECHADA') return 'CLOSED'
          return s || 'PRINCIPAL'
        })(updated.status)) as any,
        assignedTo,
        patient: {
          id: updated.patient?.id || prev.patient.id,
          name: updated.patient?.name || prev.patient.name,
          phone: updated.phone,
          email: updated.patient?.email,
          insuranceCompany: updated.patient?.insuranceCompany,
          preferences: updated.patient?.preferences,
        }
      } : prev)
    }

    const onQueueUpdated = (payload: any) => {
      const updated = payload?.conversation;
      if (!updated || updated.phone !== phone) return;
      onConversationUpdated(updated);
    }

    socket.on('conversation_updated', onConversationUpdated);
    socket.on('queue_updated', onQueueUpdated);

    return () => {
      socket.off('conversation_updated', onConversationUpdated);
      socket.off('queue_updated', onQueueUpdated);
    }
  }, [socket, phone]);

  const handleStatusChange = async (newStatus: string) => {
    if (!conversation) return;

    const mappedStatus = newStatus === 'BOT' ? 'BOT_QUEUE'
      : newStatus === 'HUMAN' ? 'EM_ATENDIMENTO'
        : newStatus;

    try {
      await api.patch(`/api/conversations/${conversation.id}/status`, { status: mappedStatus });
      toast.success('Status da conversa atualizado');
      setConversation({ ...conversation, status: newStatus as any });
    } catch (error) {
      console.error('Error updating conversation status:', error);
      toast.error('Erro ao atualizar status da conversa');
    }
  };

  return (
    <div className="flex h-screen">
      <ConversationList
        selectedConversationId={phone}
        currentUserId={user?.id}
        onConversationSelect={(conversationId) => navigate(`/conversations/${conversationId}`)}
      />

      {conversation ? (
        <MessageList
          conversationId={phone!}
          conversation={conversation}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="bg-gray-200 p-6 rounded-full mx-auto mb-4 w-16 h-16 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione uma conversa</h3>
            <p className="text-gray-500">Escolha uma conversa do lado esquerdo para começar a conversar</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Conversations;
