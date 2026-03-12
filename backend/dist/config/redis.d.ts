import { RedisClientType } from 'redis';
export declare class RedisConfig {
    private static logger;
    private static client;
    static getClient(): RedisClientType;
    static testConnection(): Promise<boolean>;
    static closeConnection(): Promise<void>;
    static getCached<T>(key: string): Promise<T | null>;
    static setCached<T>(key: string, data: T, ttlSeconds?: number): Promise<boolean>;
    static deleteCached(key: string): Promise<boolean>;
    static clearCache(pattern?: string): Promise<boolean>;
    static publish(channel: string, message: any): Promise<number>;
    static subscribe(channel: string, callback: (message: any) => void): Promise<void>;
}
//# sourceMappingURL=redis.d.ts.map