import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('watchlists')
export class Watchlist extends BaseEntity {
  @Column()
  userId!: string;

  @Column({ length: 100 })
  name!: string;

  @Column('simple-array', { nullable: true })
  tickers?: string[];

  @Column({ default: true })
  active!: boolean;
}
