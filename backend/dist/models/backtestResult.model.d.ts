import { BaseEntity } from './base.entity';
export declare class BacktestResult extends BaseEntity {
    recommendationId: string;
    simulatedEntryPrice?: number;
    simulatedExitPrice?: number;
    simulatedPnl?: number;
    simulatedPnlPercentage?: number;
    maxDrawdown?: number;
    winProbability?: number;
    startDate: Date;
    endDate: Date;
}
//# sourceMappingURL=backtestResult.model.d.ts.map