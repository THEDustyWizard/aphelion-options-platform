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
exports.NewsArticle = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const ticker_model_1 = require("./ticker.model");
let NewsArticle = class NewsArticle extends base_entity_1.BaseEntity {
    ticker;
    tickerId;
    title;
    description;
    content;
    url;
    source;
    publishedAt;
    sentiment;
    tickers;
    sector;
};
exports.NewsArticle = NewsArticle;
__decorate([
    (0, typeorm_1.ManyToOne)(() => ticker_model_1.Ticker, (ticker) => ticker.newsArticles, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'tickerId' }),
    __metadata("design:type", ticker_model_1.Ticker)
], NewsArticle.prototype, "ticker", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], NewsArticle.prototype, "tickerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 500 }),
    __metadata("design:type", String)
], NewsArticle.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], NewsArticle.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], NewsArticle.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 1000 }),
    __metadata("design:type", String)
], NewsArticle.prototype, "url", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], NewsArticle.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)('timestamptz'),
    __metadata("design:type", Date)
], NewsArticle.prototype, "publishedAt", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 4, scale: 3, nullable: true }),
    __metadata("design:type", Number)
], NewsArticle.prototype, "sentiment", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { nullable: true }),
    __metadata("design:type", Array)
], NewsArticle.prototype, "tickers", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, nullable: true }),
    __metadata("design:type", String)
], NewsArticle.prototype, "sector", void 0);
exports.NewsArticle = NewsArticle = __decorate([
    (0, typeorm_1.Entity)('news_articles')
], NewsArticle);
//# sourceMappingURL=newsArticle.model.js.map