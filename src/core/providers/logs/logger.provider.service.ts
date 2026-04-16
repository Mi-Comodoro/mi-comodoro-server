import { ConsoleLogger, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggerProviderService extends Logger {
  private readonly logger: ConsoleLogger;

  constructor() {
    super();
    this.logger = new ConsoleLogger('AppLogger', { timestamp: true });
  }

  private formatMessage(
    message: string,
    method?: string | null,
    path?: string,
    data?: object,
  ): string {
    const parts: string[] = [];

    // METHOD + PATH
    if (method) {
      const m = method.toUpperCase();
      parts.push(path ? `${m} ${path}` : m);
    }

    // MAIN MESSAGE
    parts.push(message);

    // DATA
    if (data !== undefined) {
      const formatted = typeof data === 'object' ? JSON.stringify(data) : String(data);

      parts.push(formatted);
    }

    return parts.join(' | ');
  }

  info(context: string, message: string, method?: string | null, path?: string, data?: object) {
    const formatted = this.formatMessage(message, method, path, data);
    this.logger.log(formatted, context);
  }

  warn(context: string, message: string, method?: string | null, path?: string, data?: object) {
    const formatted = this.formatMessage(message, method, path, data);
    this.logger.warn(formatted, context);
  }

  error(
    context: string,
    message: string,
    trace?: string,
    method?: string,
    path?: string,
    data?: object,
  ) {
    const formatted = this.formatMessage(message, method, path, data);
    this.logger.error(formatted, trace, context);
  }

  debug(context: string, message: string, method?: string | null, path?: string, data?: object) {
    if (process.env.APP_ENV === 'production') return;

    const formatted = this.formatMessage(message, method, path, data);
    this.logger.debug(formatted, context);
  }
}
