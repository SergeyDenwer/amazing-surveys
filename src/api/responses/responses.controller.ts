import { Body, Controller, Post } from '@nestjs/common';
import { CreateResponseDto } from '../../surveys/dto/create-response.dto';
import { ResponsesService } from '../../surveys/responses.service';

@Controller('api')
export class ResponsesController {
  constructor(
    private readonly responsesService: ResponsesService,
  ) {}

  @Post('save-main-answer')
  async saveMainAnswer(@Body() createResponse: CreateResponseDto){
    const newResponse = await this.responsesService.createResponseWithoutUser(createResponse)
    return {
      id: newResponse.id
    }
  }
}