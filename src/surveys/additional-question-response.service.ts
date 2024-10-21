import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {MoreThan, Repository} from 'typeorm';
import { AdditionalQuestionResponse } from './entities/additional-question-response.entity';
import { CreateAdditionalQuestionResponseDto } from './dto/create-additional-question-response.dto';
import { AdditionalQuestions } from '../constants/additional-questions.enum';
import {User} from "../users/entities/user.entity";
import { Response } from './entities/response.entity';

@Injectable()
export class AdditionalQuestionResponseService {
  constructor(
    @InjectRepository(AdditionalQuestionResponse)
    private additionalQuestionResponseRepository: Repository<AdditionalQuestionResponse>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Response)
    private responseRepository: Repository<Response>
  ) {}


  async create(createDto: CreateAdditionalQuestionResponseDto): Promise<AdditionalQuestionResponse> {
    const user = await this.userRepository.findOne({
      where: { id: createDto.user_id }
    });

    const response = createDto.response_id ? await this.responseRepository.findOne({
      where: { id: createDto.response_id }
    }) : null;

    const additionalResponse = new AdditionalQuestionResponse();
    additionalResponse.user = user;
    additionalResponse.question = createDto.question;
    additionalResponse.answer = createDto.answer;
    additionalResponse.response = response;

    return this.additionalQuestionResponseRepository.save(additionalResponse);
  }

  async findRecent(userId: number, question: AdditionalQuestions, withinWeeks: number): Promise<AdditionalQuestionResponse | null> {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - withinWeeks * 7);

    return this.additionalQuestionResponseRepository.findOne({
      where: {
        user: { id: userId },
        question: question,
        created_at: MoreThan(dateThreshold),
      },
    });
  }

  async createResponseWithoutUser(createDto: CreateAdditionalQuestionResponseDto): Promise<AdditionalQuestionResponse> {
    const response = await this.responseRepository.findOne({
      where: { id: createDto.response_id }
    });

    if (!response) {
      throw new Error('Response not found');
    }

    return this.additionalQuestionResponseRepository.save({
      question: createDto.question,
      answer: createDto.answer,
      response: response,
    });
  }
}
