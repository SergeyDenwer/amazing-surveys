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

const activeTimers: Map<number, NodeJS.Timeout> = new Map();

export class TelegramUtils {
  constructor(
    private readonly usersService: UsersService,
    private readonly responsesService: ResponsesService,
    private readonly sessionService: SessionService,
    private additionalQuestionResponseService: AdditionalQuestionResponseService,
  ) {}

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
    const imagePath = path.join(__dirname, '..', '..', 'images', 'results', year.toString(), `${week}`, name);

    if (fs.existsSync(imagePath)) {
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
      await this.sessionService.resetSession(String(ctx.chat.id));
      activeTimers.delete(ctx.chat.id);
    }, 600000);
    activeTimers.set(ctx.chat.id, timeoutId);
  }

  clearTimer(ctx: SceneContext) {
    const timeoutId = activeTimers.get(ctx.chat.id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      activeTimers.delete(ctx.chat.id);
    }
  }
}
