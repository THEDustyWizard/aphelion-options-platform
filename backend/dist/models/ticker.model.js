"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ticker = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const recommendation_model_1 = require("./recommendation.model");
const optionChain_model_1 = require("./optionChain.model");
const newsArticle_model_1 = require("./newsArticle.model");
let Ticker = class Ticker extends base_entity_1.BaseEntity {
    symbol;
    name;
    sector;
    marketCap;
    price;
    volume;
    hasOptions;
    active;
    fundamentals;
    technicals;
    lastUpdated;
    recommendations;
    optionChains;
    newsArticles;
    // Helper methods
    getSectorETF() {
        const sectorETFs = {
            defense: 'ITA',
            energy: 'XLE',
            logistics: 'XLI',
            medical: 'XLV',
            other: 'SPY'
        };
        return sectorETFs[this.sector] || 'SPY';
    }
    isLargeCap() {
        return this.marketCap ? this.marketCap >= 10_000_000_000 : false; // $10B+
    }
    isMidCap() {
        return this.marketCap ? this.marketCap >= 2_000_000_000 && this.marketCap < 10_000_000_000 : false; // $2B-$10B
    }
    isSmallCap() {
        return this.marketCap ? this.marketCap < 2_000_000_000 : false; // <$2B
    }
    getMarketCapCategory() {
        if (this.isLargeCap())
            return 'large';
        if (this.isMidCap())
            return 'mid';
        if (this.isSmallCap())
            return 'small';
        return 'unknown';
    }
};
exports.Ticker = Ticker;
__decorate([
    (0, typeorm_1.Column)({ length: 10 }),
    __metadata("design:type", String)
], Ticker.prototype, "symbol", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], Ticker.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['defense', 'energy', 'logistics', 'medical', 'other'],
        default: 'other'
    }),
    __metadata("design:type", String)
], Ticker.prototype, "sector", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 20, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], Ticker.prototype, "marketCap", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], Ticker.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 15, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], Ticker.prototype, "volume", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Ticker.prototype, "hasOptions", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Ticker.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Object)
], Ticker.prototype, "fundamentals", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Object)
], Ticker.prototype, "technicals", void 0);
__decorate([
    (0, typeorm_1.Column)('timestamptz', { nullable: true }),
    __metadata("design:type", Object)
], Ticker.prototype, "lastUpdated", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => recommendation_model_1.Recommendation, (recommendation) => recommendation.ticker),
    __metadata("design:type", Array)
], Ticker.prototype, "recommendations", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => optionChain_model_1.OptionChain, (optionChain) => optionChain.ticker),
    __metadata("design:type", Array)
], Ticker.prototype, "optionChains", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => newsArticle_model_1.NewsArticle, (newsArticle) => newsArticle.ticker),
    __metadata("design:type", Array)
], Ticker.prototype, "newsArticles", void 0);
exports.Ticker = Ticker = __decorate([
    (0, typeorm_1.Entity)('tickers'),
    (0, typeorm_1.Index)(['symbol'], { unique: true }),
    (0, typeorm_1.Index)(['sector']),
    (0, typeorm_1.Index)(['marketCap'])
], Ticker);
//# sourceMappingURL=ticker.model.js.map