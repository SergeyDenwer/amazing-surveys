import { Controller, Get, UnauthorizedException, Headers } from '@nestjs/common';
import { QuestionsService } from '../../surveys/questions.service';

@Controller('api')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get('recent-surveyed-news')
  async getRecentSurveyedNews(@Headers('Authorization') authHeader: string): Promise<object[]> {
    const API_TOKEN = process.env.API_TOKEN;
    const token = authHeader?.split(' ')[1];
    if (token !== API_TOKEN) {
      throw new UnauthorizedException('Invalid API token');
    }

    return this.questionsService.getRecentSurveyedQuestions();
  }

}
