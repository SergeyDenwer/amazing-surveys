import { AdditionalQuestions } from '../../constants/additional-questions.enum';
import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn} from 'typeorm';
import { Response } from '../../surveys/entities/response.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ schema: 'bot' })
export class AdditionalQuestionResponse {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: AdditionalQuestions })
  question: AdditionalQuestions;

  @Column()
  answer: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Response, { nullable: true })
  @JoinColumn({ name: 'response_id' })
  response: Response | null;
}

