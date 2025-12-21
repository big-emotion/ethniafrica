/**
 * Structured logging utility for API routes
 */

interface LogContext {
  [key: string]: unknown;
}

class ApiLogger {
  private formatMessage(
    level: string,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage("INFO", message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : error,
    };
    console.error(this.formatMessage("ERROR", message, errorContext));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage("WARN", message, context));
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(this.formatMessage("DEBUG", message, context));
    }
  }
}

export const logger = new ApiLogger();
