import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly'
}

// Log categories
export enum LogCategory {
  SYSTEM = 'system',
  DATABASE = 'database',
  API = 'api',
  AUTH = 'auth',
  CONVERSATION = 'conversation',
  WORKFLOW = 'workflow',
  BOT = 'bot',
  TRANSFER = 'transfer',
  SESSION = 'session',
  FILE_UPLOAD = 'file_upload',
  PERFORMANCE = 'performance',
  SECURITY = 'security'
}

// Log metadata interface
export interface LogMetadata {
  userId?: string;
  conversationId?: string;
  workflowId?: string;
  endpoint?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  error?: Error;
  stack?: string;
  [key: string]: any;
}

// Performance metrics interface
export interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  errorRate: number;
  throughput: number;
}

class LoggerService {
  private logger: winston.Logger;
  private performanceMetrics: Map<string, number[]> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private startTime: Date;

  constructor() {
    this.startTime = new Date();
    this.initializeLogger();
  }

  private initializeLogger(): void {
    const logDir = path.join(process.cwd(), 'logs');

    // Console transport with colors
    const consoleTransport = new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, category, metadata }) => {
          const metaStr = metadata ? JSON.stringify(metadata) : '';
          return `[${timestamp}] ${level.toUpperCase()} [${category || 'general'}]: ${message} ${metaStr}`;
        })
      ),
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
    });

    // File transport with daily rotation
    const fileTransport = new DailyRotateFile({
      filename: path.join(logDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    });

    // Error log file
    const errorTransport = new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    });

    // Audit log file for security events
    const auditTransport = new DailyRotateFile({
      filename: path.join(logDir, 'audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      zippedArchive: true,
      maxSize: '10m',
      maxFiles: '90d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    });

    this.logger = winston.createLogger({
      level: 'info',
      transports: [
        consoleTransport,
        fileTransport,
        errorTransport,
        auditTransport
      ],
      exitOnError: false
    });
  }

  /**
   * Log an error
   */
  error(category: LogCategory, message: string, metadata?: LogMetadata): void {
    this.incrementErrorCount(category);
    
    const logEntry = {
      message,
      category,
      level: LogLevel.ERROR,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        stack: metadata?.error?.stack || new Error().stack
      }
    };

    this.logger.error(logEntry);
    this.saveToDatabase(logEntry);
  }

  /**
   * Log a warning
   */
  warn(category: LogCategory, message: string, metadata?: LogMetadata): void {
    const logEntry = {
      message,
      category,
      level: LogLevel.WARN,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    };

    this.logger.warn(logEntry);
    this.saveToDatabase(logEntry);
  }

  /**
   * Log info
   */
  info(category: LogCategory, message: string, metadata?: LogMetadata): void {
    const logEntry = {
      message,
      category,
      level: LogLevel.INFO,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    };

    this.logger.info(logEntry);
    this.saveToDatabase(logEntry);
  }

  /**
   * Log debug information
   */
  debug(category: LogCategory, message: string, metadata?: LogMetadata): void {
    const logEntry = {
      message,
      category,
      level: LogLevel.DEBUG,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    };

    this.logger.debug(logEntry);
    if (process.env.NODE_ENV !== 'production') {
      this.saveToDatabase(logEntry);
    }
  }

  /**
   * Log HTTP request
   */
  http(method: string, endpoint: string, statusCode: number, duration: number, metadata?: LogMetadata): void {
    const message = `${method} ${endpoint} ${statusCode} - ${duration}ms`;
    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    
    const logEntry = {
      message,
      category: LogCategory.API,
      level,
      metadata: {
        ...metadata,
        method,
        endpoint,
        statusCode,
        duration,
        timestamp: new Date().toISOString()
      }
    };

    this.logger.log(level, logEntry);
    this.recordPerformanceMetric('http_response_time', duration);
    this.saveToDatabase(logEntry);
  }

  /**
   * Log security event
   */
  security(event: string, userId?: string, metadata?: LogMetadata): void {
    const logEntry = {
      message: `SECURITY: ${event}`,
      category: LogCategory.SECURITY,
      level: LogLevel.WARN,
      metadata: {
        ...metadata,
        userId,
        timestamp: new Date().toISOString()
      }
    };

    this.logger.warn(logEntry);
    this.saveToDatabase(logEntry);
  }

  /**
   * Record performance metric
   */
  recordPerformanceMetric(metric: string, value: number): void {
    if (!this.performanceMetrics.has(metric)) {
      this.performanceMetrics.set(metric, []);
    }
    
    const metrics = this.performanceMetrics.get(metric)!;
    metrics.push(value);
    
    // Keep only last 1000 values
    if (metrics.length > 1000) {
      metrics.shift();
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const responseTimes = this.performanceMetrics.get('http_response_time') || [];
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;

    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      responseTime: avgResponseTime,
      memoryUsage: memoryUsage.heapUsed,
      cpuUsage: cpuUsage.user,
      activeConnections: this.getActiveConnectionCount(),
      errorRate: this.getErrorRate(),
      throughput: this.getThroughput()
    };
  }

  /**
   * Increment error count
   */
  private incrementErrorCount(category: LogCategory): void {
    const key = category.toString();
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
  }

  /**
   * Get error rate
   */
  private getErrorRate(): number {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0);
    const totalRequests = this.performanceMetrics.get('http_response_time')?.length || 1;
    return (totalErrors / totalRequests) * 100;
  }

  /**
   * Get active connection count (placeholder - implement based on your needs)
   */
  private getActiveConnectionCount(): number {
    // This would typically come from your socket.io or HTTP server
    return 0;
  }

  /**
   * Get throughput (requests per minute)
   */
  private getThroughput(): number {
    const responseTimes = this.performanceMetrics.get('http_response_time') || [];
    return responseTimes.length; // Simplified - in reality, you'd calculate per time unit
  }

  /**
   * Save log entry to database
   */
  private async saveToDatabase(logEntry: any): Promise<void> {
    try {
      await (prisma as any).systemLog.create({
        data: {
          level: logEntry.level,
          category: logEntry.category,
          message: logEntry.message,
          metadata: logEntry.metadata,
          timestamp: new Date()
        }
      });
    } catch (error) {
      // Don't throw error to avoid infinite loop, just log to console
      console.error('Failed to save log to database:', error);
    }
  }

  /**
   * Get system health status
   */
  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    metrics: PerformanceMetrics;
    lastError: Date | null;
  } {
    const uptime = Date.now() - this.startTime.getTime();
    const metrics = this.getPerformanceMetrics();
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (metrics.errorRate > 5) {
      status = 'unhealthy';
    } else if (metrics.errorRate > 1 || metrics.responseTime > 1000) {
      status = 'degraded';
    }

    return {
      status,
      uptime,
      metrics,
      lastError: this.getLastErrorTime()
    };
  }

  /**
   * Get last error time
   */
  private getLastErrorTime(): Date | null {
    // This would typically come from your error tracking
    return null;
  }

  /**
   * Clean up old logs
   */
  async cleanupLogs(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deletedCount = await (prisma as any).systemLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      this.info(LogCategory.SYSTEM, `Cleaned up ${deletedCount.count} old log entries`);
    } catch (error) {
      this.error(LogCategory.SYSTEM, 'Failed to cleanup logs', { error });
    }
  }
}

// Create singleton instance
export const logger = new LoggerService();

// Convenience functions for different log categories
export const conversationLogger = {
  info: (message: string, metadata?: LogMetadata) => 
    logger.info(LogCategory.CONVERSATION, message, metadata),
  warn: (message: string, metadata?: LogMetadata) => 
    logger.warn(LogCategory.CONVERSATION, message, metadata),
  error: (message: string, metadata?: LogMetadata) => 
    logger.error(LogCategory.CONVERSATION, message, metadata),
  debug: (message: string, metadata?: LogMetadata) => 
    logger.debug(LogCategory.CONVERSATION, message, metadata)
};

export const botLogger = {
  info: (message: string, metadata?: LogMetadata) => 
    logger.info(LogCategory.BOT, message, metadata),
  warn: (message: string, metadata?: LogMetadata) => 
    logger.warn(LogCategory.BOT, message, metadata),
  error: (message: string, metadata?: LogMetadata) => 
    logger.error(LogCategory.BOT, message, metadata),
  debug: (message: string, metadata?: LogMetadata) => 
    logger.debug(LogCategory.BOT, message, metadata)
};

export const transferLogger = {
  info: (message: string, metadata?: LogMetadata) => 
    logger.info(LogCategory.TRANSFER, message, metadata),
  warn: (message: string, metadata?: LogMetadata) => 
    logger.warn(LogCategory.TRANSFER, message, metadata),
  error: (message: string, metadata?: LogMetadata) => 
    logger.error(LogCategory.TRANSFER, message, metadata),
  debug: (message: string, metadata?: LogMetadata) => 
    logger.debug(LogCategory.TRANSFER, message, metadata)
};

export const sessionLogger = {
  info: (message: string, metadata?: LogMetadata) => 
    logger.info(LogCategory.SESSION, message, metadata),
  warn: (message: string, metadata?: LogMetadata) => 
    logger.warn(LogCategory.SESSION, message, metadata),
  error: (message: string, metadata?: LogMetadata) => 
    logger.error(LogCategory.SESSION, message, metadata),
  debug: (message: string, metadata?: LogMetadata) => 
    logger.debug(LogCategory.SESSION, message, metadata)
};

export default logger;
