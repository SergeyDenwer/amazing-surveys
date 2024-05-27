// src/questions/questions.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from './entities/question.entity';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
  ) {}

  async getLatestQuestion(): Promise<Question> {
    return this.questionRepository.createQueryBuilder()
      .orderBy('created_at', 'DESC')
      .getOne();
  }

  async findOne(questionId: number): Promise<Question> {
    return this.questionRepository.findOne({ where: { id: questionId } });
  }
  async getPreviousQuestion(): Promise<Question | undefined> {
    const questions = await this.questionRepository.find({
      order: { created_at: 'DESC' },
      take: 2
    });
    return questions.length > 1 ? questions[1] : undefined;
  }
}
