import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

export class Logger {
  private logger: winston.Logger;
  private context: string;

  constructor(context: string) {
    this.context = context;
    
    const logLevel = process.env.LOG_LEVEL || 'info';
    const logToFile = process.env.LOG_TO_FILE === 'true';
    const logDir = process.env.LOG_DIR || './logs';
    
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `[${timestamp}] ${level}: [${this.context}] ${message}${metaStr}`;
          })
        )
      })
    ];

    if (logToFile) {
      // Ensure log directory exists
      const fs = require('fs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      transports.push(
        new DailyRotateFile({
          filename: path.join(logDir, 'application-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        }),
        new DailyRotateFile({
          filename: path.join(logDir, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );
    }

    this.logger = winston.createLogger({
      level: logLevel,
      transports,
      exitOnError: false
    });
  }

  public error(message: string, error?: any): void {
    if (error instanceof Error) {
      this.logger.error(message, {
        error: error.message,
        stack: error.stack,
        context: this.context
      });
    } else if (error) {
      this.logger.error(message, { error, context: this.context });
    } else {
      this.logger.error(message, { context: this.context });
    }
  }

  public warn(message: string, meta?: any): void {
    this.logger.warn(message, { ...meta, context: this.context });
  }

  public info(message: string, meta?: any): void {
    this.logger.info(message, { ...meta, context: this.context });
  }

  public debug(message: string, meta?: any): void {
    this.logger.debug(message, { ...meta, context: this.context });
  }

  public http(message: string, meta?: any): void {
    this.logger.http(message, { ...meta, context: this.context });
  }

  public verbose(message: string, meta?: any): void {
    this.logger.verbose(message, { ...meta, context: this.context });
  }

  public silly(message: string, meta?: any): void {
    this.logger.silly(message, { ...meta, context: this.context });
  }

  // Static method for creating child loggers
  public static create(context: string): Logger {
    return new Logger(context);
  }

  // Log levels for reference
  public static readonly levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6
  };
}