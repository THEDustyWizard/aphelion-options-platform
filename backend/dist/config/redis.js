"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisConfig = void 0;
const redis_1 = require("redis");
const logger_1 = require("../utils/logger");
class RedisConfig {
    static logger = new logger_1.Logger('RedisConfig');
    static client;
    static getClient() {
        if (!this.client) {
            const redisOptions = {
                url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`,
                password: process.env.REDIS_PASSWORD || undefined,
                database: parseInt(process.env.REDIS_DB || '0'),
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > 10) {
                            this.logger.error('Redis reconnection attempts exceeded');
                            return new Error('Redis reconnection attempts exceeded');
                        }
                        return Math.min(retries * 100, 3000);
                    }
                }
            };
            this.client = (0, redis_1.createClient)(redisOptions);
            // Setup event listeners
            this.client.on('connect', () => {
                this.logger.info('Redis client connected');
            });
            this.client.on('ready', () => {
                this.logger.info('Redis client ready');
            });
            this.client.on('error', (error) => {
                this.logger.error('Redis client error:', error);
            });
            this.client.on('end', () => {
                this.logger.warn('Redis client disconnected');
            });
            this.client.on('reconnecting', () => {
                this.logger.info('Redis client reconnecting...');
            });
        }
        return this.client;
    }
    static async testConnection() {
        try {
            const client = this.getClient();
            if (!client.isOpen) {
                await client.connect();
            }
            // Test connection with PING
            const result = await client.ping();
            if (result === 'PONG') {
                this.logger.info('Redis connection test successful');
                return true;
            }
            else {
                this.logger.error('Redis connection test failed - unexpected response:', result);
                return false;
            }
        }
        catch (error) {
            this.logger.error('Redis connection test failed:', error);
            return false;
        }
    }
    static async closeConnection() {
        try {
            if (this.client?.isOpen) {
                await this.client.quit();
                this.logger.info('Redis connection closed');
            }
        }
        catch (error) {
            this.logger.error('Failed to close Redis connection:', error);
            throw error;
        }
    }
    // Cache helper methods
    static async getCached(key) {
        try {
            const client = this.getClient();
            if (!client.isOpen) {
                await client.connect();
            }
            const data = await client.get(key);
            if (data) {
                return JSON.parse(data);
            }
            return null;
        }
        catch (error) {
            this.logger.error(`Failed to get cached data for key ${key}:`, error);
            return null;
        }
    }
    static async setCached(key, data, ttlSeconds) {
        try {
            const client = this.getClient();
            if (!client.isOpen) {
                await client.connect();
            }
            const serialized = JSON.stringify(data);
            if (ttlSeconds) {
                await client.setEx(key, ttlSeconds, serialized);
            }
            else {
                await client.set(key, serialized);
            }
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to set cached data for key ${key}:`, error);
            return false;
        }
    }
    static async deleteCached(key) {
        try {
            const client = this.getClient();
            if (!client.isOpen) {
                await client.connect();
            }
            const result = await client.del(key);
            return result > 0;
        }
        catch (error) {
            this.logger.error(`Failed to delete cached data for key ${key}:`, error);
            return false;
        }
    }
    static async clearCache(pattern = '*') {
        try {
            const client = this.getClient();
            if (!client.isOpen) {
                await client.connect();
            }
            const keys = await client.keys(pattern);
            if (keys.length > 0) {
                await client.del(keys);
                this.logger.info(`Cleared ${keys.length} cache keys matching pattern: ${pattern}`);
            }
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to clear cache with pattern ${pattern}:`, error);
            return false;
        }
    }
    // Pub/Sub helper methods
    static async publish(channel, message) {
        try {
            const client = this.getClient();
            if (!client.isOpen) {
                await client.connect();
            }
            const serialized = JSON.stringify(message);
            return await client.publish(channel, serialized);
        }
        catch (error) {
            this.logger.error(`Failed to publish to channel ${channel}:`, error);
            throw error;
        }
    }
    static async subscribe(channel, callback) {
        try {
            const client = this.getClient();
            if (!client.isOpen) {
                await client.connect();
            }
            const subscriber = client.duplicate();
            await subscriber.connect();
            await subscriber.subscribe(channel, (message) => {
                try {
                    const parsed = JSON.parse(message);
                    callback(parsed);
                }
                catch (error) {
                    this.logger.error(`Failed to parse message from channel ${channel}:`, error);
                }
            });
            this.logger.info(`Subscribed to Redis channel: ${channel}`);
        }
        catch (error) {
            this.logger.error(`Failed to subscribe to channel ${channel}:`, error);
            throw error;
        }
    }
}
exports.RedisConfig = RedisConfig;
//# sourceMappingURL=redis.js.map