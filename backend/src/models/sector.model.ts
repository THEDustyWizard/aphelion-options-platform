import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('sectors')
export class Sector extends BaseEntity {
  @Column({ length: 50 })
  name!: string;

  @Column({ length: 100, nullable: true })
  description?: string;

  @Column({ length: 10, nullable: true })
  etfSymbol?: string;

  @Column({ default: true })
  active!: boolean;
}
