import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Response } from '../../surveys/entities/response.entity';
import { AdditionalQuestionResponse } from '../../surveys/entities/additional-question-response.entity';
import { ResponsesController } from './responses.controller';
import { ResponsesService } from '../../surveys/responses.service';
import { UsersModule } from '../../users/users.module';
import { QuestionsModule } from '../../surveys/questions.module';
import { AdditionalQuestionResponseService } from '../../surveys/additional-question-response.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Response, AdditionalQuestionResponse]),
    UsersModule,
    QuestionsModule,
  ],
  controllers: [ResponsesController],
  providers: [ResponsesService, AdditionalQuestionResponseService]
})
export class ResponsesModuleApi {}
