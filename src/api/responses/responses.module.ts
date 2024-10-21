import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Response } from '../../surveys/entities/response.entity';
import { ResponsesController } from './responses.controller';
import { ResponsesService } from '../../surveys/responses.service';
import { UsersModule } from '../../users/users.module';
import { QuestionsModule } from '../../surveys/questions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Response]),
    UsersModule,
    QuestionsModule,
  ],
  controllers: [ResponsesController],
  providers: [ResponsesService]
})
export class ResponsesModuleApi {}
