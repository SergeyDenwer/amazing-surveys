// app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ConfigModule} from "@nestjs/config";
import {TypeOrmModule} from "@nestjs/typeorm";
import {OrmConfig} from "../config/orm-config";
import app from "../config/app";
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramService } from './telegram/telegram.service';
import { Response } from './surveys/entities/response.entity';
import {UsersModule} from "./users/users.module";
import { QuestionsModule } from "./surveys/questions.module";
import {ResponsesService} from "./surveys/responses.service";
import { ScheduleModule } from '@nestjs/schedule';
import {FeedbackModule} from "./feedback/feedback.module";
import { FeedbackSceneCreator} from "./telegram/scenes/feedback.scene";
import {GoSceneCreator} from "./telegram/scenes/go.scene";
import {UsersService} from "./users/users.service";
import {AdditionalQuestionResponseService} from "./surveys/additional-question-response.service";
import {AdditionalQuestionResponse} from "./surveys/entities/additional-question-response.entity";
import { session } from 'telegraf';
import { SessionModule } from './telegram/session.module';
import { QuestionsModuleApi } from './api/questions/questions.module';
import {SessionService} from "./telegram/session.service";
import {TimerService} from "./telegram/timer.service";
import {AdditionalQuestionSceneCreator} from "./telegram/scenes/additional.scene";

@Module({
  imports: [
    FeedbackModule,
    ConfigModule.forRoot({
      load: [app],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: OrmConfig,
    }),
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
    QuestionsModuleApi,
    SessionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    TelegramService,
    ResponsesService,
    FeedbackSceneCreator,
    GoSceneCreator,
    AdditionalQuestionSceneCreator,
    UsersService,
    AdditionalQuestionResponseService,
    OrmConfig,
    SessionService,
    TimerService
  ],
})
export class AppModule {}
