import { BaseEntity } from './base.entity';
import { Recommendation } from './recommendation.model';
import { OptionChain } from './optionChain.model';
import { NewsArticle } from './newsArticle.model';
export declare class Ticker extends BaseEntity {
    symbol: string;
    name: string;
    sector: string;
    marketCap: number | null;
    price: number | null;
    volume: number | null;
    hasOptions: boolean;
    active: boolean;
    fundamentals: {
        peRatio: number | null;
        eps: number | null;
        dividendYield: number | null;
        beta: number | null;
        debtToEquity: number | null;
        roic: number | null;
        revenueGrowth: number | null;
        operatingMargin: number | null;
        freeCashFlow: number | null;
        profitMargin: number | null;
        rndGrowth: number | null;
        updatedAt: Date;
    } | null;
    technicals: {
        rsi: number | null;
        macd: number | null;
        macdSignal: number | null;
        atrPercent: number | null;
        bollingerPosition: number | null;
        supportDistance: number | null;
        resistanceDistance: number | null;
        updatedAt: Date;
    } | null;
    lastUpdated: Date | null;
    recommendations: Recommendation[];
    optionChains: OptionChain[];
    newsArticles: NewsArticle[];
    getSectorETF(): string;
    isLargeCap(): boolean;
    isMidCap(): boolean;
    isSmallCap(): boolean;
    getMarketCapCategory(): string;
}
//# sourceMappingURL=ticker.model.d.ts.map