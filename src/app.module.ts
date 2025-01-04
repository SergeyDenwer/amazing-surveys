import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { QuestionsModule } from './surveys/questions.module';
import { TelegramModule } from './telegram/telegram.module';
import app from '../config/app';
import { OrmConfig } from '../config/orm-config';
import {QuestionsModuleApi} from "./api/questions/questions.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [app],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: OrmConfig,
    }),
    ScheduleModule.forRoot(),
    UsersModule,
    QuestionsModule,
    TelegramModule,
    QuestionsModuleApi
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
