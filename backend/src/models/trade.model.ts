import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('trades')
export class Trade extends BaseEntity {
  @Column()
  userId!: string;

  @Column({ length: 10 })
  symbol!: string;

  @Column({
    type: 'enum',
    enum: ['buy', 'sell', 'buy_to_open', 'sell_to_close', 'buy_to_close', 'sell_to_open']
  })
  action!: string;

  @Column('integer')
  quantity!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  price!: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  commission?: number;

  @Column('timestamptz')
  executedAt!: Date;

  @Column({ nullable: true })
  recommendationId?: string;
}
