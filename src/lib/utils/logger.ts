/**
 * Secure logging utility
 * Only logs in development mode, prevents sensitive data exposure in production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Development-only logging
   * Use for debugging information that should not appear in production
   */
  dev: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEV]', ...args);
    }
  },

  /**
   * Info logging - appears in both dev and production
   * Use for important application events
   */
  info: (...args: any[]) => {
    console.log('[INFO]', ...args);
  },

  /**
   * Warning logging - appears in both dev and production
   * Use for recoverable errors or concerning situations
   */
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error logging - always appears
   * Use for errors that need attention
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Sanitize sensitive data before logging
   */
  sanitize: (data: any) => {
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };
      // Remove sensitive fields
      const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'serviceRoleKey'];
      sensitiveFields.forEach(field => {
        if (field in sanitized) {
          sanitized[field] = '***REDACTED***';
        }
      });
      return sanitized;
    }
    return data;
  }
};
