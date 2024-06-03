import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegrafModule } from 'nestjs-telegraf';
import { ScheduleModule } from '@nestjs/schedule';
import { Response } from '../surveys/entities/response.entity';
import { AdditionalQuestionResponse } from '../surveys/entities/additional-question-response.entity';
import { SessionModule } from './session.module';
import { TelegramService } from './services/telegram.service';
import { SessionService } from './services/session.service';
import { AdditionalQuestionSceneCreator } from './scenes/additional.scene';
import { FeedbackSceneCreator } from './scenes/feedback.scene';
import { GoSceneCreator } from './scenes/go.scene';
import { UsersModule } from '../users/users.module';
import { QuestionsModule } from '../surveys/questions.module';
import { TelegramUtils } from './utils/telegram.utils';
import { OrmConfig } from '../../config/orm-config';
import {session} from "telegraf";
import {ResponsesService} from "../surveys/responses.service";
import {UsersService} from "../users/users.service";
import {QuestionsService} from "../surveys/questions.service";
import {AdditionalQuestionResponseService} from "../surveys/additional-question-response.service";
import {FeedbackModule} from "../feedback/feedback.module";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Response, AdditionalQuestionResponse]),
    TelegrafModule.forRootAsync({
      imports: [SessionModule],
      useFactory: (sessionStore: any) => ({
        middlewares: [session({ store: sessionStore })],
        token: process.env.TELEGRAM_BOT_TOKEN,
      }),
      inject: ['SESSION_STORE'],
    }),
    ScheduleModule.forRoot(),
    UsersModule,
    QuestionsModule,
    SessionModule,
    FeedbackModule
  ],
  providers: [
    TelegramService,
    SessionService,
    ResponsesService,
    UsersService,
    QuestionsService,
    AdditionalQuestionSceneCreator,
    AdditionalQuestionResponseService,
    FeedbackSceneCreator,
    GoSceneCreator,
    TelegramUtils,
    OrmConfig,
  ],
})
export class TelegramModule {}
