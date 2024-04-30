// src/response/services/response.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from './entities/response.entity';
import { User } from '../users/entities/user.entity';
import { Question } from './entities/question.entity';
import { CreateResponseDto } from './dto/create-response.dto';

@Injectable()
export class ResponsesService {
  constructor(
    @InjectRepository(Response)
    private responseRepository: Repository<Response>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>
  ) {}

  async hasUserAlreadyResponded(userId: number, questionId: number): Promise<boolean> {
    const count = await this.responseRepository.count({
      where: {
        user: { id: userId },
        question: { id: questionId }
      }
    });
    return count > 0;
  }

  async create(createResponseDto: CreateResponseDto): Promise<Response> {
    const user = await this.userRepository.findOne({ where: { id: createResponseDto.user_id } });
    const question = await this.questionRepository.findOne({ where: { id: createResponseDto.question_id } });

    if (!user || !question) {
      throw new Error('User or question not found');
    }

    const newResponse = this.responseRepository.create({
      user: user, // Используйте объект, а не ID
      question: question,
      choice: createResponseDto.choice
    });

    return this.responseRepository.save(newResponse);
  }
}
