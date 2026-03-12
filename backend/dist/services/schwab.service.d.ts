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
export declare class SchwabService {
    private client;
    private logger;
    private authTokens;
    private readonly baseUrl;
    private readonly authUrl;
    private readonly tokenUrl;
    constructor();
    /**
     * Generate authorization URL for OAuth2 flow
     */
    getAuthorizationUrl(): string;
    /**
     * Exchange authorization code for access token
     */
    exchangeCodeForToken(code: string): Promise<SchwabAuthTokens>;
    /**
     * Refresh access token using refresh token
     */
    refreshToken(): Promise<void>;
    /**
     * Check if current token is expired
     */
    private isTokenExpired;
    /**
     * Get account information
     */
    getAccounts(): Promise<SchwabAccount[]>;
    /**
     * Get positions for a specific account
     */
    getPositions(accountNumber: string): Promise<SchwabPosition[]>;
    /**
     * Get option chain for a symbol
     */
    getOptionChain(symbol: string, params?: {
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
    }): Promise<SchwabOptionChain>;
    /**
     * Get quote for a symbol
     */
    getQuote(symbol: string): Promise<any>;
    /**
     * Get historical price data
     */
    getHistoricalPrices(symbol: string, params: {
        periodType: string;
        period: number;
        frequencyType: string;
        frequency: number;
        needExtendedHoursData?: boolean;
    }): Promise<any>;
    /**
     * Search for instruments
     */
    searchInstruments(symbol: string, projection?: string): Promise<any[]>;
    /**
     * Get market hours for a specific date
     */
    getMarketHours(markets?: string, date?: string): Promise<any>;
    /**
     * Get option expiration dates for a symbol
     */
    getOptionExpirations(symbol: string): Promise<string[]>;
    /**
     * Get unusual options activity
     */
    getUnusualActivity(params?: {
        direction?: string;
        totalVolume?: number;
        totalPremium?: number;
        symbol?: string;
        sentiment?: string;
    }): Promise<any[]>;
    /**
     * Place an options order (paper trading)
     */
    placeOptionOrder(accountNumber: string, order: {
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
    }): Promise<any>;
    /**
     * Cancel an order
     */
    cancelOrder(accountNumber: string, orderId: string): Promise<void>;
    /**
     * Get order status
     */
    getOrder(accountNumber: string, orderId: string): Promise<any>;
    /**
     * Get all orders for an account
     */
    getOrders(accountNumber: string, params?: {
        maxResults?: number;
        fromEnteredTime?: string;
        toEnteredTime?: string;
        status?: string;
    }): Promise<any[]>;
    /**
     * Test API connectivity
     */
    testConnection(): Promise<boolean>;
}
//# sourceMappingURL=schwab.service.d.ts.map