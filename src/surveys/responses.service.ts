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
      user: user,
      question: question,
      choice: createResponseDto.choice
    });

    return this.responseRepository.save(newResponse);
  }

  async generateImageForQuestion(questionId: number, fromTelegram: boolean = false): Promise<{mainImagePath: string, avatarImagePath: string} | void> {
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
      { text:  AnswerOptions.Option1, percentage: Math.round((optionsCount.Option1 / totalResponses) * 100 * 10) / 10 },
      { text:  AnswerOptions.Option2, percentage: Math.round((optionsCount.Option2 / totalResponses) * 100 * 10) / 10 },
      { text:  AnswerOptions.Option3, percentage: Math.round((optionsCount.Option3 / totalResponses) * 100 * 10) / 10 },
      { text:  AnswerOptions.Option4, percentage: Math.round((optionsCount.Option4 / totalResponses) * 100 * 10) / 10 },
      { text:  AnswerOptions.Option5, percentage: Math.round((optionsCount.Option5 / totalResponses) * 100 * 10) / 10 }
    ];

    const generator = new GenerateImage(moment(question.created_at).format('DD.MM.YYYY'), question.question, percentage, this.getPercentTexts(), options, totalResponses);
    await generator.generateMainImage();
    await generator.generateAvatar();

    const year = moment(question.created_at).year();
    const week = moment(question.created_at).week();

    const mainImagePath = path.join(__dirname, '..', '..', '..', 'images', 'results', year.toString(), `${week}`, 'result.png');
    const avatarImagePath = path.join(__dirname, '..', '..', '..', 'images', 'results', year.toString(), `${week}`, 'avatar.png');
    if (fromTelegram) {
      return { mainImagePath, avatarImagePath };
    }
  }

  private getPercentTexts(): Option[] {
    return [
      { text: 'АБСОЛЮТНОЕ СПОКОЙСТВИЕ', percentage: 20 },
      { text: 'ЛЕГКОЕ ВОЛНЕНИЕ', percentage: 40 },
      { text: 'УМЕРЕННЫЙ СТРЕСС', percentage: 60 },
      { text: 'ВЫСОКАЯ НАПРЯЖЕННОСТЬ', percentage: 80 },
      { text: 'ПОЛНЫЙ ПИЗДЕЦ', percentage: 100 }
    ];
  }
}
