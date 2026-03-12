import express, { Application, Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { DataSource } from 'typeorm';
import { createClient } from 'redis';
import swaggerUi from 'swagger-ui-express';
import { Logger } from './utils/logger';
import { ErrorHandler } from './middlewares/errorHandler';
import { RateLimiter } from './middlewares/rateLimiter';
import { DatabaseConfig } from './config/database';
import { RedisConfig } from './config/redis';
import { SwaggerConfig } from './config/swagger';
import { registerRoutes } from './routes';
import { WebSocketService } from './services/websocket.service';
import { JobQueueService } from './services/jobQueue.service';
import { HealthCheckService } from './services/healthCheck.service';

export class App {
  public static app: Application;
  public static server: http.Server;
  public static wss: SocketIOServer;
  public static dataSource: DataSource;
  public static redisClient: ReturnType<typeof createClient>;
  public static jobQueue: JobQueueService;
  public static healthCheck: HealthCheckService;
  
  private static logger = new Logger('App');

  public static async initialize(): Promise<void> {
    try {
      // Initialize Express application
      this.app = express();
      
      // Setup middleware
      this.setupMiddleware();
      
      // Initialize database (non-fatal — server starts in degraded mode if unavailable)
      try {
        await this.initializeDatabase();
      } catch (dbError) {
        this.logger.warn('Database unavailable, starting in degraded mode:', dbError);
      }

      // Initialize Redis (non-fatal)
      try {
        await this.initializeRedis();
      } catch (redisError) {
        this.logger.warn('Redis unavailable, starting in degraded mode:', redisError);
      }

      // Initialize job queue (non-fatal)
      try {
        await this.initializeJobQueue();
      } catch (jobError) {
        this.logger.warn('Job queue unavailable, starting in degraded mode:', jobError);
      }
      
      // Setup routes
      this.setupRoutes();
      
      // Setup error handling
      this.setupErrorHandling();
      
      // Initialize health check service
      this.healthCheck = new HealthCheckService();
      
      this.logger.info('Application initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize application:', error);
      throw error;
    }
  }

  public static async start(): Promise<void> {
    try {
      // Create HTTP server
      this.server = http.createServer(this.app);
      
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
      
    } catch (error) {
      this.logger.error('Failed to start server:', error);
      throw error;
    }
  }

  private static setupMiddleware(): void {
    // Security headers
    this.app.use(helmet());
    
    // CORS configuration
    const corsOptions = {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
      credentials: process.env.CORS_CREDENTIALS === 'true',
      optionsSuccessStatus: 200
    };
    this.app.use(cors(corsOptions));
    
    // Compression
    this.app.use(compression());
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Rate limiting
    this.app.use(RateLimiter.middleware());
    
    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
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
      const swaggerSpec = SwaggerConfig.generate();
      this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
      this.logger.info('Swagger documentation available at /api-docs');
    }
    
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV
      });
    });
  }

  private static async initializeDatabase(): Promise<void> {
    try {
      this.dataSource = DatabaseConfig.getDataSource();
      await this.dataSource.initialize();
      this.logger.info('Database connection established');
      
      // Run migrations in development
      if (process.env.NODE_ENV === 'development') {
        await this.dataSource.runMigrations();
        this.logger.info('Database migrations completed');
      }
    } catch (error) {
      this.logger.error('Failed to initialize database:', error);
      // non-fatal: server starts without DB
    }
  }

  private static async initializeRedis(): Promise<void> {
    try {
      this.redisClient = RedisConfig.getClient();
      // Timeout after 3 seconds so startup isn't blocked
      await Promise.race([
        this.redisClient.connect(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Redis connect timeout')), 3000))
      ]);
      this.logger.info('Redis connection established');
    } catch (error) {
      this.logger.error('Failed to initialize Redis:', error);
      // non-fatal: server starts without Redis
    }
  }

  private static async initializeJobQueue(): Promise<void> {
    try {
      this.jobQueue = new JobQueueService();
      await this.jobQueue.initialize();
      this.logger.info('Job queue initialized');
    } catch (error) {
      this.logger.error('Failed to initialize job queue:', error);
      // non-fatal: server starts without job queue
    }
  }

  private static async initializeWebSocket(): Promise<void> {
    try {
      const wsPort = parseInt(process.env.WS_PORT || '3001');
      this.wss = new SocketIOServer(this.server, {
        cors: {
          origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
          credentials: true
        },
        path: '/ws'
      });
      
      const webSocketService = new WebSocketService(this.wss);
      await webSocketService.initialize();
      
      this.logger.info(`WebSocket server initialized on port ${wsPort}`);
    } catch (error) {
      this.logger.error('Failed to initialize WebSocket server:', error);
      throw error;
    }
  }

  private static setupRoutes(): void {
    // API routes
    const apiPrefix = process.env.API_PREFIX || '/api/v1';
    this.app.use(apiPrefix, registerRoutes());
    
    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });
  }

  private static setupErrorHandling(): void {
    // Error handling middleware
    this.app.use(ErrorHandler.handle);
    
    // Global error handler for unhandled routes
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      this.logger.error('Unhandled error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        timestamp: new Date().toISOString()
      });
    });
  }
}