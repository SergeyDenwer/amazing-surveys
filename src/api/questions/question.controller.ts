import { Controller, Get } from '@nestjs/common';
import { QuestionsService } from '../../surveys/questions.service';

@Controller('api')
export class QuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
  ) {}

  @Get('get-latest-question')
  getLatestQuestion(): object {
    return this.questionsService.getLatestQuestion()
  }

  @Get('get-questions')
  getQuestions(): object {
    return this.questionsService.getQuestionsWithAnswers()
  }
}