import { io, Socket } from 'socket.io-client';
import { useConversationStore } from '../stores/conversationStore';

interface BotMessage {
  id: string;
  conversationId: string;
  message: string;
  context?: any;
  timestamp: Date;
  type: 'text' | 'appointment' | 'workflow' | 'system';
}

interface BotResponse {
  message: string;
  suggestedActions?: string[];
  context?: any;
  confidence?: number;
}

class IntelligentBotService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    try {
      const base = (import.meta as any).env?.VITE_API_URL || 
        (import.meta.env.DEV 
          ? 'http://localhost:3001' 
          : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'))
      this.socket = io(base, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 10000,
      });

      this.setupSocketListeners();
    } catch (error) {
      console.error('Failed to initialize socket:', error);
      this.scheduleReconnect();
    }
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Bot service connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Join conversation rooms for active conversations
      const { conversations } = useConversationStore.getState();
      conversations.forEach(conv => {
        if (conv.status === 'bot' || conv.status === 'principal') {
          this.socket?.emit('join:conversation', conv.id);
        }
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Bot service disconnected:', reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Bot service connection error:', error);
      this.isConnected = false;
      this.scheduleReconnect();
    });

    // Listen for bot responses
    this.socket.on('bot:message', (data: BotMessage) => {
      this.handleBotMessage(data);
    });

    // Listen for appointment updates
    this.socket.on('appointment:created', (data) => {
      this.handleAppointmentEvent('created', data);
    });

    this.socket.on('appointment:rescheduled', (data) => {
      this.handleAppointmentEvent('rescheduled', data);
    });

    this.socket.on('appointment:cancelled', (data) => {
      this.handleAppointmentEvent('cancelled', data);
    });

    // Listen for conversation updates
    this.socket.on('conversation:assigned', (data) => {
      this.handleConversationAssignment(data);
    });

    this.socket.on('conversation:transferred', (data) => {
      this.handleConversationTransfer(data);
    });

    // Listen for workflow updates
    this.socket.on('workflow:triggered', (data) => {
      this.handleWorkflowTrigger(data);
    });
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      this.initializeSocket();
    }, delay);
  }

  private handleBotMessage(message: BotMessage) {
    const { addMessage, updateConversation } = useConversationStore.getState();
    
    // Add bot message to conversation
    addMessage(message.conversationId, {
      id: message.id,
      content: message.message,
      sender: 'bot',
      timestamp: message.timestamp,
      type: message.type,
      context: message.context,
    });

    // Update conversation with bot context
    if (message.context) {
      updateConversation(message.conversationId, {
        lastBotContext: message.context,
        lastInteraction: new Date(),
      });
    }

    // Handle suggested actions
    if (message.context?.suggestedActions) {
      this.handleSuggestedActions(message.conversationId, message.context.suggestedActions);
    }
  }

  private handleAppointmentEvent(type: string, data: any) {
    const { updateConversation } = useConversationStore.getState();
    
    // Update conversation with appointment information
    updateConversation(data.appointment.conversationId, {
      lastAppointment: data.appointment,
      lastInteraction: new Date(),
    });

    // Send notification message
    const notificationMessage = this.generateAppointmentNotification(type, data);
    this.sendMessage({
      conversationId: data.appointment.conversationId,
      message: notificationMessage,
      context: { appointment: data.appointment, type },
    });
  }

  private handleConversationAssignment(data: any) {
    const { updateConversation } = useConversationStore.getState();
    
    updateConversation(data.conversationId, {
      assignedTo: data.assignedTo,
      status: 'assigned',
      assignedAt: new Date(),
    });

    // Send assignment notification
    this.sendMessage({
      conversationId: data.conversationId,
      message: `Conversa atribuída a ${data.assignedTo.name}`,
      context: { assignment: data },
    });
  }

  private handleConversationTransfer(data: any) {
    const { updateConversation } = useConversationStore.getState();
    
    updateConversation(data.conversationId, {
      assignedTo: data.newAssignee,
      status: 'transferred',
      transferredAt: new Date(),
    });

    // Send transfer notification
    this.sendMessage({
      conversationId: data.conversationId,
      message: `Conversa transferida para ${data.newAssignee.name}`,
      context: { transfer: data },
    });
  }

  private handleWorkflowTrigger(data: any) {
    const { updateConversation } = useConversationStore.getState();
    
    updateConversation(data.conversationId, {
      activeWorkflow: data.workflow,
      workflowStep: data.step,
      lastInteraction: new Date(),
    });

    // Send workflow notification
    this.sendMessage({
      conversationId: data.conversationId,
      message: `Workflow "${data.workflow.name}" iniciado`,
      context: { workflow: data },
    });
  }

  private handleSuggestedActions(conversationId: string, actions: string[]) {
    // Generate quick reply buttons based on suggested actions
    const quickReplies = actions.map(action => {
      switch (action) {
        case 'present_procedures':
          return {
            text: 'Ver Procedimentos',
            action: 'show_procedures',
          };
        case 'collect_insurance':
          return {
            text: 'Informar Convênio',
            action: 'collect_insurance',
          };
        case 'show_appointments':
          return {
            text: 'Meus Agendamentos',
            action: 'show_appointments',
          };
        case 'schedule_followup':
          return {
            text: 'Agendar Retorno',
            action: 'schedule_followup',
          };
        default:
          return {
            text: action,
            action: action,
          };
      }
    });

    // Send quick replies
    this.sendMessage({
      conversationId,
      message: 'Como posso ajudar você?',
      context: { quickReplies },
    });
  }

  private generateAppointmentNotification(type: string, data: any): string {
    const { appointment } = data;
    
    switch (type) {
      case 'created':
        return `✅ Agendamento confirmado para ${formatDate(appointment.scheduledDate)} às ${appointment.timeSlot}`;
      case 'rescheduled':
        return `📅 Agendamento reagendado para ${formatDate(appointment.scheduledDate)} às ${appointment.timeSlot}`;
      case 'cancelled':
        return `❌ Agendamento cancelado para ${formatDate(appointment.scheduledDate)} às ${appointment.timeSlot}`;
      default:
        return 'Atualização de agendamento';
    }
  }

  // Public methods
  public async generateResponse(params: {
    message: string;
    conversationId: string;
    context?: any;
  }): Promise<BotResponse> {
    try {
      if (!this.isConnected) {
        throw new Error('Bot service not connected');
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Bot response timeout'));
        }, 10000);

        // Emit message and wait for response
        this.socket?.emit('bot:generate', params, (response: BotResponse) => {
          clearTimeout(timeout);
          resolve(response);
        });
      });
    } catch (error) {
      console.error('Failed to generate bot response:', error);
      throw error;
    }
  }

  public async sendMessage(params: {
    conversationId: string;
    message: string;
    context?: any;
    type?: BotMessage['type'];
  }): Promise<void> {
    try {
      if (!this.isConnected) {
        console.warn('Bot service not connected, message queued');
        // Queue message for when connection is restored
        this.queueMessage(params);
        return;
      }

      const message: BotMessage = {
        id: generateId(),
        conversationId: params.conversationId,
        message: params.message,
        context: params.context,
        timestamp: new Date(),
        type: params.type || 'text',
      };

      // Emit message
      this.socket?.emit('bot:message', message);

      // Add to local conversation
      const { addMessage } = useConversationStore.getState();
      addMessage(params.conversationId, {
        id: message.id,
        content: params.message,
        sender: 'system',
        timestamp: message.timestamp,
        type: params.type || 'text',
        context: params.context,
      });
    } catch (error) {
      console.error('Failed to send bot message:', error);
      throw error;
    }
  }

  private messageQueue: Array<{
    params: Parameters<IntelligentBotService['sendMessage']>[0];
    timestamp: Date;
    attempts: number;
  }> = [];

  private queueMessage(params: Parameters<IntelligentBotService['sendMessage']>[0]) {
    this.messageQueue.push({
      params,
      timestamp: new Date(),
      attempts: 0,
    });

    // Process queue when connected
    if (this.isConnected) {
      this.processMessageQueue();
    }
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const queued = this.messageQueue.shift();
      if (queued) {
        this.sendMessage(queued.params).catch(error => {
          console.error('Failed to send queued message:', error);
          if (queued.attempts < 3) {
            queued.attempts++;
            this.messageQueue.push(queued);
          }
        });
      }
    }
  }

  public joinConversation(conversationId: string): void {
    if (this.isConnected) {
      this.socket?.emit('join:conversation', conversationId);
    }
  }

  public leaveConversation(conversationId: string): void {
    if (this.isConnected) {
      this.socket?.emit('leave:conversation', conversationId);
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Utility functions
function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Create singleton instance
export const intelligentBotService = new IntelligentBotService();

// Export for testing
export { IntelligentBotService };