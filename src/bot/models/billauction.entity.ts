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
import { Daugia } from './daugia.entity';

@Index(['billauction_id'])
@Entity(TABLE.BILLAUCTION)
export class BillAuction {
  @PrimaryGeneratedColumn()
  billauction_id: number;

  @ManyToOne(() => Daugia, { nullable: true })
  @JoinColumn({ name: 'auction_id' })
  auction: Daugia;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userAuction_id' })
  userAuction: User;

  @Column({ nullable: true })
  blockMount: number;

  @Column({ default: false })
  isDelete: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
