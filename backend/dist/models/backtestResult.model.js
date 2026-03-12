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
exports.BacktestResult = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
let BacktestResult = class BacktestResult extends base_entity_1.BaseEntity {
    recommendationId;
    simulatedEntryPrice;
    simulatedExitPrice;
    simulatedPnl;
    simulatedPnlPercentage;
    maxDrawdown;
    winProbability;
    startDate;
    endDate;
};
exports.BacktestResult = BacktestResult;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BacktestResult.prototype, "recommendationId", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], BacktestResult.prototype, "simulatedEntryPrice", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], BacktestResult.prototype, "simulatedExitPrice", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], BacktestResult.prototype, "simulatedPnl", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], BacktestResult.prototype, "simulatedPnlPercentage", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], BacktestResult.prototype, "maxDrawdown", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], BacktestResult.prototype, "winProbability", void 0);
__decorate([
    (0, typeorm_1.Column)('timestamptz'),
    __metadata("design:type", Date)
], BacktestResult.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)('timestamptz'),
    __metadata("design:type", Date)
], BacktestResult.prototype, "endDate", void 0);
exports.BacktestResult = BacktestResult = __decorate([
    (0, typeorm_1.Entity)('backtest_results')
], BacktestResult);
//# sourceMappingURL=backtestResult.model.js.map