import { DataSource, DataSourceOptions } from 'typeorm';
import { Logger } from '../utils/logger';
import { Recommendation } from '../models/recommendation.model';
import { Ticker } from '../models/ticker.model';
import { Sector } from '../models/sector.model';
import { OptionChain } from '../models/optionChain.model';
import { NewsArticle } from '../models/newsArticle.model';
import { BacktestResult } from '../models/backtestResult.model';
import { User } from '../models/user.model';
import { Watchlist } from '../models/watchlist.model';
import { Trade } from '../models/trade.model';

export class DatabaseConfig {
  private static logger = new Logger('DatabaseConfig');
  private static dataSource: DataSource;

  public static getDataSource(): DataSource {
    if (!this.dataSource) {
      const options: DataSourceOptions = {
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER || 'aphelion_user',
        password: process.env.DB_PASSWORD || 'aphelion_password',
        database: process.env.DB_NAME || 'aphelion',
        synchronize: process.env.NODE_ENV === 'development',
        logging: process.env.NODE_ENV === 'development',
        entities: [
          Recommendation,
          Ticker,
          Sector,
          OptionChain,
          NewsArticle,
          BacktestResult,
          User,
          Watchlist,
          Trade
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

      this.dataSource = new DataSource(options);
    }

    return this.dataSource;
  }

  public static async testConnection(): Promise<boolean> {
    try {
      const dataSource = this.getDataSource();
      
      if (!dataSource.isInitialized) {
        await dataSource.initialize();
      }
      
      // Test connection with a simple query
      await dataSource.query('SELECT 1');
      this.logger.info('Database connection test successful');
      return true;
    } catch (error) {
      this.logger.error('Database connection test failed:', error);
      return false;
    }
  }

  public static async runMigrations(): Promise<void> {
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
      } else {
        this.logger.info('No pending migrations');
      }
    } catch (error) {
      this.logger.error('Failed to run migrations:', error);
      throw error;
    }
  }

  public static async dropDatabase(): Promise<void> {
    try {
      const dataSource = this.getDataSource();
      
      if (!dataSource.isInitialized) {
        await dataSource.initialize();
      }
      
      this.logger.warn('Dropping database...');
      await dataSource.dropDatabase();
      this.logger.warn('Database dropped');
    } catch (error) {
      this.logger.error('Failed to drop database:', error);
      throw error;
    }
  }

  public static async closeConnection(): Promise<void> {
    try {
      if (this.dataSource?.isInitialized) {
        await this.dataSource.destroy();
        this.logger.info('Database connection closed');
      }
    } catch (error) {
      this.logger.error('Failed to close database connection:', error);
      throw error;
    }
  }

  // Helper method to get repository with proper typing
  public static getRepository<T>(entity: new () => T) {
    const dataSource = this.getDataSource();
    
    if (!dataSource.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    return dataSource.getRepository(entity);
  }
}