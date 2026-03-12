import 'reflect-metadata';
import dotenv from 'dotenv';
import { App } from './app';
import { Logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = new Logger('Server');

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close server and cleanup
    if (App.server) {
      await new Promise<void>((resolve) => {
        App.server.close(() => {
          logger.info('HTTP server closed');
          resolve();
        });
      });
    }
    
    // Close database connections
    if (App.dataSource?.isInitialized) {
      await App.dataSource.destroy();
      logger.info('Database connections closed');
    }
    
    // Close Redis connections
    if (App.redisClient) {
      await App.redisClient.quit();
      logger.info('Redis connections closed');
    }
    
    // Close WebSocket server
    if (App.wss) {
      App.wss.close();
      logger.info('WebSocket server closed');
    }
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Don't exit immediately, let the process continue but log the error
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { promise, reason });
});

// Setup signal handlers
const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGHUP'];
signals.forEach((signal) => {
  process.on(signal, () => gracefulShutdown(signal));
});

// Start the application
(async () => {
  try {
    await App.initialize();
    await App.start();
    
    logger.info(`APHELION Backend started successfully in ${process.env.NODE_ENV} mode`);
    logger.info(`Server running on port ${process.env.PORT || 3000}`);
    logger.info(`API Documentation available at http://localhost:${process.env.PORT || 3000}/api-docs`);
    
    if (process.env.WS_ENABLED === 'true') {
      logger.info(`WebSocket server running on port ${process.env.WS_PORT || 3001}`);
    }
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
})();