import { Application } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { DataSource } from 'typeorm';
import { createClient } from 'redis';
import { JobQueueService } from './services/jobQueue.service';
import { HealthCheckService } from './services/healthCheck.service';
export declare class App {
    static app: Application;
    static server: http.Server;
    static wss: SocketIOServer;
    static dataSource: DataSource;
    static redisClient: ReturnType<typeof createClient>;
    static jobQueue: JobQueueService;
    static healthCheck: HealthCheckService;
    private static logger;
    static initialize(): Promise<void>;
    static start(): Promise<void>;
    private static setupMiddleware;
    private static initializeDatabase;
    private static initializeRedis;
    private static initializeJobQueue;
    private static initializeWebSocket;
    private static setupRoutes;
    private static setupErrorHandling;
}
//# sourceMappingURL=app.d.ts.map