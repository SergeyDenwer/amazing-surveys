import { Module } from '@nestjs/common';
import {QuestionsController} from "./question.controller";
import {QuestionsService} from "../../surveys/questions.service";
import {TypeOrmModule} from "@nestjs/typeorm";
import {Question} from "../../surveys/entities/question.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Question])
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService]
})
export class QuestionsModuleApi {}
