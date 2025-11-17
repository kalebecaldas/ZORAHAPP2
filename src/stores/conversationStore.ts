import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { io, Socket } from 'socket.io-client';

export interface Message {
  id: string;
  content: string;
  sender: 'patient' | 'bot' | 'user' | 'system';
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'appointment' | 'workflow' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  context?: any;
  metadata?: {
    procedureId?: string;
    locationId?: string;
    appointmentId?: string;
    workflowId?: string;
  };
}

export interface Conversation {
  id: string;
  patientName: string;
  patientPhone: string;
  status: 'bot' | 'principal' | 'assigned' | 'transferred' | 'completed' | 'expired';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
  };
  assignedAt?: Date;
  transferredAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: Message;
  lastInteraction: Date;
  messageCount: number;
  unreadCount: number;
  isActive: boolean;
  queue: 'bot' | 'principal' | 'my-conversations';
  tags: string[];
  metadata?: {
    patientId?: string;
    procedureId?: string;
    locationId?: string;
    appointmentId?: string;
    workflowId?: string;
    isNewPatient?: boolean;
    confidenceScore?: number;
    assignmentRequests?: {
      userId: string;
      userName: string;
      timestamp: Date;
      status: 'pending' | 'approved' | 'rejected';
    }[];
  };
  lastBotContext?: any;
  lastAppointment?: any;
  workflowStep?: string;
  activeWorkflow?: any;
}

export interface ConversationFilters {
  status?: Conversation['status'][];
  priority?: Conversation['priority'][];
  queue?: Conversation['queue'][];
  assignedTo?: string;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

export interface ConversationStats {
  total: number;
  byStatus: Record<Conversation['status'], number>;
  byPriority: Record<Conversation['priority'], number>;
  byQueue: Record<Conversation['queue'], number>;
  assignedToMe: number;
  urgentCount: number;
  expiredCount: number;
  avgResponseTime: number;
  avgResolutionTime: number;
}

interface ConversationStore {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  filters: ConversationFilters;
  sortBy: 'createdAt' | 'updatedAt' | 'priority' | 'lastInteraction';
  sortOrder: 'asc' | 'desc';
  isLoading: boolean;
  error: string | null;
  socket: Socket | null;
  isConnected: boolean;
  
  // Actions
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
  setActiveConversation: (conversation: Conversation | null) => void;
  addMessage: (conversationId: string, message: Message) => void;
  markAsRead: (conversationId: string) => void;
  assignConversation: (conversationId: string, assignee: Conversation['assignedTo']) => void;
  transferConversation: (conversationId: string, newAssignee: Conversation['assignedTo']) => void;
  updateQueue: (conversationId: string, queue: Conversation['queue']) => void;
  setPriority: (conversationId: string, priority: Conversation['priority']) => void;
  addTag: (conversationId: string, tag: string) => void;
  removeTag: (conversationId: string, tag: string) => void;
  addAssignmentRequest: (
    conversationId: string,
    request: { userId: string; userName: string; timestamp: Date; status: 'pending' | 'approved' | 'rejected' }
  ) => void;
  setFilters: (filters: ConversationFilters) => void;
  clearFilters: () => void;
  setSortBy: (sortBy: ConversationStore['sortBy']) => void;
  setSortOrder: (sortOrder: ConversationStore['sortOrder']) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Socket actions
  connectSocket: () => void;
  disconnectSocket: () => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  
  // Queue management
  getBotQueue: () => Conversation[];
  getPrincipalQueue: () => Conversation[];
  getMyConversations: (userId: string) => Conversation[];
  getFilteredConversations: () => Conversation[];
  getConversationStats: () => ConversationStats;
  
  // Timeout and expiry management
  checkTimeouts: () => void;
  checkExpirations: () => void;
  autoTransferExpired: () => void;
}

const initialFilters: ConversationFilters = {
  status: ['bot', 'principal', 'assigned'],
  priority: ['low', 'medium', 'high', 'urgent'],
  queue: ['bot', 'principal', 'my-conversations'],
};

export const useConversationStore = create<ConversationStore>()(
  devtools(
    persist(
      (set, get) => ({
        conversations: [],
        activeConversation: null,
        filters: initialFilters,
        sortBy: 'lastInteraction',
        sortOrder: 'desc',
        isLoading: false,
        error: null,
        socket: null,
        isConnected: false,

        // Basic actions
        setConversations: (conversations) => set({ conversations }),
        
        addConversation: (conversation) => set((state) => ({
          conversations: [...state.conversations, conversation],
        })),
        
        updateConversation: (id, updates) => set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id ? { ...conv, ...updates, updatedAt: new Date() } : conv
          ),
          activeConversation: state.activeConversation?.id === id 
            ? { ...state.activeConversation, ...updates, updatedAt: new Date() }
            : state.activeConversation,
        })),
        
        removeConversation: (id) => set((state) => ({
          conversations: state.conversations.filter((conv) => conv.id !== id),
          activeConversation: state.activeConversation?.id === id ? null : state.activeConversation,
        })),
        
        setActiveConversation: (conversation) => set({ activeConversation: conversation }),
        
        addMessage: (conversationId, message) => set((state) => {
          const conversations = state.conversations.map((conv) => {
            if (conv.id === conversationId) {
              const isUnread = state.activeConversation?.id !== conversationId;
              return {
                ...conv,
                lastMessage: message,
                lastInteraction: message.timestamp,
                messageCount: conv.messageCount + 1,
                unreadCount: isUnread ? conv.unreadCount + 1 : conv.unreadCount,
                updatedAt: new Date(),
              };
            }
            return conv;
          });

          // Update active conversation if it's the current one
          const activeConversation = state.activeConversation?.id === conversationId
            ? conversations.find(conv => conv.id === conversationId) || state.activeConversation
            : state.activeConversation;

          return { conversations, activeConversation };
        }),
        
        markAsRead: (conversationId) => set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
          ),
        })),
        
        assignConversation: (conversationId, assignee) => set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  assignedTo: assignee,
                  status: 'assigned',
                  assignedAt: new Date(),
                  queue: 'my-conversations',
                  updatedAt: new Date(),
                }
              : conv
          ),
        })),
        
        transferConversation: (conversationId, newAssignee) => set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  assignedTo: newAssignee,
                  status: 'transferred',
                  transferredAt: new Date(),
                  updatedAt: new Date(),
                }
              : conv
          ),
        })),
        
        updateQueue: (conversationId, queue) => set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  queue,
                  status: queue === 'bot' ? 'bot' : queue === 'principal' ? 'principal' : conv.status,
                  updatedAt: new Date(),
                }
              : conv
          ),
        })),
        
        setPriority: (conversationId, priority) => set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId ? { ...conv, priority, updatedAt: new Date() } : conv
          ),
        })),
        
        addTag: (conversationId, tag) => set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? { ...conv, tags: [...conv.tags, tag], updatedAt: new Date() }
              : conv
          ),
        })),
        
        removeTag: (conversationId, tag) => set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? { ...conv, tags: conv.tags.filter((t) => t !== tag), updatedAt: new Date() }
              : conv
          ),
        })),

        addAssignmentRequest: (conversationId, request) => set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  metadata: {
                    ...conv.metadata,
                    assignmentRequests: [...(conv.metadata?.assignmentRequests || []), request],
                  },
                  updatedAt: new Date(),
                }
              : conv
          ),
        })),
        
        setFilters: (filters) => set({ filters }),
        
        clearFilters: () => set({ filters: initialFilters }),
        
        setSortBy: (sortBy) => set({ sortBy }),
        
        setSortOrder: (sortOrder) => set({ sortOrder }),
        
        setLoading: (isLoading) => set({ isLoading }),
        
        setError: (error) => set({ error }),

        // Socket actions
        connectSocket: () => {
          const state = get();
          if (state.socket?.connected) return;

          const socket = io(window.location.origin, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
          });

          socket.on('connect', () => {
            console.log('Conversation store socket connected');
            set({ isConnected: true });
            
            // Join active conversations
            const { conversations } = get();
            conversations.forEach(conv => {
              if (conv.isActive) {
                socket.emit('join:conversation', conv.id);
              }
            });
          });

          socket.on('disconnect', () => {
            console.log('Conversation store socket disconnected');
            set({ isConnected: false });
          });

          socket.on('conversation:updated', (data) => {
            get().updateConversation(data.id, data);
          });

          socket.on('conversation:new', (conversation) => {
            get().addConversation(conversation);
          });

          socket.on('conversation:message', ({ conversationId, message }) => {
            get().addMessage(conversationId, message);
          });

          socket.on('conversation:assigned', ({ conversationId, assignee }) => {
            get().assignConversation(conversationId, assignee);
          });

          socket.on('conversation:transferred', ({ conversationId, newAssignee }) => {
            get().transferConversation(conversationId, newAssignee);
          });

          socket.on('conversation:timeout', ({ conversationId }) => {
            get().updateConversation(conversationId, {
              status: 'expired',
              isActive: false,
            });
          });

          socket.on('conversation:expired', ({ conversationId }) => {
            get().updateConversation(conversationId, {
              status: 'expired',
              isActive: false,
            });
          });

          socket.on('queue_updated', ({ action, conversation }) => {
            console.debug('Queue updated event received', { action, conversationId: conversation?.id });
            if (conversation?.id) {
              get().updateConversation(conversation.id, conversation);
            }
          });

          socket.on('conversation_request_created', (data) => {
            get().addAssignmentRequest(data.conversationId, {
              userId: data.requestedBy.id,
              userName: data.requestedBy.name,
              timestamp: new Date(),
              status: 'pending',
            });
          });

          set({ socket });
        },
        
        disconnectSocket: () => {
          const { socket } = get();
          if (socket) {
            socket.disconnect();
            set({ socket: null, isConnected: false });
          }
        },
        
        joinConversation: (conversationId) => {
          const { socket } = get();
          if (socket?.connected) {
            socket.emit('join:conversation', conversationId);
          }
        },
        
        leaveConversation: (conversationId) => {
          const { socket } = get();
          if (socket?.connected) {
            socket.emit('leave:conversation', conversationId);
          }
        },

        // Queue management
        getBotQueue: () => {
          const { conversations } = get();
          return conversations.filter(conv => 
            (conv.queue === 'bot' && conv.status === 'bot') || conv.status === 'assigned'
          ).sort((a, b) => {
            // Sort by priority and creation time
            const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });
        },
        
        getPrincipalQueue: () => {
          const { conversations } = get();
          return conversations.filter(conv => 
            (conv.queue === 'principal' && conv.status === 'principal') || conv.status === 'assigned'
          ).sort((a, b) => {
            const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });
        },
        
        getMyConversations: (userId) => {
          const { conversations } = get();
          return conversations.filter(conv => 
            conv.assignedTo?.id === userId && conv.status === 'assigned'
          ).sort((a, b) => {
            const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(b.lastInteraction).getTime() - new Date(a.lastInteraction).getTime();
          });
        },
        
        getFilteredConversations: () => {
          const { conversations, filters, sortBy, sortOrder } = get();
          
          let filtered = conversations.filter(conv => {
            // Status filter
            if (filters.status?.length && !filters.status.includes(conv.status)) {
              return false;
            }
            
            // Priority filter
            if (filters.priority?.length && !filters.priority.includes(conv.priority)) {
              return false;
            }
            
            // Queue filter
            if (filters.queue?.length && !filters.queue.includes(conv.queue)) {
              return false;
            }
            
            // Assigned to filter
            if (filters.assignedTo && conv.assignedTo?.id !== filters.assignedTo) {
              return false;
            }
            
            // Tags filter
            if (filters.tags?.length) {
              const hasTag = filters.tags.some(tag => conv.tags.includes(tag));
              if (!hasTag) return false;
            }
            
            // Date range filter
            if (filters.dateRange) {
              const convDate = new Date(conv.createdAt);
              if (convDate < filters.dateRange.start || convDate > filters.dateRange.end) {
                return false;
              }
            }
            
            // Search query filter
            if (filters.searchQuery) {
              const query = filters.searchQuery.toLowerCase();
              const matchesSearch = 
                conv.patientName.toLowerCase().includes(query) ||
                conv.patientPhone.includes(query) ||
                conv.tags.some(tag => tag.toLowerCase().includes(query));
              if (!matchesSearch) return false;
            }
            
            return true;
          });
          
          // Sort conversations
          filtered.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
              case 'priority':
                const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
                comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
                break;
              case 'createdAt':
                comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                break;
              case 'updatedAt':
                comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
                break;
              case 'lastInteraction':
                comparison = new Date(a.lastInteraction).getTime() - new Date(b.lastInteraction).getTime();
                break;
            }
            
            return sortOrder === 'asc' ? comparison : -comparison;
          });
          
          return filtered;
        },
        
        getConversationStats: () => {
          const { conversations } = get();
          
          const stats: ConversationStats = {
            total: conversations.length,
            byStatus: {
              bot: 0,
              principal: 0,
              assigned: 0,
              transferred: 0,
              completed: 0,
              expired: 0,
            },
            byPriority: {
              low: 0,
              medium: 0,
              high: 0,
              urgent: 0,
            },
            byQueue: {
              bot: 0,
              principal: 0,
              'my-conversations': 0,
            },
            assignedToMe: 0,
            urgentCount: 0,
            expiredCount: 0,
            avgResponseTime: 0,
            avgResolutionTime: 0,
          };
          
          conversations.forEach(conv => {
            stats.byStatus[conv.status]++;
            stats.byPriority[conv.priority]++;
            stats.byQueue[conv.queue]++;
            
            if (conv.priority === 'urgent') stats.urgentCount++;
            if (conv.status === 'expired') stats.expiredCount++;
          });
          
          return stats;
        },

        // Timeout and expiry management
        checkTimeouts: () => {
          const { conversations } = get();
          const now = new Date();
          
          conversations.forEach(conv => {
            if (conv.status === 'principal' && !conv.assignedTo) {
              // Check for 30-second timeout in principal queue
              const timeInQueue = now.getTime() - new Date(conv.updatedAt).getTime();
              if (timeInQueue > 30000) { // 30 seconds
                // Auto-transfer back to bot or escalate
                get().updateConversation(conv.id, {
                  status: 'bot',
                  queue: 'bot',
                  priority: 'high', // Escalate priority
                  tags: [...conv.tags, 'timeout', 'escalated'],
                });
              }
            }
          });
        },
        
        checkExpirations: () => {
          const { conversations } = get();
          const now = new Date();
          
          conversations.forEach(conv => {
            if (conv.expiresAt && now > conv.expiresAt) {
              get().updateConversation(conv.id, {
                status: 'expired',
                isActive: false,
                tags: [...conv.tags, 'expired'],
              });
            }
          });
        },
        
        autoTransferExpired: () => {
          const { conversations } = get();
          const now = new Date();
          
          conversations.forEach(conv => {
            if (conv.status === 'assigned' && conv.assignedAt) {
              // Check for 24-hour assignment expiry
              const timeAssigned = now.getTime() - new Date(conv.assignedAt).getTime();
              if (timeAssigned > 24 * 60 * 60 * 1000) { // 24 hours
                get().updateConversation(conv.id, {
                  status: 'principal',
                  queue: 'principal',
                  assignedTo: undefined,
                  assignedAt: undefined,
                  priority: 'high',
                  tags: [...conv.tags, 'expired-assignment', 'needs-attention'],
                });
              }
            }
          });
        },
      }),
      {
        name: 'conversation-store',
        partialize: (state) => ({
          conversations: state.conversations,
          filters: state.filters,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
        }),
      }
    )
  )
);

// Start timeout and expiry checkers
const startTimeoutChecker = () => {
  setInterval(() => {
    useConversationStore.getState().checkTimeouts();
  }, 5000); // Check every 5 seconds
};

const startExpirationChecker = () => {
  setInterval(() => {
    useConversationStore.getState().checkExpirations();
    useConversationStore.getState().autoTransferExpired();
  }, 60000); // Check every minute
};

// Start checkers when store is created
startTimeoutChecker();
startExpirationChecker();

// Auto-connect socket on client side
if (typeof window !== 'undefined') {
  useConversationStore.getState().connectSocket();
}