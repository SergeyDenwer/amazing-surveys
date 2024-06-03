// src/questions/questions.module.ts
import { Module } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from './entities/question.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Question])],
  providers: [QuestionsService],
  exports: [QuestionsService, TypeOrmModule.forFeature([Question])]
})
export class QuestionsModule {}
