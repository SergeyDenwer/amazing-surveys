import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsController } from './question.controller';
import { QuestionsService } from '../../surveys/questions.service';
import { ResponsesService } from '../../surveys/responses.service';
import { Question } from '../../surveys/entities/question.entity';
import {User} from "../../users/entities/user.entity";
import { Response } from '../../surveys/entities/response.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([Question, Response, User]), // Регистрируем все сущности
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService, ResponsesService], // Добавляем оба сервиса
})
export class QuestionsModuleApi {}
