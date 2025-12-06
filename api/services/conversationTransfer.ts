import { Server as SocketIOServer } from 'socket.io';
import prisma from '../prisma/client.js';
import { transferLogger } from '../utils/logger';

interface TransferRequest {
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  timeout: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: Date;
}

interface TransferTimeout {
  timeoutId: NodeJS.Timeout;
  transferRequest: TransferRequest;
}

export class ConversationTransferService {
  private io: SocketIOServer;
  private activeTransfers: Map<string, TransferTimeout> = new Map();
  private readonly TRANSFER_TIMEOUT = 30000; // 30 seconds

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  /**
   * Request a conversation transfer from one user to another
   */
  async requestTransfer(conversationId: string, fromUserId: string, toUserId: string): Promise<boolean> {
    try {
      // Check if conversation exists and belongs to fromUser
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          assignedToId: fromUserId,
          status: 'EM_ATENDIMENTO'
        },
        include: {
          assignedTo: true,
          patient: true
        }
      });

      if (!conversation) {
        transferLogger.warn(`Conversation ${conversationId} not found or not assigned to user ${fromUserId}`);
        return false;
      }

      // Check if target user exists and is available
      const targetUser = await prisma.user.findFirst({
        where: {
          id: toUserId,
          role: { in: ['AGENT', 'ADMIN'] }
        }
      });

      if (!targetUser) {
        transferLogger.warn(`Target user ${toUserId} not found or not available`);
        return false;
      }

      // Check if there's already an active transfer for this conversation
      if (this.activeTransfers.has(conversationId)) {
        transferLogger.warn(`Active transfer already exists for conversation ${conversationId}`);
        return false;
      }

      const transferRequest: TransferRequest = {
        conversationId,
        fromUserId,
        toUserId,
        timeout: this.TRANSFER_TIMEOUT,
        status: 'pending',
        createdAt: new Date()
      };

      // Create timeout for transfer expiration
      const timeoutId = setTimeout(() => {
        this.handleTransferTimeout(conversationId);
      }, this.TRANSFER_TIMEOUT);

      this.activeTransfers.set(conversationId, {
        timeoutId,
        transferRequest
      });

      // Notify target user about transfer request
      this.io.to(`user_${toUserId}`).emit('transfer_request', {
        conversationId,
        fromUserId,
        fromUserName: conversation.assignedTo?.name || 'Unknown',
        patientName: conversation.patient?.name || 'Unknown Patient',
        message: conversation.lastMessage || 'No recent messages',
        timeout: this.TRANSFER_TIMEOUT,
        expiresAt: new Date(Date.now() + this.TRANSFER_TIMEOUT)
      });

      // Notify sender that transfer request was sent
      this.io.to(`user_${fromUserId}`).emit('transfer_sent', {
        conversationId,
        toUserId,
        toUserName: targetUser.name,
        timeout: this.TRANSFER_TIMEOUT
      });

      transferLogger.info(`Transfer request created for conversation ${conversationId} from ${fromUserId} to ${toUserId}`);
      return true;

    } catch (error) {
      transferLogger.error('Error creating transfer request', { error });
      return false;
    }
  }

  /**
   * Accept a conversation transfer
   */
  async acceptTransfer(conversationId: string, userId: string): Promise<boolean> {
    try {
      const transferTimeout = this.activeTransfers.get(conversationId);
      
      if (!transferTimeout) {
        transferLogger.warn(`No active transfer found for conversation ${conversationId}`);
        return false;
      }

      const { transferRequest } = transferTimeout;

      // Verify the accepting user is the target user
      if (transferRequest.toUserId !== userId) {
        transferLogger.warn(`User ${userId} is not the target of transfer ${conversationId}`);
        return false;
      }

      // Clear the timeout
      clearTimeout(transferTimeout.timeoutId);
      this.activeTransfers.delete(conversationId);

      // Update conversation assignment
      const updatedConversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          assignedToId: userId,
          status: 'EM_ATENDIMENTO'
        },
        include: {
          patient: true,
          assignedTo: true
        }
      });

      transferRequest.status = 'accepted';

      // Notify all parties about successful transfer
      this.io.to(`user_${transferRequest.fromUserId}`).emit('transfer_completed', {
        conversationId,
        acceptedBy: userId,
        acceptedByName: updatedConversation.assignedTo?.name || 'Unknown'
      });

      this.io.to(`user_${userId}`).emit('transfer_accepted', {
        conversationId,
        patient: updatedConversation.patient,
        conversation: updatedConversation
      });

      // Update conversation list for all users
      this.io.emit('conversation_updated', updatedConversation);

      transferLogger.info(`Transfer accepted for conversation ${conversationId} by user ${userId}`);
      return true;

    } catch (error) {
      transferLogger.error('Error accepting transfer', { error });
      return false;
    }
  }

  /**
   * Reject a conversation transfer
   */
  async rejectTransfer(conversationId: string, userId: string): Promise<boolean> {
    try {
      const transferTimeout = this.activeTransfers.get(conversationId);
      
      if (!transferTimeout) {
        transferLogger.warn(`No active transfer found for conversation ${conversationId}`);
        return false;
      }

      const { transferRequest } = transferTimeout;

      // Verify the rejecting user is the target user
      if (transferRequest.toUserId !== userId) {
        transferLogger.warn(`User ${userId} is not the target of transfer ${conversationId}`);
        return false;
      }

      // Clear the timeout
      clearTimeout(transferTimeout.timeoutId);
      this.activeTransfers.delete(conversationId);

      transferRequest.status = 'rejected';

      // Notify sender about rejection
      this.io.to(`user_${transferRequest.fromUserId}`).emit('transfer_rejected', {
        conversationId,
        rejectedBy: userId
      });

      // Notify rejecter
      this.io.to(`user_${userId}`).emit('transfer_rejected_self', {
        conversationId
      });

      transferLogger.info(`Transfer rejected for conversation ${conversationId} by user ${userId}`);
      return true;

    } catch (error) {
      transferLogger.error('Error rejecting transfer', { error });
      return false;
    }
  }

  /**
   * Handle transfer timeout (30 seconds expired)
   */
  private async handleTransferTimeout(conversationId: string): Promise<void> {
    try {
      const transferTimeout = this.activeTransfers.get(conversationId);
      
      if (!transferTimeout) {
        return;
      }

      const { transferRequest } = transferTimeout;
      this.activeTransfers.delete(conversationId);

      transferRequest.status = 'expired';

      await prisma.conversation.update({
        where: { id: conversationId },
        data: {}
      });

      // Notify sender about timeout
      this.io.to(`user_${transferRequest.fromUserId}`).emit('transfer_timeout', {
        conversationId,
        toUserId: transferRequest.toUserId
      });

      // Notify target user about timeout
      this.io.to(`user_${transferRequest.toUserId}`).emit('transfer_timeout_target', {
        conversationId
      });

      transferLogger.info(`Transfer timeout for conversation ${conversationId}`);

    } catch (error) {
      transferLogger.error('Error handling transfer timeout', { error });
    }
  }

  /**
   * Get active transfers for a specific user
   */
  getActiveTransfersForUser(userId: string): TransferRequest[] {
    const transfers: TransferRequest[] = [];
    
    for (const [_, transferTimeout] of this.activeTransfers) {
      if (transferTimeout.transferRequest.toUserId === userId || 
          transferTimeout.transferRequest.fromUserId === userId) {
        transfers.push(transferTimeout.transferRequest);
      }
    }
    
    return transfers;
  }

  /**
   * Check if conversation has an active transfer
   */
  hasActiveTransfer(conversationId: string): boolean {
    return this.activeTransfers.has(conversationId);
  }

  /**
   * Cancel an active transfer
   */
  async cancelTransfer(conversationId: string, userId: string): Promise<boolean> {
    try {
      const transferTimeout = this.activeTransfers.get(conversationId);
      
      if (!transferTimeout) {
        return false;
      }

      const { transferRequest } = transferTimeout;

      // Only the sender can cancel the transfer
      if (transferRequest.fromUserId !== userId) {
        return false;
      }

      // Clear the timeout
      clearTimeout(transferTimeout.timeoutId);
      this.activeTransfers.delete(conversationId);

      // Notify target user about cancellation
      this.io.to(`user_${transferRequest.toUserId}`).emit('transfer_cancelled', {
        conversationId,
        cancelledBy: userId
      });

      transferLogger.info(`Transfer cancelled for conversation ${conversationId} by user ${userId}`);
      return true;

    } catch (error) {
      transferLogger.error('Error cancelling transfer', { error });
      return false;
    }
  }

  /**
   * Get transfer statistics
   */
  getTransferStats(): { total: number; pending: number; accepted: number; rejected: number; expired: number } {
    const stats = { total: 0, pending: 0, accepted: 0, rejected: 0, expired: 0 };
    
    for (const [_, transferTimeout] of this.activeTransfers) {
      stats.total++;
      switch (transferTimeout.transferRequest.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'accepted':
          stats.accepted++;
          break;
        case 'rejected':
          stats.rejected++;
          break;
        case 'expired':
          stats.expired++;
          break;
      }
    }
    
    return stats;
  }

  /**
   * Clean up expired transfers (cleanup utility)
   */
  cleanup(): void {
    const now = Date.now();
    
    for (const [conversationId, transferTimeout] of this.activeTransfers) {
      const transferAge = now - transferTimeout.transferRequest.createdAt.getTime();
      
      if (transferAge > this.TRANSFER_TIMEOUT + 5000) { // 5 second grace period
        this.activeTransfers.delete(conversationId);
        clearTimeout(transferTimeout.timeoutId);
        transferLogger.info(`Cleaned up expired transfer for conversation ${conversationId}`);
      }
    }
  }
}
