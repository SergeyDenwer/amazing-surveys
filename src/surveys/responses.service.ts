// src/response/services/response.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from './entities/response.entity';
import { User } from '../users/entities/user.entity';
import { Question } from './entities/question.entity';
import { CreateResponseDto } from './dto/create-response.dto';
import { GenerateImage, Option } from '../utils/imageGenerator';
import {AnswerOptions} from "../constants/answer-options.enum";
import * as moment from 'moment';
import * as path from 'path';

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

  async getUserResponse(userId: number, questionId: number): Promise<Response | null> {
    const response = await this.responseRepository.findOne({
      where: {
        user: { id: userId },
        question: { id: questionId }
      }
    });
    return response || null;
  }

  async findUsersWithoutResponseToLastQuestion(question): Promise<User[]> {
    const subQuery = this.responseRepository
      .createQueryBuilder('response')
      .select('response.user_id')
      .where('response.question_id = :questionId', { questionId: question.id });

    return this.userRepository
      .createQueryBuilder('user')
      .where(`user.id NOT IN (${subQuery.getQuery()})`)
      .andWhere('user.bot_was_blocked = false')
      .setParameters(subQuery.getParameters())
      .getMany();
  }

  async create(createResponseDto: CreateResponseDto): Promise<Response> {
    const user = await this.userRepository.findOne({ where: { id: createResponseDto.user_id } });
    const question = await this.questionRepository.findOne({ where: { id: createResponseDto.question_id } });

    if (!user || !question) {
      throw new Error('User or question not found');
    }

    const newResponse = this.responseRepository.create({
      user: user,
      question: question,
      choice: createResponseDto.choice
    });

    return this.responseRepository.save(newResponse);
  }

  async generateImageForQuestion(questionId: number, fromTelegram: boolean = false, selectedOption: string = null): Promise<{mainImagePath: string, avatarImagePath: string} | void> {
    const question = await this.questionRepository.findOne({ where: { id: questionId } });
    if (!question) {
      throw new Error('Question not found');
    }

    const responses = await this.responseRepository.find({ where: { question: { id: questionId } } });

    const optionsCount = {
      Option1: 0,
      Option2: 0,
      Option3: 0,
      Option4: 0,
      Option5: 0
    };

    responses.forEach(response => {
      if (response.choice && optionsCount.hasOwnProperty(response.choice)) {
        optionsCount[response.choice]++;
      }
    });

    const totalResponses = responses.length;
    const percentage = totalResponses === 0 ? 0 : (
      Math.round(
      (optionsCount.Option1 * 0 + optionsCount.Option2 * 25 + optionsCount.Option3 * 50 + optionsCount.Option4 * 75 + optionsCount.Option5 * 100) / totalResponses) * 10
    ) / 10;

    const options: Option[] = [
      { key: 'Option1', text: AnswerOptions.Option1, percentage: Math.floor((optionsCount.Option1 / totalResponses) * 100) },
      { key: 'Option2', text: AnswerOptions.Option2, percentage: Math.floor((optionsCount.Option2 / totalResponses) * 100) },
      { key: 'Option3', text: AnswerOptions.Option3, percentage: Math.floor((optionsCount.Option3 / totalResponses) * 100) },
      { key: 'Option4', text: AnswerOptions.Option4, percentage: Math.floor((optionsCount.Option4 / totalResponses) * 100) },
      { key: 'Option5', text: AnswerOptions.Option5, percentage: Math.floor((optionsCount.Option5 / totalResponses) * 100) }
    ];

    const generator = new GenerateImage(moment(question.created_at).format('DD.MM.YYYY'), question.question, percentage, options, totalResponses, selectedOption);
    await generator.generateMainImage();
    await generator.generateAvatar();

    if (fromTelegram) {
      const year = moment(question.created_at).year();
      const week = moment(question.created_at).week();
      const mainImageName = (selectedOption ? selectedOption : 'NoOption') + '.png';
      const mainImagePath = path.join(__dirname, '..', '..', '..', 'images', 'results', year.toString(), `${week}`, mainImageName);
      const avatarImagePath = path.join(__dirname, '..', '..', '..', 'images', 'results', year.toString(), `${week}`, 'avatar.png');

      return { mainImagePath, avatarImagePath };
    }
  }

  async createResponseWithoutUser(createResponseDto: CreateResponseDto): Promise<Response> {
    const question = await this.questionRepository.findOne({ where: { id: createResponseDto.question_id } });

    if (!question) {
      throw new Error('Question not found');
    }

    const newResponse = this.responseRepository.create({
      question: question,
      choice: createResponseDto.choice,
    });

    return this.responseRepository.save(newResponse);
  }
}
