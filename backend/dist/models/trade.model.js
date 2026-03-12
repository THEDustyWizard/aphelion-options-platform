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
exports.Trade = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
let Trade = class Trade extends base_entity_1.BaseEntity {
    userId;
    symbol;
    action;
    quantity;
    price;
    commission;
    executedAt;
    recommendationId;
};
exports.Trade = Trade;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Trade.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 10 }),
    __metadata("design:type", String)
], Trade.prototype, "symbol", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['buy', 'sell', 'buy_to_open', 'sell_to_close', 'buy_to_close', 'sell_to_open']
    }),
    __metadata("design:type", String)
], Trade.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)('integer'),
    __metadata("design:type", Number)
], Trade.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Trade.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Trade.prototype, "commission", void 0);
__decorate([
    (0, typeorm_1.Column)('timestamptz'),
    __metadata("design:type", Date)
], Trade.prototype, "executedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Trade.prototype, "recommendationId", void 0);
exports.Trade = Trade = __decorate([
    (0, typeorm_1.Entity)('trades')
], Trade);
//# sourceMappingURL=trade.model.js.map