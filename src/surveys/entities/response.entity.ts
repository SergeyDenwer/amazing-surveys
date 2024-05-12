// src/response/entities/response.entity.ts
import {Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, CreateDateColumn} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Question } from './question.entity';

@Entity()
export class Response {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Question)
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column({
    type: 'varchar',
    nullable: true,
    default: null
  })
  choice: string;

  @CreateDateColumn()
  created_at: Date;
}
