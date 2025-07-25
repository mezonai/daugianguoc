import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { TABLE } from '../constants/tables';

@Index(['daugia_id'])
@Entity(TABLE.DAUGIA)
export class Daugia {
  @PrimaryGeneratedColumn()
  daugia_id: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createby_id' })
  createby: User;

  @Column({ nullable: true })
  clan_id: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  startPrice: number;
  @Column({ nullable: true })
  minPrice: number;

  @Column({ nullable: true })
  time: number;
  @Column({ nullable: true })
  stepPrice: number;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  purchase: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @Column({ default: false })
  isDelete: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
