import { Injectable } from "@nestjs/common";
import { Update, Ctx, Start, Help, Command, InjectBot, On } from 'nestjs-telegraf';
import { Context, Telegraf, Markup } from 'telegraf';
import { Cron } from "@nestjs/schedule";
import { messages } from "../messages";
import { SceneContext } from "telegraf/scenes";
import { UsersService } from "../users/users.service";
import { QuestionsService } from "../surveys/questions.service";
import { AnswerOptions } from "../constants/answer-options.enum";
import { ResponsesService } from "../surveys/responses.service";
import { SessionService } from './session.service';
import { TimerService } from "./timer.service";
import { User } from "../users/entities/user.entity";
import * as fs from "node:fs";
import * as moment from 'moment';

@Update()
@Injectable()
export class TelegramService {
  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly usersService: UsersService,
    private questionsService: QuestionsService,
    private responsesService: ResponsesService,
    private readonly sessionService: SessionService,
    private readonly timerService: TimerService,
  ) {}

  @Start()
  async start(@Ctx() ctx: Context) {
    await ctx.reply(messages.startMessage);
  }

  @Help()
  async help(@Ctx() ctx: Context) {
    await ctx.reply(messages.helpResponse);
  }

  @Command('go')
  async getQuestion(@Ctx() ctx: SceneContext) {
    await ctx.scene.enter('goScene')
    return;
  }

  @Command('feedback')
  async feedbackCommand(@Ctx() ctx: SceneContext) {
    await ctx.scene.enter('feedbackScene')
    return
  }

  @Command('gen')
  async generatePictures(@Ctx() ctx: SceneContext) {
    const allowedUserIds = [368397946, 6747384, 152816106];
    const userId = ctx.from.id;

    if (!allowedUserIds.includes(userId)) {
      return;
    }

    const { text } = ctx;
    const match = text.match(/ID: (\d+)/);
    if (!match) {
      await ctx.reply("Please provide a valid question ID in the format 'ID: [number]'.");
      return;
    }

    const questionId = parseInt(match[1], 10);
    const question = await this.questionsService.findOne(questionId);
    if (!question) {
      await ctx.reply("No question found with the provided ID.");
      return;
    }

    const imagePaths = await this.responsesService.generateImageForQuestion(question.id, true);

    if (imagePaths) {
      const { mainImagePath, avatarImagePath } = imagePaths;
      await ctx.replyWithPhoto({ source: mainImagePath });
      await ctx.replyWithPhoto({ source: avatarImagePath });
    } else {
      await ctx.reply("Failed to generate images.");
    }
  }

  @On('text')
  async handleText(@Ctx() ctx: SceneContext) {
    const { text, chat } = ctx;
    const isValidAnswer = Object.values(AnswerOptions).includes(text as AnswerOptions);
    let sessionData = await this.sessionService.getSession(chat.id);

    if (sessionData && sessionData.awaitingResponse) {
      if (isValidAnswer) {
        const newSessionData = { ...sessionData, awaitingResponse: false };
        await this.sessionService.setSession(chat.id, newSessionData);
        ctx.session = newSessionData;
        await ctx.scene.enter('goScene', { fromCron: true, message: text });
      } else {
        await ctx.reply(messages.invalidResponse);
      }
    } else {
      await ctx.reply(messages.unknownCommand);
    }
  }

  //@Cron('45 12 * * MON')
  @Cron('13 20 * * *')
  async handleCron() {
    const users = await this.usersService.findAll();
    for (const user of users) {
      const chatId = user.chat_id;
      let sessionData = await this.sessionService.getSession(chatId) || {};
      sessionData.awaitingResponse = true;
      await this.sessionService.setSession(chatId, sessionData);
      await this.sendQuestion(chatId, messages.cronMessage);
    }
  }

  async sendQuestion(chatId: number, cronMessage: string | null = null, ctx: SceneContext = null) {
    const question = await this.questionsService.getLatestQuestion();
    if (!question) {
      await this.bot.telegram.sendMessage(chatId, messages.notExistQuestion);
      return;
    }

    const message = (cronMessage || '') + question.question + '\n\n' + messages.question;
    const replyMarkup = await this.getEnumKeyboard(AnswerOptions);
    await this.bot.telegram.sendMessage(chatId, message, replyMarkup);
  }

  async getEnumKeyboard(enumObj: Record<string, string>) {
    const keyboard = Object.values(enumObj).map(option => [{ text: option }]);
    return Markup.keyboard(keyboard).oneTime();
  }

  async getOrCreateUser(ctx: SceneContext): Promise<User> {
    const createUserDto = {
      telegram_id: ctx.from.id,
      chat_id: ctx.chat.id,
      is_bot: ctx.from.is_bot,
      language_code: ctx.from.language_code,
    };
    return this.usersService.getOrCreateUser(createUserDto);
  }

  getEnumKeyByValue(enumObj: { [s: string]: string }, value: string): string | null {
    return Object.entries(enumObj).find(([, val]) => val === value)?.[0] ?? null;
  }

  async handleInvalidResponse(ctx: SceneContext) {
    await ctx.reply(messages.invalidResponse);
    this.timerService.setTimer(ctx);
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
}
