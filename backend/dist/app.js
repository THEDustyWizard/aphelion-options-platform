"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middlewares/errorHandler");
const rateLimiter_1 = require("./middlewares/rateLimiter");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const swagger_1 = require("./config/swagger");
const routes_1 = require("./routes");
const websocket_service_1 = require("./services/websocket.service");
const jobQueue_service_1 = require("./services/jobQueue.service");
const healthCheck_service_1 = require("./services/healthCheck.service");
class App {
    static app;
    static server;
    static wss;
    static dataSource;
    static redisClient;
    static jobQueue;
    static healthCheck;
    static logger = new logger_1.Logger('App');
    static async initialize() {
        try {
            // Initialize Express application
            this.app = (0, express_1.default)();
            // Setup middleware
            this.setupMiddleware();
            // Initialize database (non-fatal — server starts in degraded mode if unavailable)
            try {
                await this.initializeDatabase();
            }
            catch (dbError) {
                this.logger.warn('Database unavailable, starting in degraded mode:', dbError);
            }
            // Initialize Redis (non-fatal)
            try {
                await this.initializeRedis();
            }
            catch (redisError) {
                this.logger.warn('Redis unavailable, starting in degraded mode:', redisError);
            }
            // Initialize job queue (non-fatal)
            try {
                await this.initializeJobQueue();
            }
            catch (jobError) {
                this.logger.warn('Job queue unavailable, starting in degraded mode:', jobError);
            }
            // Setup routes
            this.setupRoutes();
            // Setup error handling
            this.setupErrorHandling();
            // Initialize health check service
            this.healthCheck = new healthCheck_service_1.HealthCheckService();
            this.logger.info('Application initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize application:', error);
            throw error;
        }
    }
    static async start() {
        try {
            // Create HTTP server
            this.server = http_1.default.createServer(this.app);
            // Initialize WebSocket server if enabled
            if (process.env.WS_ENABLED === 'true') {
                await this.initializeWebSocket();
            }
            // Start the server
            const port = process.env.PORT || 3000;
            this.server.listen(port, () => {
                this.logger.info(`HTTP server listening on port ${port}`);
            });
            // Start health checks
            this.healthCheck.start();
        }
        catch (error) {
            this.logger.error('Failed to start server:', error);
            throw error;
        }
    }
    static setupMiddleware() {
        // Security headers
        this.app.use((0, helmet_1.default)());
        // CORS configuration
        const corsOptions = {
            origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
            credentials: process.env.CORS_CREDENTIALS === 'true',
            optionsSuccessStatus: 200
        };
        this.app.use((0, cors_1.default)(corsOptions));
        // Compression
        this.app.use((0, compression_1.default)());
        // Body parsing
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        // Rate limiting
        this.app.use(rateLimiter_1.RateLimiter.middleware());
        // Request logging
        this.app.use((req, res, next) => {
            this.logger.http(`${req.method} ${req.path}`, {
                ip: req.ip,
                userAgent: req.get('user-agent'),
                query: req.query,
                body: req.body
            });
            next();
        });
        // API documentation
        if (process.env.NODE_ENV !== 'production') {
            const swaggerSpec = swagger_1.SwaggerConfig.generate();
            this.app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
            this.logger.info('Swagger documentation available at /api-docs');
        }
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                environment: process.env.NODE_ENV
            });
        });
    }
    static async initializeDatabase() {
        try {
            this.dataSource = database_1.DatabaseConfig.getDataSource();
            await this.dataSource.initialize();
            this.logger.info('Database connection established');
            // Run migrations in development
            if (process.env.NODE_ENV === 'development') {
                await this.dataSource.runMigrations();
                this.logger.info('Database migrations completed');
            }
        }
        catch (error) {
            this.logger.error('Failed to initialize database:', error);
            // non-fatal: server starts without DB
        }
    }
    static async initializeRedis() {
        try {
            this.redisClient = redis_1.RedisConfig.getClient();
            // Timeout after 3 seconds so startup isn't blocked
            await Promise.race([
                this.redisClient.connect(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connect timeout')), 3000))
            ]);
            this.logger.info('Redis connection established');
        }
        catch (error) {
            this.logger.error('Failed to initialize Redis:', error);
            // non-fatal: server starts without Redis
        }
    }
    static async initializeJobQueue() {
        try {
            this.jobQueue = new jobQueue_service_1.JobQueueService();
            await this.jobQueue.initialize();
            this.logger.info('Job queue initialized');
        }
        catch (error) {
            this.logger.error('Failed to initialize job queue:', error);
            // non-fatal: server starts without job queue
        }
    }
    static async initializeWebSocket() {
        try {
            const wsPort = parseInt(process.env.WS_PORT || '3001');
            this.wss = new socket_io_1.Server(this.server, {
                cors: {
                    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
                    credentials: true
                },
                path: '/ws'
            });
            const webSocketService = new websocket_service_1.WebSocketService(this.wss);
            await webSocketService.initialize();
            this.logger.info(`WebSocket server initialized on port ${wsPort}`);
        }
        catch (error) {
            this.logger.error('Failed to initialize WebSocket server:', error);
            throw error;
        }
    }
    static setupRoutes() {
        // API routes
        const apiPrefix = process.env.API_PREFIX || '/api/v1';
        this.app.use(apiPrefix, (0, routes_1.registerRoutes)());
        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Route ${req.originalUrl} not found`,
                timestamp: new Date().toISOString()
            });
        });
    }
    static setupErrorHandling() {
        // Error handling middleware
        this.app.use(errorHandler_1.ErrorHandler.handle);
        // Global error handler for unhandled routes
        this.app.use((error, req, res, next) => {
            this.logger.error('Unhandled error:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
                timestamp: new Date().toISOString()
            });
        });
    }
}
exports.App = App;
//# sourceMappingURL=app.js.map