import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { TABLE } from '../constants/tables';

@Index(['id', 'deleted'])
@Entity(TABLE.BLOCK_RUT)
export class BlockRut {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, default: false })
  block: boolean;

  @Column({ nullable: true, default: false })
  deleted: boolean;
}
