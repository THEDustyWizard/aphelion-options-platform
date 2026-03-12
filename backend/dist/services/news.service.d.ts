export interface NewsArticle {
    id: string;
    title: string;
    description: string;
    content?: string;
    url: string;
    source: string;
    publishedAt: Date;
    sentiment: number;
    tickers: string[];
    sector?: string;
    relevance?: number;
    keywords?: string[];
}
export interface SentimentAnalysis {
    overall: number;
    byTicker: Record<string, number>;
    bySector: Record<string, number>;
    keywords: string[];
    volume: number;
    trend: number;
}
export declare class NewsService {
    private logger;
    private readonly apiKey;
    private readonly baseUrl;
    constructor();
    getNewsForTicker(ticker: string, limit?: number): Promise<NewsArticle[]>;
    getNewsForSector(sector: string, limit?: number): Promise<NewsArticle[]>;
    analyzeSentiment(articles: NewsArticle[], ticker?: string): SentimentAnalysis;
    private parseArticle;
    /**
     * Calculate relevance of article to ticker
     */
    private calculateRelevance;
    /**
     * Calculate relevance of article to sector
     */
    private calculateSectorRelevance;
    /**
     * Get keywords for a sector
     */
    private getSectorKeywords;
    /**
     * Extract tickers from article
     */
    private extractTickers;
    /**
     * Extract keywords from article
     */
    private extractKeywords;
    /**
     * Extract keywords from text
     */
    private extractKeywordsFromText;
    /**
     * Generate unique article ID
     */
    private generateArticleId;
    /**
     * Normalize sentiment score
     */
    private normalizeSentiment;
    /**
     * Remove duplicate articles
     */
    private deduplicateArticles;
}
//# sourceMappingURL=news.service.d.ts.map