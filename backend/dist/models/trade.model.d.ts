import { BaseEntity } from './base.entity';
export declare class Trade extends BaseEntity {
    userId: string;
    symbol: string;
    action: string;
    quantity: number;
    price: number;
    commission?: number;
    executedAt: Date;
    recommendationId?: string;
}
//# sourceMappingURL=trade.model.d.ts.map