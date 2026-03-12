import { BaseEntity } from './base.entity';
import { Ticker } from './ticker.model';
export declare class NewsArticle extends BaseEntity {
    ticker?: Ticker;
    tickerId?: string;
    title: string;
    description?: string;
    content?: string;
    url: string;
    source: string;
    publishedAt: Date;
    sentiment?: number;
    tickers?: string[];
    sector?: string;
}
//# sourceMappingURL=newsArticle.model.d.ts.map