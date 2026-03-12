export declare class Logger {
    private logger;
    private context;
    constructor(context: string);
    error(message: string, error?: any): void;
    warn(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
    http(message: string, meta?: any): void;
    verbose(message: string, meta?: any): void;
    silly(message: string, meta?: any): void;
    static create(context: string): Logger;
    static readonly levels: {
        error: number;
        warn: number;
        info: number;
        http: number;
        verbose: number;
        debug: number;
        silly: number;
    };
}
//# sourceMappingURL=logger.d.ts.map