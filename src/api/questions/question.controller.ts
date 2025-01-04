import { Controller, Get, UnauthorizedException, Headers } from '@nestjs/common';
import {QuestionsService} from "../../surveys/questions.service";
import {ResponsesService} from "../../surveys/responses.service";


@Controller('api')
export class QuestionsController {
  constructor(
      private readonly questionsService: QuestionsService,
      private readonly responsesService: ResponsesService,
  ) {}

  @Get('questions-with-responses')
  async getQuestionsWithResponses(@Headers('Authorization') authHeader: string): Promise<object[]> {
    const API_TOKEN = process.env.API_TOKEN;

    // Проверяем заголовок Authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (token !== API_TOKEN) {
      throw new UnauthorizedException('Invalid API token');
    }

    // Получаем вопросы
    const questions = await this.questionsService.getRecentSurveyedQuestions();
    const result = [];

    // Добавляем ответы для каждого вопроса
    for (const question of questions) {
      const responses = await this.responsesService.getResponseStatistics(question.id);
      result.push({
        question: {
          id: question.id,
          text: question.question,
          created_at: question.created_at,
        },
        responses,
      });
    }

    return result;
  }
}
