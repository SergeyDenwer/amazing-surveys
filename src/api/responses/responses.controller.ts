import { Body, Controller, Post } from '@nestjs/common';
import { CreateResponseDto } from '../../surveys/dto/create-response.dto';
import { ResponsesService } from '../../surveys/responses.service';
import { CreateAdditionalQuestionResponseDto } from '../../surveys/dto/create-additional-question-response.dto';
import { AdditionalQuestionResponseService } from '../../surveys/additional-question-response.service';

@Controller('api')
export class ResponsesController {
  constructor(
    private readonly responsesService: ResponsesService,
    private readonly additionalQuestionResponseService: AdditionalQuestionResponseService
  ) {}

  @Post('save-main-answer')
  async saveMainAnswer(@Body() createResponse: CreateResponseDto){
    const newResponse = await this.responsesService.createResponseWithoutUser(createResponse)
    return {
      id: newResponse.id
    }
  }

  @Post('save-additional-answer')
  async saveAdditionalAnswer(@Body() createAdditionalResponse: CreateAdditionalQuestionResponseDto){
    const newResponse = await this.additionalQuestionResponseService.createResponseWithoutUser(createAdditionalResponse)
    return {
      id: newResponse.id
    }
  }
}