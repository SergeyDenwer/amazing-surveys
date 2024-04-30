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

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [app],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: OrmConfig,
    }),
    TypeOrmModule.forFeature([Response]),
    TelegrafModule.forRoot({
      token: process.env.TELEGRAM_BOT_TOKEN
    }),
    ScheduleModule.forRoot(),
    UsersModule,
    QuestionsModule
  ],
  controllers: [AppController],
  providers: [AppService, TelegramService, ResponsesService],
})
export class AppModule {}
