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
    // Получение последнего добавленного вопроса
    return this.questionRepository.createQueryBuilder()
      .orderBy('created_at', 'DESC')
      .getOne();
  }
}
