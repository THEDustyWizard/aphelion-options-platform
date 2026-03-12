import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('backtest_results')
export class BacktestResult extends BaseEntity {
  @Column()
  recommendationId!: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  simulatedEntryPrice?: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  simulatedExitPrice?: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  simulatedPnl?: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  simulatedPnlPercentage?: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  maxDrawdown?: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  winProbability?: number;

  @Column('timestamptz')
  startDate!: Date;

  @Column('timestamptz')
  endDate!: Date;
}
