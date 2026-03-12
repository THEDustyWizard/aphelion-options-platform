import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Ticker } from './ticker.model';

@Entity('news_articles')
export class NewsArticle extends BaseEntity {
  @ManyToOne(() => Ticker, (ticker) => ticker.newsArticles, { nullable: true })
  @JoinColumn({ name: 'tickerId' })
  ticker?: Ticker;

  @Column({ nullable: true })
  tickerId?: string;

  @Column({ length: 500 })
  title!: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('text', { nullable: true })
  content?: string;

  @Column({ length: 1000 })
  url!: string;

  @Column({ length: 100 })
  source!: string;

  @Column('timestamptz')
  publishedAt!: Date;

  @Column('decimal', { precision: 4, scale: 3, nullable: true })
  sentiment?: number;

  @Column('simple-array', { nullable: true })
  tickers?: string[];

  @Column({ length: 50, nullable: true })
  sector?: string;
}
