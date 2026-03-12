"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
class NewsService {
    logger;
    apiKey;
    baseUrl;
    constructor() {
        this.logger = new logger_1.Logger('NewsService');
        this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || process.env.NEWS_API_KEY || '';
        this.baseUrl = 'https://www.alphavantage.co/query';
    }
    async getNewsForTicker(ticker, limit = 50) {
        try {
            const response = await axios_1.default.get(this.baseUrl, {
                params: {
                    function: 'NEWS_SENTIMENT',
                    tickers: ticker,
                    limit,
                    apikey: this.apiKey
                }
            });
            const items = response.data.feed || [];
            const articles = items.map((item) => this.parseArticle(item, ticker));
            return this.deduplicateArticles(articles);
        }
        catch (error) {
            this.logger.error(`Failed to fetch news for ${ticker}:`, error);
            return [];
        }
    }
    async getNewsForSector(sector, limit = 50) {
        try {
            const sectorKeywords = this.getSectorKeywords(sector);
            const topic = sectorKeywords.slice(0, 3).join(',');
            const response = await axios_1.default.get(this.baseUrl, {
                params: {
                    function: 'NEWS_SENTIMENT',
                    topics: topic,
                    limit,
                    apikey: this.apiKey
                }
            });
            const items = response.data.feed || [];
            const articles = items.map((item) => ({
                ...this.parseArticle(item),
                sector
            }));
            return this.deduplicateArticles(articles);
        }
        catch (error) {
            this.logger.error(`Failed to fetch news for sector ${sector}:`, error);
            return [];
        }
    }
    analyzeSentiment(articles, ticker) {
        if (articles.length === 0) {
            return { overall: 0, byTicker: {}, bySector: {}, keywords: [], volume: 0, trend: 0 };
        }
        const relevant = ticker
            ? articles.filter(a => a.tickers.includes(ticker) ||
                a.title.toLowerCase().includes(ticker.toLowerCase()))
            : articles;
        const overallSentiment = relevant.length > 0
            ? relevant.reduce((sum, a) => sum + a.sentiment, 0) / relevant.length
            : 0;
        const byTicker = {};
        relevant.forEach(article => {
            article.tickers.forEach(t => {
                if (!byTicker[t])
                    byTicker[t] = 0;
                byTicker[t] = (byTicker[t] + article.sentiment) / 2;
            });
        });
        const bySector = {};
        relevant.forEach(article => {
            if (article.sector) {
                if (!bySector[article.sector])
                    bySector[article.sector] = 0;
                bySector[article.sector] = (bySector[article.sector] + article.sentiment) / 2;
            }
        });
        const allText = relevant.map(a => `${a.title} ${a.description}`).join(' ');
        const keywords = this.extractKeywordsFromText(allText);
        const midpoint = Math.floor(relevant.length / 2);
        const recentArticles = relevant.slice(0, midpoint);
        const olderArticles = relevant.slice(midpoint);
        const recentSentiment = recentArticles.length > 0
            ? recentArticles.reduce((sum, a) => sum + a.sentiment, 0) / recentArticles.length
            : 0;
        const olderSentiment = olderArticles.length > 0
            ? olderArticles.reduce((sum, a) => sum + a.sentiment, 0) / olderArticles.length
            : 0;
        const trend = recentSentiment - olderSentiment;
        return {
            overall: overallSentiment,
            byTicker,
            bySector,
            keywords,
            volume: articles.length,
            trend
        };
    }
    parseArticle(item, defaultTicker) {
        const tickerSentiment = item.ticker_sentiment || [];
        const tickers = tickerSentiment.map((t) => t.ticker);
        if (defaultTicker && !tickers.includes(defaultTicker)) {
            tickers.push(defaultTicker);
        }
        const sentimentScore = parseFloat(item.overall_sentiment_score) || 0;
        return {
            id: this.generateArticleId(item),
            title: item.title || '',
            description: item.summary || '',
            content: item.summary || '',
            url: item.url || '',
            source: item.source || '',
            publishedAt: new Date(item.time_published || Date.now()),
            sentiment: this.normalizeSentiment(sentimentScore),
            tickers,
            keywords: this.extractKeywordsFromText(item.title || '')
        };
    }
    /**
     * Calculate relevance of article to ticker
     */
    calculateRelevance(article, ticker) {
        let relevance = 0;
        // Check if ticker is mentioned
        if (article.tickers.includes(ticker)) {
            relevance += 0.7;
        }
        // Check title for ticker mention
        const title = article.title.toLowerCase();
        if (title.includes(ticker.toLowerCase())) {
            relevance += 0.2;
        }
        // Check content for ticker mention
        const content = (article.content || '').toLowerCase();
        if (content.includes(ticker.toLowerCase())) {
            relevance += 0.1;
        }
        // Recency bonus (more recent = more relevant)
        const hoursAgo = (Date.now() - article.publishedAt.getTime()) / (1000 * 60 * 60);
        if (hoursAgo < 24)
            relevance += 0.3;
        else if (hoursAgo < 72)
            relevance += 0.1;
        return Math.min(1, relevance);
    }
    /**
     * Calculate relevance of article to sector
     */
    calculateSectorRelevance(article, sector) {
        let relevance = 0;
        // Check if article is tagged with sector
        if (article.sector === sector) {
            relevance += 0.5;
        }
        // Check for sector keywords
        const sectorKeywords = this.getSectorKeywords(sector);
        const text = `${article.title} ${article.description} ${article.content}`.toLowerCase();
        sectorKeywords.forEach(keyword => {
            if (text.includes(keyword.toLowerCase())) {
                relevance += 0.1;
            }
        });
        // Recency bonus
        const hoursAgo = (Date.now() - article.publishedAt.getTime()) / (1000 * 60 * 60);
        if (hoursAgo < 24)
            relevance += 0.3;
        else if (hoursAgo < 72)
            relevance += 0.1;
        return Math.min(1, relevance);
    }
    /**
     * Get keywords for a sector
     */
    getSectorKeywords(sector) {
        const keywords = {
            defense: [
                'defense', 'military', 'aerospace', 'weapons', 'contract', 'pentagon',
                'navy', 'army', 'air force', 'lockheed', 'raytheon', 'northrop', 'boeing'
            ],
            energy: [
                'energy', 'oil', 'gas', 'petroleum', 'drilling', 'refining', 'crude',
                'opec', 'exxon', 'chevron', 'shell', 'bp', 'renewable', 'solar', 'wind'
            ],
            logistics: [
                'logistics', 'shipping', 'transport', 'freight', 'supply chain',
                'delivery', 'warehouse', 'distribution', 'fedex', 'ups', 'amazon'
            ],
            medical: [
                'medical', 'healthcare', 'pharmaceutical', 'biotech', 'drug',
                'fda', 'clinical trial', 'hospital', 'insurance', 'pfizer', 'moderna'
            ]
        };
        return keywords[sector] || [];
    }
    /**
     * Extract tickers from article
     */
    extractTickers(article) {
        const text = `${article.title} ${article.description} ${article.content}`;
        const tickerRegex = /\b[A-Z]{1,5}\b/g;
        const matches = text.match(tickerRegex) || [];
        // Filter out common words that look like tickers
        const commonWords = ['THE', 'AND', 'FOR', 'YOU', 'ARE', 'NOT', 'BUT', 'HAS', 'WAS'];
        return [...new Set(matches.filter(ticker => ticker.length >= 2 &&
                ticker.length <= 5 &&
                !commonWords.includes(ticker) &&
                ticker === ticker.toUpperCase()))];
    }
    /**
     * Extract keywords from article
     */
    extractKeywords(article) {
        const text = `${article.title} ${article.description}`.toLowerCase();
        // Remove common stop words
        const stopWords = new Set([
            'the', 'and', 'for', 'you', 'are', 'not', 'but', 'has', 'was', 'with',
            'this', 'that', 'have', 'from', 'they', 'will', 'would', 'what', 'when'
        ]);
        const words = text.split(/\W+/).filter(word => word.length > 3 &&
            !stopWords.has(word) &&
            !/^\d+$/.test(word));
        // Count word frequencies
        const wordCounts = {};
        words.forEach(word => {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        });
        // Return top 10 keywords
        return Object.entries(wordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word]) => word);
    }
    /**
     * Extract keywords from text
     */
    extractKeywordsFromText(text) {
        const words = text.toLowerCase().split(/\W+/).filter(word => word.length > 3 &&
            !/^\d+$/.test(word));
        const wordCounts = {};
        words.forEach(word => {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        });
        return Object.entries(wordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word]) => word);
    }
    /**
     * Generate unique article ID
     */
    generateArticleId(article) {
        const str = `${article.url}-${article.publishedAt}-${article.source}`;
        return Buffer.from(str).toString('base64').slice(0, 32);
    }
    /**
     * Normalize sentiment score
     */
    normalizeSentiment(score) {
        // Alpha Vantage returns -1 to 1, but sometimes different ranges
        return Math.max(-1, Math.min(1, score));
    }
    /**
     * Remove duplicate articles
     */
    deduplicateArticles(articles) {
        const seen = new Set();
        return articles.filter(article => {
            if (seen.has(article.id)) {
                return false;
            }
            seen.add(article.id);
            return true;
        });
    }
}
exports.NewsService = NewsService;
//# sourceMappingURL=news.service.js.map