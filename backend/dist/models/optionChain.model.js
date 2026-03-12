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
exports.OptionChain = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const ticker_model_1 = require("./ticker.model");
let OptionChain = class OptionChain extends base_entity_1.BaseEntity {
    ticker;
    tickerId;
    expiration;
    underlyingPrice;
    impliedVolatility;
    calls;
    puts;
    greeks;
    volumeAnalysis;
    openInterestAnalysis;
    active;
    // Helper methods
    getDaysToExpiration() {
        const now = new Date();
        const diffTime = this.expiration.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    getAtTheMoneyStrike() {
        const strikes = [...this.calls, ...this.puts].map(opt => opt.strike);
        const underlying = this.underlyingPrice;
        // Find strike closest to underlying price
        return strikes.reduce((prev, curr) => {
            return Math.abs(curr - underlying) < Math.abs(prev - underlying) ? curr : prev;
        });
    }
    getStrikeRange() {
        const strikes = [...this.calls, ...this.puts].map(opt => opt.strike);
        return {
            min: Math.min(...strikes),
            max: Math.max(...strikes)
        };
    }
    getOptionByStrike(strike, type) {
        const options = type === 'call' ? this.calls : this.puts;
        return options.find(opt => opt.strike === strike) || null;
    }
    getVolumeSkew() {
        if (!this.volumeAnalysis)
            return 0;
        return this.volumeAnalysis.callPutRatio - 1;
    }
    getOpenInterestSkew() {
        if (!this.openInterestAnalysis)
            return 0;
        return this.openInterestAnalysis.putCallRatio - 1;
    }
    getLiquidityScore() {
        // Score based on bid-ask spreads and volume
        let totalScore = 0;
        let count = 0;
        [...this.calls, ...this.puts].forEach(option => {
            if (option.bid > 0 && option.ask > 0) {
                const spreadPercent = option.bidAskSpread / option.midPrice;
                let spreadScore = 100;
                if (spreadPercent > 0.1)
                    spreadScore = 20;
                else if (spreadPercent > 0.05)
                    spreadScore = 40;
                else if (spreadPercent > 0.02)
                    spreadScore = 60;
                else if (spreadPercent > 0.01)
                    spreadScore = 80;
                totalScore += spreadScore;
                count++;
            }
        });
        return count > 0 ? totalScore / count : 0;
    }
    findBestSpread(type, maxWidthPercent = 0.1) {
        const underlying = this.underlyingPrice;
        const maxWidth = underlying * maxWidthPercent;
        if (type === 'bull') {
            // Bull call spread: buy lower strike call, sell higher strike call
            const callsSorted = [...this.calls].sort((a, b) => a.strike - b.strike);
            for (let i = 0; i < callsSorted.length - 1; i++) {
                const longCall = callsSorted[i];
                const shortCall = callsSorted[i + 1];
                const width = shortCall.strike - longCall.strike;
                if (width <= maxWidth && longCall.ask > 0 && shortCall.bid > 0) {
                    const debit = longCall.ask - shortCall.bid;
                    if (debit < width) { // Positive expected value
                        return {
                            long: longCall,
                            short: shortCall,
                            width,
                            credit: -debit // Negative debit = credit
                        };
                    }
                }
            }
        }
        else if (type === 'bear') {
            // Bear put spread: buy higher strike put, sell lower strike put
            const putsSorted = [...this.puts].sort((a, b) => b.strike - a.strike);
            for (let i = 0; i < putsSorted.length - 1; i++) {
                const longPut = putsSorted[i];
                const shortPut = putsSorted[i + 1];
                const width = longPut.strike - shortPut.strike;
                if (width <= maxWidth && longPut.ask > 0 && shortPut.bid > 0) {
                    const debit = longPut.ask - shortPut.bid;
                    if (debit < width) {
                        return {
                            long: longPut,
                            short: shortPut,
                            width,
                            credit: -debit
                        };
                    }
                }
            }
        }
        else if (type === 'neutral') {
            // Iron condor: sell OTM call spread + sell OTM put spread
            // Simplified version - in production would be more sophisticated
            const atmStrike = this.getAtTheMoneyStrike();
            const otmCalls = this.calls.filter(c => c.strike > atmStrike);
            const otmPuts = this.puts.filter(p => p.strike < atmStrike);
            if (otmCalls.length >= 2 && otmPuts.length >= 2) {
                // Find call spread
                const callSpread = this.findBestSpread('bull', maxWidthPercent);
                const putSpread = this.findBestSpread('bear', maxWidthPercent);
                if (callSpread && putSpread) {
                    return {
                        long: null, // Iron condor has no long legs
                        short: { callSpread, putSpread },
                        width: callSpread.width + putSpread.width,
                        credit: callSpread.credit + putSpread.credit
                    };
                }
            }
        }
        return null;
    }
};
exports.OptionChain = OptionChain;
__decorate([
    (0, typeorm_1.ManyToOne)(() => ticker_model_1.Ticker, (ticker) => ticker.optionChains, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: 'tickerId' }),
    __metadata("design:type", ticker_model_1.Ticker)
], OptionChain.prototype, "ticker", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OptionChain.prototype, "tickerId", void 0);
__decorate([
    (0, typeorm_1.Column)('date'),
    __metadata("design:type", Date)
], OptionChain.prototype, "expiration", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], OptionChain.prototype, "underlyingPrice", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], OptionChain.prototype, "impliedVolatility", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb'),
    __metadata("design:type", Array)
], OptionChain.prototype, "calls", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb'),
    __metadata("design:type", Array)
], OptionChain.prototype, "puts", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Object)
], OptionChain.prototype, "greeks", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Object)
], OptionChain.prototype, "volumeAnalysis", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Object)
], OptionChain.prototype, "openInterestAnalysis", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], OptionChain.prototype, "active", void 0);
exports.OptionChain = OptionChain = __decorate([
    (0, typeorm_1.Entity)('option_chains'),
    (0, typeorm_1.Index)(['tickerId', 'expiration']),
    (0, typeorm_1.Index)(['updatedAt'])
], OptionChain);
//# sourceMappingURL=optionChain.model.js.map