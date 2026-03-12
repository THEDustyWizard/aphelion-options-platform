"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchwabService = void 0;
const axios_1 = __importDefault(require("axios"));
const querystring = __importStar(require("querystring"));
const logger_1 = require("../utils/logger");
class SchwabService {
    client;
    logger;
    authTokens = null;
    baseUrl = 'https://api.schwabapi.com';
    authUrl = 'https://api.schwabapi.com/v1/oauth/authorize';
    tokenUrl = 'https://api.schwabapi.com/v1/oauth/token';
    constructor() {
        this.logger = new logger_1.Logger('SchwabService');
        this.client = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        // Add request interceptor for authentication
        this.client.interceptors.request.use(async (config) => {
            if (this.authTokens && config.url !== '/oauth/token') {
                // Check if token needs refresh
                if (this.isTokenExpired()) {
                    await this.refreshToken();
                }
                config.headers.Authorization = `Bearer ${this.authTokens.accessToken}`;
            }
            return config;
        }, (error) => {
            return Promise.reject(error);
        });
        // Add response interceptor for error handling
        this.client.interceptors.response.use((response) => response, async (error) => {
            if (error.response?.status === 401 && this.authTokens) {
                this.logger.warn('Token expired, attempting refresh...');
                try {
                    await this.refreshToken();
                    // Retry the original request
                    const retryConfig = error.config;
                    retryConfig.headers.Authorization = `Bearer ${this.authTokens.accessToken}`;
                    return this.client(retryConfig);
                }
                catch (refreshError) {
                    this.logger.error('Token refresh failed:', refreshError);
                    this.authTokens = null;
                }
            }
            return Promise.reject(error);
        });
    }
    /**
     * Generate authorization URL for OAuth2 flow
     */
    getAuthorizationUrl() {
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
    async exchangeCodeForToken(code) {
        try {
            const data = {
                grant_type: 'authorization_code',
                code,
                redirect_uri: process.env.SCHWAB_REDIRECT_URI,
                client_id: process.env.SCHWAB_API_KEY,
                client_secret: process.env.SCHWAB_API_SECRET
            };
            const response = await axios_1.default.post(this.tokenUrl, data, {
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
        }
        catch (error) {
            this.logger.error('Failed to exchange code for token:', error);
            throw error;
        }
    }
    /**
     * Refresh access token using refresh token
     */
    async refreshToken() {
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
            const response = await axios_1.default.post(this.tokenUrl, data, {
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
        }
        catch (error) {
            this.logger.error('Failed to refresh token:', error);
            throw error;
        }
    }
    /**
     * Check if current token is expired
     */
    isTokenExpired() {
        if (!this.authTokens)
            return true;
        return new Date() >= this.authTokens.expiresAt;
    }
    /**
     * Get account information
     */
    async getAccounts() {
        try {
            const response = await this.client.get('/trader/v1/accounts/accountNumbers');
            return response.data.map((account) => ({
                accountNumber: account.accountNumber,
                type: account.type,
                nickname: account.nickname,
                status: account.status,
                clearingHouse: account.clearingHouse,
                marketValue: account.currentBalances?.marketValue || 0,
                cashBalance: account.currentBalances?.cashBalance || 0,
                buyingPower: account.currentBalances?.buyingPower || 0
            }));
        }
        catch (error) {
            this.logger.error('Failed to get accounts:', error);
            throw error;
        }
    }
    /**
     * Get positions for a specific account
     */
    async getPositions(accountNumber) {
        try {
            const response = await this.client.get(`/trader/v1/accounts/${accountNumber}/positions`);
            return response.data.map((position) => ({
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
        }
        catch (error) {
            this.logger.error('Failed to get positions:', error);
            throw error;
        }
    }
    /**
     * Get option chain for a symbol
     */
    async getOptionChain(symbol, params) {
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
            const queryParams = { ...defaultParams, ...params };
            // Remove null values
            Object.keys(queryParams).forEach(key => {
                if (queryParams[key] === null) {
                    delete queryParams[key];
                }
            });
            const response = await this.client.get('/marketdata/v1/chains', { params: queryParams });
            return response.data;
        }
        catch (error) {
            this.logger.error(`Failed to get option chain for ${symbol}:`, error);
            throw error;
        }
    }
    /**
     * Get quote for a symbol
     */
    async getQuote(symbol) {
        try {
            const response = await this.client.get(`/marketdata/v1/${symbol}/quotes`, {
                params: {
                    fields: 'quote,reference,fundamental'
                }
            });
            return response.data[symbol.toUpperCase()];
        }
        catch (error) {
            this.logger.error(`Failed to get quote for ${symbol}:`, error);
            throw error;
        }
    }
    /**
     * Get historical price data
     */
    async getHistoricalPrices(symbol, params) {
        try {
            const response = await this.client.get(`/marketdata/v1/${symbol}/pricehistory`, { params });
            return response.data;
        }
        catch (error) {
            this.logger.error(`Failed to get historical prices for ${symbol}:`, error);
            throw error;
        }
    }
    /**
     * Search for instruments
     */
    async searchInstruments(symbol, projection = 'symbol-search') {
        try {
            const response = await this.client.get('/marketdata/v1/instruments', {
                params: {
                    symbol: symbol.toUpperCase(),
                    projection
                }
            });
            return Object.values(response.data);
        }
        catch (error) {
            this.logger.error(`Failed to search instruments for ${symbol}:`, error);
            throw error;
        }
    }
    /**
     * Get market hours for a specific date
     */
    async getMarketHours(markets = 'equity,option', date = new Date().toISOString().split('T')[0]) {
        try {
            const response = await this.client.get(`/marketdata/v1/markets`, {
                params: {
                    markets,
                    date
                }
            });
            return response.data;
        }
        catch (error) {
            this.logger.error('Failed to get market hours:', error);
            throw error;
        }
    }
    /**
     * Get option expiration dates for a symbol
     */
    async getOptionExpirations(symbol) {
        try {
            const chain = await this.getOptionChain(symbol, { strikeCount: 1 });
            return Object.keys(chain.callExpDateMap || {});
        }
        catch (error) {
            this.logger.error(`Failed to get option expirations for ${symbol}:`, error);
            throw error;
        }
    }
    /**
     * Get unusual options activity
     */
    async getUnusualActivity(params) {
        try {
            // Note: This endpoint might require a different API tier
            const response = await this.client.get('/marketdata/v1/unusualactivity', { params });
            return response.data;
        }
        catch (error) {
            this.logger.error('Failed to get unusual options activity:', error);
            throw error;
        }
    }
    /**
     * Place an options order (paper trading)
     */
    async placeOptionOrder(accountNumber, order) {
        try {
            const response = await this.client.post(`/trader/v1/accounts/${accountNumber}/orders`, order);
            return response.data;
        }
        catch (error) {
            this.logger.error('Failed to place order:', error);
            throw error;
        }
    }
    /**
     * Cancel an order
     */
    async cancelOrder(accountNumber, orderId) {
        try {
            await this.client.delete(`/trader/v1/accounts/${accountNumber}/orders/${orderId}`);
            this.logger.info(`Order ${orderId} cancelled successfully`);
        }
        catch (error) {
            this.logger.error(`Failed to cancel order ${orderId}:`, error);
            throw error;
        }
    }
    /**
     * Get order status
     */
    async getOrder(accountNumber, orderId) {
        try {
            const response = await this.client.get(`/trader/v1/accounts/${accountNumber}/orders/${orderId}`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`Failed to get order ${orderId}:`, error);
            throw error;
        }
    }
    /**
     * Get all orders for an account
     */
    async getOrders(accountNumber, params) {
        try {
            const response = await this.client.get(`/trader/v1/accounts/${accountNumber}/orders`, { params });
            return response.data;
        }
        catch (error) {
            this.logger.error('Failed to get orders:', error);
            throw error;
        }
    }
    /**
     * Test API connectivity
     */
    async testConnection() {
        try {
            await this.getMarketHours();
            this.logger.info('Schwab API connection test successful');
            return true;
        }
        catch (error) {
            this.logger.error('Schwab API connection test failed:', error);
            return false;
        }
    }
}
exports.SchwabService = SchwabService;
//# sourceMappingURL=schwab.service.js.map