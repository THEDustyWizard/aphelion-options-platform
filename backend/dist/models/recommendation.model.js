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
exports.Recommendation = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const ticker_model_1 = require("./ticker.model");
let Recommendation = class Recommendation extends base_entity_1.BaseEntity {
    ticker;
    tickerId;
    sector;
    confidence; // 0-100
    riskScore; // 0-100 (lower is better)
    strategy;
    direction;
    expirationDays;
    expirationDate;
    strikePrice;
    currentPrice;
    rationale;
    scores;
    riskFactors;
    optionsParameters;
    generatedAt;
    validUntil;
    active;
    executed;
    executedAt;
    executionPrice;
    pnl;
    pnlPercentage;
    backtestData;
    // Helper methods
    isExpired() {
        return new Date() > this.validUntil;
    }
    isProfitable() {
        if (this.pnl === null)
            return null;
        return this.pnl > 0;
    }
    getDaysToExpiration() {
        const now = new Date();
        const diffTime = this.expirationDate.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    getConfidenceLevel() {
        if (this.confidence >= 80)
            return 'high';
        if (this.confidence >= 60)
            return 'medium';
        return 'low';
    }
    getRiskLevel() {
        if (this.riskScore <= 30)
            return 'low';
        if (this.riskScore <= 50)
            return 'medium';
        if (this.riskScore <= 70)
            return 'high';
        return 'extreme';
    }
    getPositionSize(accountSize) {
        // Kelly Criterion variant for position sizing
        const baseAllocation = this.getBaseAllocation();
        const riskAdjustment = this.getRiskAdjustment();
        let positionSize = accountSize * baseAllocation * riskAdjustment;
        // Apply limits
        positionSize = Math.max(1000, Math.min(positionSize, accountSize * 0.1));
        return positionSize;
    }
    getBaseAllocation() {
        if (this.confidence >= 80 && this.riskScore <= 30)
            return 0.05; // 5%
        if (this.confidence >= 70 && this.riskScore <= 40)
            return 0.03; // 3%
        if (this.confidence >= 60 && this.riskScore <= 50)
            return 0.02; // 2%
        return 0.01; // 1%
    }
    getRiskAdjustment() {
        // Adjust for risk concentration
        // In a real implementation, this would check current sector allocations
        return 1.0;
    }
};
exports.Recommendation = Recommendation;
__decorate([
    (0, typeorm_1.ManyToOne)(() => ticker_model_1.Ticker, (ticker) => ticker.recommendations, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: 'tickerId' }),
    __metadata("design:type", ticker_model_1.Ticker)
], Recommendation.prototype, "ticker", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Recommendation.prototype, "tickerId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['defense', 'energy', 'logistics', 'medical']
    }),
    __metadata("design:type", String)
], Recommendation.prototype, "sector", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], Recommendation.prototype, "confidence", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], Recommendation.prototype, "riskScore", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: [
            'Long Call',
            'Long Put',
            'Bull Call Spread',
            'Bear Put Spread',
            'Iron Condor',
            'Strangle',
            'Straddle',
            'Calendar Spread',
            'Diagonal Spread'
        ]
    }),
    __metadata("design:type", String)
], Recommendation.prototype, "strategy", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['bullish', 'mildly_bullish', 'neutral', 'bearish', 'mildly_bearish']
    }),
    __metadata("design:type", String)
], Recommendation.prototype, "direction", void 0);
__decorate([
    (0, typeorm_1.Column)('integer'),
    __metadata("design:type", Number)
], Recommendation.prototype, "expirationDays", void 0);
__decorate([
    (0, typeorm_1.Column)('date'),
    __metadata("design:type", Date)
], Recommendation.prototype, "expirationDate", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Recommendation.prototype, "strikePrice", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], Recommendation.prototype, "currentPrice", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], Recommendation.prototype, "rationale", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb'),
    __metadata("design:type", Object)
], Recommendation.prototype, "scores", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Object)
], Recommendation.prototype, "riskFactors", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Object)
], Recommendation.prototype, "optionsParameters", void 0);
__decorate([
    (0, typeorm_1.Column)('timestamptz'),
    __metadata("design:type", Date)
], Recommendation.prototype, "generatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)('timestamptz'),
    __metadata("design:type", Date)
], Recommendation.prototype, "validUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Recommendation.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Recommendation.prototype, "executed", void 0);
__decorate([
    (0, typeorm_1.Column)('timestamptz', { nullable: true }),
    __metadata("design:type", Object)
], Recommendation.prototype, "executedAt", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], Recommendation.prototype, "executionPrice", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], Recommendation.prototype, "pnl", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], Recommendation.prototype, "pnlPercentage", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Object)
], Recommendation.prototype, "backtestData", void 0);
exports.Recommendation = Recommendation = __decorate([
    (0, typeorm_1.Entity)('recommendations'),
    (0, typeorm_1.Index)(['tickerId', 'generatedAt']),
    (0, typeorm_1.Index)(['confidence']),
    (0, typeorm_1.Index)(['riskScore']),
    (0, typeorm_1.Index)(['strategy']),
    (0, typeorm_1.Index)(['expirationDate'])
], Recommendation);
//# sourceMappingURL=recommendation.model.js.map