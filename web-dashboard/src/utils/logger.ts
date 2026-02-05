/**
 * Logger Utility
 * 
 * Centralized logging service for the frontend application.
 * Replaces console.log calls with a configurable logging system.
 * 
 * Features:
 * - Environment-aware (disabled in production)
 * - Log levels (debug, info, warn, error)
 * - Namespaced logging for easy filtering
 * - Timestamp support
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  showTimestamp: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const defaultConfig: LoggerConfig = {
  enabled: import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true',
  level: (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'info',
  showTimestamp: true,
};

class Logger {
  private namespace: string;
  private config: LoggerConfig;

  constructor(namespace: string, config: Partial<LoggerConfig> = {}) {
    this.namespace = namespace;
    this.config = { ...defaultConfig, ...config };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const parts: string[] = [];
    
    if (this.config.showTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }
    
    parts.push(`[${level.toUpperCase()}]`);
    parts.push(`[${this.namespace}]`);
    parts.push(message);
    
    return parts.join(' ');
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), ...args);
    }
  }

  /** Create a child logger with prefix */
  child(subNamespace: string): Logger {
    return new Logger(`${this.namespace}:${subNamespace}`, this.config);
  }
}

/** Factory function for creating namespaced loggers */
export function createLogger(namespace: string): Logger {
  return new Logger(namespace);
}

/** Pre-configured loggers for common modules */
export const appLogger = createLogger('App');
export const authLogger = createLogger('Auth');
export const socketLogger = createLogger('Socket');
export const pwaLogger = createLogger('PWA');
export const liffLogger = createLogger('LIFF');
export const notificationLogger = createLogger('Notifications');
export const syncLogger = createLogger('Sync');

/** Default export for quick usage */
export default Logger;
