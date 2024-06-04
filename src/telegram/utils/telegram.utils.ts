import { Markup } from 'telegraf';
import * as moment from 'moment';
import * as fs from "node:fs";
import { messages } from "../../messages";
import { SceneContext } from "telegraf/scenes";
import { UsersService } from "../../users/users.service";
import { ResponsesService } from "../../surveys/responses.service";
import { SessionService } from '../services/session.service';
import {User} from "../../users/entities/user.entity";
import {AdditionalQuestions} from "../../constants/additional-questions.enum";
import {additionalQuestionsConfig} from "../../../config/additional-questions-config";
import {AdditionalQuestionResponseService} from "../../surveys/additional-question-response.service";
import axios from "axios";
import { ConfigService } from '@nestjs/config';
import {Injectable} from "@nestjs/common";

const activeTimers: Map<number, NodeJS.Timeout> = new Map();
@Injectable()
export class TelegramUtils {
  private readonly isDevEnvironment: boolean;
  private readonly gaMeasurementId: string;
  private readonly gaApiSecret: string;
  constructor(
    private readonly usersService: UsersService,
    private readonly responsesService: ResponsesService,
    private readonly sessionService: SessionService,
    private additionalQuestionResponseService: AdditionalQuestionResponseService,
    private readonly configService: ConfigService,
  ) {
    this.isDevEnvironment = this.configService.get<string>('environment') === 'dev';
    this.gaMeasurementId = this.configService.get<string>('googleAnalytics.measurementId');
    this.gaApiSecret = this.configService.get<string>('googleAnalytics.apiSecret');
  }

  async getEnumKeyboard(enumObj: Record<string, string>) {
    const keyboard = Object.values(enumObj).map(option => [{ text: option }]);
    return Markup.keyboard(keyboard).oneTime();
  }

  getEnumKeyByValue(enumObj: { [s: string]: string }, value: string): string | null {
    return Object.entries(enumObj).find(([, val]) => val === value)?.[0] ?? null;
  }

  async handleInvalidResponse(ctx: SceneContext) {
    await ctx.reply(messages.invalidResponse);
    this.setTimer(ctx);
  }

  async getOrCreateUser(ctx: SceneContext) {
    const createUserDto = {
      telegram_id: ctx.from.id,
      chat_id: ctx.chat.id,
      is_bot: ctx.from.is_bot,
      language_code: ctx.from.language_code,
    };
    return this.usersService.getOrCreateUser(createUserDto);
  }

  async getImage(name: string, questionId: number, date: Date) {
    const year = moment(date).year();
    const week = moment(date).week();
    const path = require('path');
    const imagePath = path.join(__dirname, '..', '..', '..', '..', 'images', 'results', year.toString(), `${week}`, name);

    if (fs.existsSync(imagePath)) {
      console.log('Return existing image')
      return imagePath;
    }

    const generatedImages = await this.responsesService.generateImageForQuestion(questionId, true);
    if (generatedImages) {
      return generatedImages.mainImagePath;
    }

    throw new Error('Image generation failed');
  }

  async checkAvailableQuestions(user: User): Promise<AdditionalQuestions | false> {
    for (const questionKey of Object.values(AdditionalQuestions)) {
      const recentResponse = await this.additionalQuestionResponseService.findRecent(
        user.id,
        questionKey,
        additionalQuestionsConfig[questionKey].expiresIn
      );

      if (!recentResponse) {
        return questionKey as AdditionalQuestions;
      }
    }
    return false;
  }

  setTimer(ctx: SceneContext) {
    this.clearTimer(ctx);
    const timeoutId = setTimeout(async () => {
      await ctx.reply(messages.timeoutMessage, Markup.removeKeyboard());
      await ctx.scene.leave();
      await this.sessionService.resetSession(ctx.chat.id);
      activeTimers.delete(ctx.chat.id);
      await this.sendToGoogleAnalytics(ctx.chat.id, 'timeout');
    }, this.isDevEnvironment ? 30000 : 600000);
    activeTimers.set(ctx.chat.id, timeoutId);
    this.sendToGoogleAnalytics(ctx.chat.id, 'set_timer');
  }

  clearTimer(ctx: SceneContext) {
    const timeoutId = activeTimers.get(ctx.chat.id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      activeTimers.delete(ctx.chat.id);
      this.sendToGoogleAnalytics(ctx.chat.id, 'clear_timer');
    }
  }

  async sendToGoogleAnalytics(userId: number, eventName: string, eventParams: any = {}) {
    const GA_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

    const payload = {
      client_id: userId.toString(),
      events: [
        {
          name: eventName,
          params: {
            ...eventParams,
            user_id: userId.toString(),
            debug_mode: this.isDevEnvironment ? 'true' : 'false'
          }
        }
      ]
    };

    try {
      await axios.post(`${GA_ENDPOINT}?measurement_id=${this.gaMeasurementId}&api_secret=${this.gaApiSecret}`, payload);
      console.log(userId.toString(), eventName, eventParams, this.isDevEnvironment ? 'development' : 'production');
    } catch (error) {
      console.error('Error sending data to Google Analytics:', error);
    }
  }

}
