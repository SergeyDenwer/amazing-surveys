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
}
