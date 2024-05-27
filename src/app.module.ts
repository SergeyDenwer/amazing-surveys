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
import {QuestionsModule} from "./surveys/questions.module";
import {ResponsesService} from "./surveys/responses.service";
import { ScheduleModule } from '@nestjs/schedule';
import {FeedbackModule} from "./feedback/feedback.module";
import { FeedbackSceneCreator} from "./telegram/scenes/feedback.scene";
import * as LocalSession from 'telegraf-session-local'
import {GoSceneCreator} from "./telegram/scenes/go.scene";
import {UsersService} from "./users/users.service";
import {AdditionalQuestionResponseService} from "./surveys/additional-question-response.service";
import {AdditionalQuestionResponse} from "./surveys/entities/additional-question-response.entity";

const session = new LocalSession()

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
    TelegrafModule.forRoot({
      middlewares: [session.middleware()],
      token: process.env.TELEGRAM_BOT_TOKEN
    }),
    ScheduleModule.forRoot(),
    UsersModule,
    QuestionsModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    TelegramService,
    ResponsesService,
    FeedbackSceneCreator,
    GoSceneCreator,
    UsersService,
    AdditionalQuestionResponseService
  ],
})
export class AppModule {}
