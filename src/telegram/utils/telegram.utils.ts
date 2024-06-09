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
import {Ctx} from "nestjs-telegraf";
import {SessionState} from "../session-state.interface";
import {QuestionsService} from "../../surveys/questions.service";

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
    private questionsService: QuestionsService,
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

  async getImage(selectedOption: string = null, questionId: number, date: Date) {
    const imageName = (selectedOption ? selectedOption : 'NoOption')  + '.png';
    const year = moment(date).year();
    const week = moment(date).week();
    const path = require('path');
    const imagePath = path.join(__dirname, '..', '..', '..', '..', 'images', 'results', year.toString(), `${week}`, imageName);

    if (fs.existsSync(imagePath)) {
      console.log('Return existing image')
      return imagePath;
    }

    const generatedImages = await this.responsesService.generateImageForQuestion(questionId, true, selectedOption);
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
            engagement_time_msec: 100,
            session_id: userId.toString()
          }
        }
      ]
    };

    try {
      await axios.post(`${GA_ENDPOINT}?measurement_id=${this.gaMeasurementId}&api_secret=${this.gaApiSecret}`, payload);
      console.log(userId, eventName, JSON.stringify(eventParams));
    } catch (error) {
      console.error('Error sending data to Google Analytics:', error);
    }
  }

  async generatePictures(@Ctx() ctx: SceneContext<SessionState>) {
    const allowedUserIds = [368397946, 6747384, 152816106];
    const userId = ctx.from.id;
    if (!allowedUserIds.includes(userId)) {
      return;
    }

    const { text } = ctx;
    const match = text.match(/ID: (\d+)(?:\s+(\w+))?/);
    if (!match) {
      await ctx.reply("Please provide a valid question ID in the format 'ID: [number] [optional option]'.");
      return;
    }

    const questionId = parseInt(match[1], 10);
    const selectedOption = match[2] || null;
    const question = await this.questionsService.findOne(questionId);
    if (!question) {
      await ctx.reply("No question found with the provided ID.");
      return;
    }

    const imagePaths = await this.responsesService.generateImageForQuestion(question.id, true, selectedOption);
    if (imagePaths) {
      const { mainImagePath, avatarImagePath } = imagePaths;
      await ctx.replyWithPhoto({ source: mainImagePath });
      await ctx.replyWithPhoto({ source: avatarImagePath });
    } else {
      await ctx.reply("Failed to generate images.");
    }
  }

}
