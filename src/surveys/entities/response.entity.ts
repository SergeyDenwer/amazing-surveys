// src/response/entities/response.entity.ts
import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
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
    type: 'varchar',   // Тип изменён для сохранения строкового ключа
    nullable: true,    // Позволяет полю быть null
    default: null      // Значение по умолчанию установлено как null
  })
  choice: string;     // Тип поля изменен на string
}
