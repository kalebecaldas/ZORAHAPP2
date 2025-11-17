import { PrismaClient } from '@prisma/client';
import { sessionLogger } from '../utils/logger';

const prisma = new PrismaClient();

export interface SessionConfig {
  maxSessionDuration: number; // 24 hours in milliseconds
  warningThreshold: number;   // 1 hour before expiry
  cleanupInterval: number;    // Cleanup check interval
}

export interface ConversationSession {
  conversationId: string;
  userId: string;
  startTime: Date;
  lastActivity: Date;
  expiryTime: Date;
  status: 'active' | 'warning' | 'expired' | 'closed';
  messageCount: number;
  transferCount: number;
  metadata: Record<string, any>;
}

export class ConversationSessionManager {
  private static instance: ConversationSessionManager;
  private sessions: Map<string, ConversationSession> = new Map();
  private config: SessionConfig = {
    maxSessionDuration: 24 * 60 * 60 * 1000, // 24 hours
    warningThreshold: 60 * 60 * 1000,          // 1 hour
    cleanupInterval: 30 * 60 * 1000            // 30 minutes
  };
  private cleanupTimer?: NodeJS.Timeout;
  private warningTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.startCleanupTimer();
  }

  static getInstance(): ConversationSessionManager {
    if (!ConversationSessionManager.instance) {
      ConversationSessionManager.instance = new ConversationSessionManager();
    }
    return ConversationSessionManager.instance;
  }

  /**
   * Start a new conversation session
   */
  async startSession(conversationId: string, userId: string): Promise<ConversationSession> {
    try {
      const now = new Date();
      const expiryTime = new Date(now.getTime() + this.config.maxSessionDuration);

      // Check if session already exists
      const existingSession = this.sessions.get(conversationId);
      if (existingSession) {
        sessionLogger.info(`Session already exists for conversation ${conversationId}, updating activity`);
        return this.updateSessionActivity(conversationId);
      }

      const session: ConversationSession = {
        conversationId,
        userId,
        startTime: now,
        lastActivity: now,
        expiryTime,
        status: 'active',
        messageCount: 0,
        transferCount: 0,
        metadata: {}
      };

      this.sessions.set(conversationId, session);

      // Set warning timer
      this.setWarningTimer(conversationId, expiryTime);

      // Log session start
      await this.logSessionEvent(conversationId, userId, 'session_started', {
        sessionDuration: this.config.maxSessionDuration,
        expiryTime
      });

      sessionLogger.info(`Session started for conversation ${conversationId}, user ${userId}, expires at ${expiryTime}`);
      return session;

    } catch (error) {
      sessionLogger.error('Error starting session', { error });
      throw error;
    }
  }

  /**
   * Update session activity (extend session on user activity)
   */
  async updateSessionActivity(conversationId: string): Promise<ConversationSession> {
    try {
      const session = this.sessions.get(conversationId);
      if (!session) {
        throw new Error(`Session not found for conversation ${conversationId}`);
      }

      const now = new Date();
      session.lastActivity = now;
      session.messageCount++;

      // Update expiry time if session is close to expiry
      const timeUntilExpiry = session.expiryTime.getTime() - now.getTime();
      if (timeUntilExpiry < this.config.warningThreshold && session.status === 'warning') {
        // Extend session by 1 hour if user is still active
        session.expiryTime = new Date(now.getTime() + 60 * 60 * 1000);
        session.status = 'active';
        
        // Reset warning timer
        this.setWarningTimer(conversationId, session.expiryTime);
        
        sessionLogger.info(`Session extended for conversation ${conversationId} due to user activity`);
      }

      this.sessions.set(conversationId, session);
      return session;

    } catch (error) {
      sessionLogger.error('Error updating session activity', { error });
      throw error;
    }
  }

  /**
   * Get session by conversation ID
   */
  getSession(conversationId: string): ConversationSession | null {
    return this.sessions.get(conversationId) || null;
  }

  /**
   * Get all active sessions for a user
   */
  getUserSessions(userId: string): ConversationSession[] {
    const userSessions: ConversationSession[] = [];
    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.status === 'active') {
        userSessions.push(session);
      }
    }
    return userSessions;
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    warningSessions: number;
    expiredSessions: number;
    averageDuration: number;
    totalMessages: number;
    totalTransfers: number;
  } {
    const now = new Date();
    let totalDuration = 0;
    let totalMessages = 0;
    let totalTransfers = 0;
    let activeCount = 0;
    let warningCount = 0;
    let expiredCount = 0;

    for (const session of this.sessions.values()) {
      totalMessages += session.messageCount;
      totalTransfers += session.transferCount;
      totalDuration += (now.getTime() - session.startTime.getTime());

      switch (session.status) {
        case 'active':
          activeCount++;
          break;
        case 'warning':
          warningCount++;
          break;
        case 'expired':
          expiredCount++;
          break;
      }
    }

    const totalSessions = this.sessions.size;
    const averageDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

    return {
      totalSessions,
      activeSessions: activeCount,
      warningSessions: warningCount,
      expiredSessions: expiredCount,
      averageDuration,
      totalMessages,
      totalTransfers
    };
  }

  /**
   * Close a session
   */
  async closeSession(conversationId: string, reason: string = 'user_action'): Promise<void> {
    try {
      const session = this.sessions.get(conversationId);
      if (!session) {
        sessionLogger.warn(`Session not found for conversation ${conversationId}`);
        return;
      }

      session.status = 'closed';
      
      // Clear warning timer
      const warningTimer = this.warningTimers.get(conversationId);
      if (warningTimer) {
        clearTimeout(warningTimer);
        this.warningTimers.delete(conversationId);
      }

      // Log session closure
      await this.logSessionEvent(conversationId, session.userId, 'session_closed', {
        reason,
        duration: Date.now() - session.startTime.getTime(),
        messageCount: session.messageCount,
        transferCount: session.transferCount
      });

      this.sessions.delete(conversationId);
      sessionLogger.info(`Session closed for conversation ${conversationId}, reason: ${reason}`);

    } catch (error) {
      sessionLogger.error('Error closing session', { error });
    }
  }

  /**
   * Handle session expiry
   */
  private async handleSessionExpiry(conversationId: string): Promise<void> {
    try {
      const session = this.sessions.get(conversationId);
      if (!session) {
        return;
      }

      session.status = 'expired';

      // Log session expiry
      await this.logSessionEvent(conversationId, session.userId, 'session_expired', {
        duration: Date.now() - session.startTime.getTime(),
        messageCount: session.messageCount,
        transferCount: session.transferCount
      });

      // Update conversation status in database
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          status: 'PRINCIPAL'
        }
      });

      // Clear warning timer
      const warningTimer = this.warningTimers.get(conversationId);
      if (warningTimer) {
        clearTimeout(warningTimer);
        this.warningTimers.delete(conversationId);
      }

      sessionLogger.info(`Session expired for conversation ${conversationId}`);

    } catch (error) {
      sessionLogger.error('Error handling session expiry', { error });
    }
  }

  /**
   * Set warning timer for session expiry
   */
  private setWarningTimer(conversationId: string, expiryTime: Date): void {
    // Clear existing warning timer
    const existingTimer = this.warningTimers.get(conversationId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const now = new Date();
    const warningTime = new Date(expiryTime.getTime() - this.config.warningThreshold);
    const timeUntilWarning = warningTime.getTime() - now.getTime();

    if (timeUntilWarning > 0) {
      const warningTimer = setTimeout(() => {
        this.handleSessionWarning(conversationId);
      }, timeUntilWarning);

      this.warningTimers.set(conversationId, warningTimer);
    }
  }

  /**
   * Handle session warning (1 hour before expiry)
   */
  private async handleSessionWarning(conversationId: string): Promise<void> {
    try {
      const session = this.sessions.get(conversationId);
      if (!session || session.status !== 'active') {
        return;
      }

      session.status = 'warning';

      // Log warning event
      await this.logSessionEvent(conversationId, session.userId, 'session_warning', {
        timeUntilExpiry: this.config.warningThreshold,
        messageCount: session.messageCount
      });

      sessionLogger.info(`Session warning for conversation ${conversationId} - expires in 1 hour`);

    } catch (error) {
      sessionLogger.error('Error handling session warning', { error });
    }
  }

  /**
   * Start cleanup timer to remove expired sessions
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.config.cleanupInterval);

    sessionLogger.info('Session cleanup timer started');
  }

  /**
   * Clean up expired sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    try {
      const now = new Date();
      let cleanedCount = 0;

      for (const [conversationId, session] of this.sessions.entries()) {
        if (session.expiryTime <= now && session.status !== 'expired') {
          await this.handleSessionExpiry(conversationId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        sessionLogger.info(`Cleaned up ${cleanedCount} expired sessions`);
      }

    } catch (error) {
      sessionLogger.error('Error during session cleanup', { error });
    }
  }

  /**
   * Log session events to database
   */
  private async logSessionEvent(
    conversationId: string,
    userId: string,
    eventType: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      sessionLogger.info(`Session event: ${eventType}`, {
        conversationId,
        userId,
        ...metadata
      });
    } catch (error) {
      sessionLogger.error('Error logging session event', { error });
    }
  }

  /**
   * Get session history for a conversation
   */
  async getSessionHistory(conversationId: string): Promise<any[]> {
    try {
      return [];
    } catch (error) {
      sessionLogger.error('Error getting session history', { error });
      return [];
    }
  }

  /**
   * Update session configuration
   */
  updateConfig(newConfig: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    sessionLogger.info('Session configuration updated', { config: this.config });
  }

  /**
   * Stop the session manager (cleanup)
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    for (const timer of this.warningTimers.values()) {
      clearTimeout(timer);
    }

    this.warningTimers.clear();
    sessionLogger.info('Session manager stopped');
  }
}

export const sessionManager = ConversationSessionManager.getInstance();
