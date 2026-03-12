"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = require("./app");
const logger_1 = require("./utils/logger");
// Load environment variables
dotenv_1.default.config();
// Initialize logger
const logger = new logger_1.Logger('Server');
// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    try {
        // Close server and cleanup
        if (app_1.App.server) {
            await new Promise((resolve) => {
                app_1.App.server.close(() => {
                    logger.info('HTTP server closed');
                    resolve();
                });
            });
        }
        // Close database connections
        if (app_1.App.dataSource?.isInitialized) {
            await app_1.App.dataSource.destroy();
            logger.info('Database connections closed');
        }
        // Close Redis connections
        if (app_1.App.redisClient) {
            await app_1.App.redisClient.quit();
            logger.info('Redis connections closed');
        }
        // Close WebSocket server
        if (app_1.App.wss) {
            app_1.App.wss.close();
            logger.info('WebSocket server closed');
        }
        logger.info('Graceful shutdown completed');
        process.exit(0);
    }
    catch (error) {
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
const signals = ['SIGTERM', 'SIGINT', 'SIGHUP'];
signals.forEach((signal) => {
    process.on(signal, () => gracefulShutdown(signal));
});
// Start the application
(async () => {
    try {
        await app_1.App.initialize();
        await app_1.App.start();
        logger.info(`APHELION Backend started successfully in ${process.env.NODE_ENV} mode`);
        logger.info(`Server running on port ${process.env.PORT || 3000}`);
        logger.info(`API Documentation available at http://localhost:${process.env.PORT || 3000}/api-docs`);
        if (process.env.WS_ENABLED === 'true') {
            logger.info(`WebSocket server running on port ${process.env.WS_PORT || 3001}`);
        }
    }
    catch (error) {
        logger.error('Failed to start application:', error);
        process.exit(1);
    }
})();
//# sourceMappingURL=index.js.map