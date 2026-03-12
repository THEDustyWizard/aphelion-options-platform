"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const path_1 = __importDefault(require("path"));
class Logger {
    logger;
    context;
    constructor(context) {
        this.context = context;
        const logLevel = process.env.LOG_LEVEL || 'info';
        const logToFile = process.env.LOG_TO_FILE === 'true';
        const logDir = process.env.LOG_DIR || './logs';
        const transports = [
            new winston_1.default.transports.Console({
                format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
                    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                    return `[${timestamp}] ${level}: [${this.context}] ${message}${metaStr}`;
                }))
            })
        ];
        if (logToFile) {
            // Ensure log directory exists
            const fs = require('fs');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            transports.push(new winston_daily_rotate_file_1.default({
                filename: path_1.default.join(logDir, 'application-%DATE%.log'),
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '20m',
                maxFiles: '30d',
                format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json())
            }), new winston_daily_rotate_file_1.default({
                filename: path_1.default.join(logDir, 'error-%DATE%.log'),
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '20m',
                maxFiles: '30d',
                level: 'error',
                format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json())
            }));
        }
        this.logger = winston_1.default.createLogger({
            level: logLevel,
            transports,
            exitOnError: false
        });
    }
    error(message, error) {
        if (error instanceof Error) {
            this.logger.error(message, {
                error: error.message,
                stack: error.stack,
                context: this.context
            });
        }
        else if (error) {
            this.logger.error(message, { error, context: this.context });
        }
        else {
            this.logger.error(message, { context: this.context });
        }
    }
    warn(message, meta) {
        this.logger.warn(message, { ...meta, context: this.context });
    }
    info(message, meta) {
        this.logger.info(message, { ...meta, context: this.context });
    }
    debug(message, meta) {
        this.logger.debug(message, { ...meta, context: this.context });
    }
    http(message, meta) {
        this.logger.http(message, { ...meta, context: this.context });
    }
    verbose(message, meta) {
        this.logger.verbose(message, { ...meta, context: this.context });
    }
    silly(message, meta) {
        this.logger.silly(message, { ...meta, context: this.context });
    }
    // Static method for creating child loggers
    static create(context) {
        return new Logger(context);
    }
    // Log levels for reference
    static levels = {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        verbose: 4,
        debug: 5,
        silly: 6
    };
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map