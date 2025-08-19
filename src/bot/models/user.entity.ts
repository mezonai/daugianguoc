import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { TABLE } from '../constants/tables';

@Index([
  'user_id',
  'username',
  'last_message_id',
  'last_bot_message_id',
  'deactive',
  'botPing',
])
@Entity(TABLE.USER)
export class User {
  @PrimaryColumn()
  user_id: string;

  @Column({ type: 'text', nullable: true })
  username: string;

  @Column({ type: 'text', nullable: true, name: 'display_name' })
  display_name: string;

  @Column({ type: 'text', nullable: true })
  clan_nick: string;

  @Column({ type: 'text', nullable: true })
  avatar: string;

  @Column({ nullable: true })
  bot: boolean;

  @Column({ type: 'text', nullable: true })
  last_message_id: string;

  @Column({
    type: 'numeric',
    nullable: true,
    transformer: {
      to: (value: number) => value,
      from: (value: string | null) => (value === null ? null : Number(value)),
    },
  })
  last_message_time: number;

  @Column({ type: 'text', nullable: true })
  last_mentioned_message_id: string;

  @Column({ default: 0 })
  scores_quiz: number;

  @Column('text', { array: true, nullable: true })
  roles: string[];

  @Column({ type: 'text', nullable: true })
  last_bot_message_id: string;

  @Column({ nullable: true, default: false })
  deactive: boolean;

  @Column({ default: false })
  botPing: boolean;

  @Column({ default: true })
  buzzDaily: boolean;

  @Column({ default: true })
  buzzNcc8: boolean;

  @Column({
    type: 'numeric',
    nullable: true,
    transformer: {
      to: (value: number) => value,
      from: (value: string | null) => (value === null ? null : Number(value)),
    },
  })
  createdAt: number;

  @Column({
    type: 'numeric',
    nullable: true,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | null) => (value === null ? 0 : Number(value)),
    },
  })
  amount: number;

  @Column({
    type: 'numeric',
    nullable: true,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | null) => (value === null ? 0 : Number(value)),
    },
  })
  amountUsedSlots: number;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  roleClan: {
    [clanId: string]: {
      roles: {
        roleId: string;
        maxLevelPermission: number;
      }[];
      roleMax?: string;
    };
  };
  @Column({ type: 'jsonb', nullable: true, default: {} })
  whitelist: {
    [clanId: string]: string[];
  };

  @Column({ type: 'jsonb', nullable: true, default: {} })
  invitor: {
    [clanId: string]: string;
  };

  @Column({ type: 'jsonb', nullable: true, default: [] })
  ban: {
    type: string;
    unBanTime: number;
    note: string;
  }[];
}
