import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('users')
@Index(['email'], { unique: true })
export class User extends BaseEntity {
  @Column({ length: 255 })
  email!: string;

  @Column({ length: 255 })
  passwordHash!: string;

  @Column({ length: 100, nullable: true })
  firstName?: string;

  @Column({ length: 100, nullable: true })
  lastName?: string;

  @Column({
    type: 'enum',
    enum: ['user', 'admin'],
    default: 'user'
  })
  role!: string;

  @Column({ default: true })
  active!: boolean;

  @Column('timestamptz', { nullable: true })
  lastLoginAt?: Date;
}
