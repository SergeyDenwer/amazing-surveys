//user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  telegram_id: number;

  @Column({ type: 'bigint' })
  chat_id: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ default: false })
  is_bot: boolean;

  @Column({ nullable: true })
  language_code: string;

  @Column({ default: false })
  bot_was_blocked: boolean;
}
