import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import * as querystring from 'querystring';
import { Logger } from '../utils/logger';

export interface SchwabAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: string;
  scope: string;
}

export interface SchwabAccount {
  accountNumber: string;
  type: string;
  nickname: string;
  status: string;
  clearingHouse: string;
  marketValue: number;
  cashBalance: number;
  buyingPower: number;
}

export interface SchwabPosition {
  symbol: string;
  description: string;
  assetType: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  dayChange: number;
  dayChangePercent: number;
}

export interface SchwabOptionChain {
  symbol: string;
  status: string;
  underlying: {
    ask: number;
    askSize: number;
    bid: number;
    bidSize: number;
    close: number;
    delayed: boolean;
    description: string;
    exchangeName: string;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
    highPrice: number;
    lastPrice: number;
    lowPrice: number;
    mark: number;
    markChange: number;
    markPercentChange: number;
    openPrice: number;
    percentChange: number;
    quoteTime: number;
    totalVolume: number;
    tradeTime: number;
  };
  strategy: string;
  interval: number;
  isDelayed: boolean;
  isIndex: boolean;
  daysToExpiration: number;
  interestRate: number;
  underlyingPrice: number;
  volatility: number;
  callExpDateMap: Record<string, Record<string, any[]>>;
  putExpDateMap: Record<string, Record<string, any[]>>;
}

export class SchwabService {
  private client: AxiosInstance;
  private logger: Logger;
  private authTokens: SchwabAuthTokens | null = null;
  private readonly baseUrl = 'https://api.schwabapi.com';
  private readonly authUrl = 'https://api.schwabapi.com/v1/oauth/authorize';
  private readonly tokenUrl = 'https://api.schwabapi.com/v1/oauth/token';

  constructor() {
    this.logger = new Logger('SchwabService');
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(
      async (config) => {
        if (this.authTokens && config.url !== '/oauth/token') {
          // Check if token needs refresh
          if (this.isTokenExpired()) {
            await this.refreshToken();
          }
          
          config.headers.Authorization = `Bearer ${this.authTokens.accessToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.authTokens) {
          this.logger.warn('Token expired, attempting refresh...');
          try {
            await this.refreshToken();
            // Retry the original request
            const retryConfig = error.config;
            retryConfig.headers.Authorization = `Bearer ${this.authTokens.accessToken}`;
            return this.client(retryConfig);
          } catch (refreshError) {
            this.logger.error('Token refresh failed:', refreshError);
            this.authTokens = null;
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Generate authorization URL for OAuth2 flow
   */
  getAuthorizationUrl(): string {
    const params = {
      client_id: process.env.SCHWAB_API_KEY,
      redirect_uri: process.env.SCHWAB_REDIRECT_URI,
      response_type: 'code',
      scope: 'read_only'
    };
    
    return `${this.authUrl}?${querystring.stringify(params)}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<SchwabAuthTokens> {
    try {
      const data = {
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SCHWAB_REDIRECT_URI,
        client_id: process.env.SCHWAB_API_KEY,
        client_secret: process.env.SCHWAB_API_SECRET
      };

      const response = await axios.post(this.tokenUrl, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.authTokens = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
        tokenType: response.data.token_type,
        scope: response.data.scope
      };

      this.logger.info('Successfully obtained access token');
      return this.authTokens;
    } catch (error) {
      this.logger.error('Failed to exchange code for token:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<void> {
    if (!this.authTokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const data = {
        grant_type: 'refresh_token',
        refresh_token: this.authTokens.refreshToken,
        client_id: process.env.SCHWAB_API_KEY,
        client_secret: process.env.SCHWAB_API_SECRET
      };

      const response = await axios.post(this.tokenUrl, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.authTokens = {
        ...this.authTokens,
        accessToken: response.data.access_token,
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000)
      };

      this.logger.info('Successfully refreshed access token');
    } catch (error) {
      this.logger.error('Failed to refresh token:', error);
      throw error;
    }
  }

  /**
   * Check if current token is expired
   */
  private isTokenExpired(): boolean {
    if (!this.authTokens) return true;
    return new Date() >= this.authTokens.expiresAt;
  }

  /**
   * Get account information
   */
  async getAccounts(): Promise<SchwabAccount[]> {
    try {
      const response = await this.client.get('/trader/v1/accounts/accountNumbers');
      return response.data.map((account: any) => ({
        accountNumber: account.accountNumber,
        type: account.type,
        nickname: account.nickname,
        status: account.status,
        clearingHouse: account.clearingHouse,
        marketValue: account.currentBalances?.marketValue || 0,
        cashBalance: account.currentBalances?.cashBalance || 0,
        buyingPower: account.currentBalances?.buyingPower || 0
      }));
    } catch (error) {
      this.logger.error('Failed to get accounts:', error);
      throw error;
    }
  }

  /**
   * Get positions for a specific account
   */
  async getPositions(accountNumber: string): Promise<SchwabPosition[]> {
    try {
      const response = await this.client.get(`/trader/v1/accounts/${accountNumber}/positions`);
      return response.data.map((position: any) => ({
        symbol: position.instrument?.symbol || '',
        description: position.instrument?.description || '',
        assetType: position.instrument?.assetType || '',
        quantity: position.longQuantity || 0,
        averagePrice: position.averagePrice || 0,
        currentPrice: position.currentDayProfitLossPercentage ? 
          (position.marketValue / position.longQuantity) : 0,
        marketValue: position.marketValue || 0,
        dayChange: position.currentDayProfitLoss || 0,
        dayChangePercent: position.currentDayProfitLossPercentage || 0
      }));
    } catch (error) {
      this.logger.error('Failed to get positions:', error);
      throw error;
    }
  }

  /**
   * Get option chain for a symbol
   */
  async getOptionChain(symbol: string, params?: {
    strikeCount?: number;
    includeQuotes?: boolean;
    strategy?: string;
    interval?: number;
    strike?: number;
    range?: string;
    fromDate?: string;
    toDate?: string;
    volatility?: number;
    underlyingPrice?: number;
    interestRate?: number;
    daysToExpiration?: number;
    expMonth?: string;
    optionType?: string;
  }): Promise<SchwabOptionChain> {
    try {
      const defaultParams = {
        symbol: symbol.toUpperCase(),
        strikeCount: 10,
        includeQuotes: true,
        strategy: 'SINGLE',
        interval: null,
        strike: null,
        range: 'ALL',
        fromDate: null,
        toDate: null,
        volatility: null,
        underlyingPrice: null,
        interestRate: null,
        daysToExpiration: null,
        expMonth: 'ALL',
        optionType: 'ALL'
      };

      const queryParams: { [key: string]: any } = { ...defaultParams, ...params };

      // Remove null values
      Object.keys(queryParams).forEach(key => {
        if (queryParams[key] === null) {
          delete queryParams[key];
        }
      });

      const response = await this.client.get('/marketdata/v1/chains', { params: queryParams });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get option chain for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get quote for a symbol
   */
  async getQuote(symbol: string): Promise<any> {
    try {
      const response = await this.client.get(`/marketdata/v1/${symbol}/quotes`, {
        params: {
          fields: 'quote,reference,fundamental'
        }
      });
      return response.data[symbol.toUpperCase()];
    } catch (error) {
      this.logger.error(`Failed to get quote for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get historical price data
   */
  async getHistoricalPrices(symbol: string, params: {
    periodType: string;
    period: number;
    frequencyType: string;
    frequency: number;
    needExtendedHoursData?: boolean;
  }): Promise<any> {
    try {
      const response = await this.client.get(`/marketdata/v1/${symbol}/pricehistory`, { params });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get historical prices for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Search for instruments
   */
  async searchInstruments(symbol: string, projection: string = 'symbol-search'): Promise<any[]> {
    try {
      const response = await this.client.get('/marketdata/v1/instruments', {
        params: {
          symbol: symbol.toUpperCase(),
          projection
        }
      });
      return Object.values(response.data);
    } catch (error) {
      this.logger.error(`Failed to search instruments for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get market hours for a specific date
   */
  async getMarketHours(markets: string = 'equity,option', date: string = new Date().toISOString().split('T')[0]): Promise<any> {
    try {
      const response = await this.client.get(`/marketdata/v1/markets`, {
        params: {
          markets,
          date
        }
      });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get market hours:', error);
      throw error;
    }
  }

  /**
   * Get option expiration dates for a symbol
   */
  async getOptionExpirations(symbol: string): Promise<string[]> {
    try {
      const chain = await this.getOptionChain(symbol, { strikeCount: 1 });
      return Object.keys(chain.callExpDateMap || {});
    } catch (error) {
      this.logger.error(`Failed to get option expirations for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get unusual options activity
   */
  async getUnusualActivity(params?: {
    direction?: string;
    totalVolume?: number;
    totalPremium?: number;
    symbol?: string;
    sentiment?: string;
  }): Promise<any[]> {
    try {
      // Note: This endpoint might require a different API tier
      const response = await this.client.get('/marketdata/v1/unusualactivity', { params });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get unusual options activity:', error);
      throw error;
    }
  }

  /**
   * Place an options order (paper trading)
   */
  async placeOptionOrder(accountNumber: string, order: {
    orderType: string;
    session: string;
    duration: string;
    orderStrategyType: string;
    orderLegCollection: Array<{
      instruction: string;
      quantity: number;
      instrument: {
        symbol: string;
        assetType: string;
      };
    }>;
  }): Promise<any> {
    try {
      const response = await this.client.post(`/trader/v1/accounts/${accountNumber}/orders`, order);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to place order:', error);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(accountNumber: string, orderId: string): Promise<void> {
    try {
      await this.client.delete(`/trader/v1/accounts/${accountNumber}/orders/${orderId}`);
      this.logger.info(`Order ${orderId} cancelled successfully`);
    } catch (error) {
      this.logger.error(`Failed to cancel order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get order status
   */
  async getOrder(accountNumber: string, orderId: string): Promise<any> {
    try {
      const response = await this.client.get(`/trader/v1/accounts/${accountNumber}/orders/${orderId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get all orders for an account
   */
  async getOrders(accountNumber: string, params?: {
    maxResults?: number;
    fromEnteredTime?: string;
    toEnteredTime?: string;
    status?: string;
  }): Promise<any[]> {
    try {
      const response = await this.client.get(`/trader/v1/accounts/${accountNumber}/orders`, { params });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get orders:', error);
      throw error;
    }
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getMarketHours();
      this.logger.info('Schwab API connection test successful');
      return true;
    } catch (error) {
      this.logger.error('Schwab API connection test failed:', error);
      return false;
    }
  }
}