"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseConfig = void 0;
const typeorm_1 = require("typeorm");
const logger_1 = require("../utils/logger");
const recommendation_model_1 = require("../models/recommendation.model");
const ticker_model_1 = require("../models/ticker.model");
const sector_model_1 = require("../models/sector.model");
const optionChain_model_1 = require("../models/optionChain.model");
const newsArticle_model_1 = require("../models/newsArticle.model");
const backtestResult_model_1 = require("../models/backtestResult.model");
const user_model_1 = require("../models/user.model");
const watchlist_model_1 = require("../models/watchlist.model");
const trade_model_1 = require("../models/trade.model");
class DatabaseConfig {
    static logger = new logger_1.Logger('DatabaseConfig');
    static dataSource;
    static getDataSource() {
        if (!this.dataSource) {
            const options = {
                type: 'postgres',
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '5432'),
                username: process.env.DB_USER || 'aphelion_user',
                password: process.env.DB_PASSWORD || 'aphelion_password',
                database: process.env.DB_NAME || 'aphelion',
                synchronize: process.env.NODE_ENV === 'development',
                logging: process.env.NODE_ENV === 'development',
                entities: [
                    recommendation_model_1.Recommendation,
                    ticker_model_1.Ticker,
                    sector_model_1.Sector,
                    optionChain_model_1.OptionChain,
                    newsArticle_model_1.NewsArticle,
                    backtestResult_model_1.BacktestResult,
                    user_model_1.User,
                    watchlist_model_1.Watchlist,
                    trade_model_1.Trade
                ],
                migrations: ['src/migrations/*.ts'],
                subscribers: [],
                extra: {
                    max: 20, // Maximum number of connections in the pool
                    connectionTimeoutMillis: 5000,
                    idleTimeoutMillis: 30000,
                }
            };
            // Add SSL configuration for production
            if (process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true') {
                Object.assign(options, {
                    ssl: {
                        rejectUnauthorized: false
                    }
                });
            }
            this.dataSource = new typeorm_1.DataSource(options);
        }
        return this.dataSource;
    }
    static async testConnection() {
        try {
            const dataSource = this.getDataSource();
            if (!dataSource.isInitialized) {
                await dataSource.initialize();
            }
            // Test connection with a simple query
            await dataSource.query('SELECT 1');
            this.logger.info('Database connection test successful');
            return true;
        }
        catch (error) {
            this.logger.error('Database connection test failed:', error);
            return false;
        }
    }
    static async runMigrations() {
        try {
            const dataSource = this.getDataSource();
            if (!dataSource.isInitialized) {
                await dataSource.initialize();
            }
            const pendingMigrations = await dataSource.showMigrations();
            if (pendingMigrations) {
                this.logger.info('Running database migrations...');
                await dataSource.runMigrations();
                this.logger.info('Database migrations completed');
            }
            else {
                this.logger.info('No pending migrations');
            }
        }
        catch (error) {
            this.logger.error('Failed to run migrations:', error);
            throw error;
        }
    }
    static async dropDatabase() {
        try {
            const dataSource = this.getDataSource();
            if (!dataSource.isInitialized) {
                await dataSource.initialize();
            }
            this.logger.warn('Dropping database...');
            await dataSource.dropDatabase();
            this.logger.warn('Database dropped');
        }
        catch (error) {
            this.logger.error('Failed to drop database:', error);
            throw error;
        }
    }
    static async closeConnection() {
        try {
            if (this.dataSource?.isInitialized) {
                await this.dataSource.destroy();
                this.logger.info('Database connection closed');
            }
        }
        catch (error) {
            this.logger.error('Failed to close database connection:', error);
            throw error;
        }
    }
    // Helper method to get repository with proper typing
    static getRepository(entity) {
        const dataSource = this.getDataSource();
        if (!dataSource.isInitialized) {
            throw new Error('Database not initialized');
        }
        return dataSource.getRepository(entity);
    }
}
exports.DatabaseConfig = DatabaseConfig;
//# sourceMappingURL=database.js.map