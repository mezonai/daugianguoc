import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { TABLE } from '../constants/tables';

@Index(['botId'])
@Entity(TABLE.WELCOME_MESSAGE)
export class WelcomeMessage {
  @PrimaryColumn()
  botId: string;

  @Column({ type: 'text', nullable: true, default: null })
  content: string;

}
