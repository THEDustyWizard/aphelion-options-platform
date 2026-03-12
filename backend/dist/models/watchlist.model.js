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
exports.Watchlist = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
let Watchlist = class Watchlist extends base_entity_1.BaseEntity {
    userId;
    name;
    tickers;
    active;
};
exports.Watchlist = Watchlist;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Watchlist.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], Watchlist.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { nullable: true }),
    __metadata("design:type", Array)
], Watchlist.prototype, "tickers", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Watchlist.prototype, "active", void 0);
exports.Watchlist = Watchlist = __decorate([
    (0, typeorm_1.Entity)('watchlists')
], Watchlist);
//# sourceMappingURL=watchlist.model.js.map