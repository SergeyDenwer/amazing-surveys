import { Controller, Get, Query, UnauthorizedException } from '@nestjs/common';
import { QuestionsService } from '../../surveys/questions.service';

@Controller('api')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get('recent-surveyed-news')
  async getRecentSurveyedNews(@Query('token') token: string): Promise<object[]> {
    // Проверяем токен
    const API_TOKEN = process.env.API_TOKEN; // Токен из переменных окружения
    if (token !== API_TOKEN) {
      throw new UnauthorizedException('Invalid API token');
    }

    // Получаем последние 20 вопросов
    const questions = await this.questionsService.getRecentSurveyedQuestions();
    return questions.map((question) => ({
      id: question.id,
      created_at: question.created_at.toISOString(),
      question: question.question,
    }));
  }
}
