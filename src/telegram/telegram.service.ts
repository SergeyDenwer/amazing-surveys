// telegram.service.ts
import {Update, Ctx, Start, Help, Command, InjectBot, On} from 'nestjs-telegraf';
import {Context, Telegraf, Markup} from 'telegraf';
import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { messages } from "../messages";
import {SceneContext} from "telegraf/scenes";
import {UsersService} from "../users/users.service";
import {QuestionsService} from "../surveys/questions.service";
import {AnswerOptions} from "../constants/answer-options.enum";

interface SessionData {
  hasStarted?: boolean;
}

@Update()
@Injectable()
export class TelegramService {

  private sessions: Record<number, SessionData> = {};
  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly usersService: UsersService,
    private questionsService: QuestionsService,
  ) {}

  async sendQuestion(chatId: number, cronMessage: string | null = null, ctx: SceneContext = null) {
    const question = await this.questionsService.getLatestQuestion();
    if (!question) {
      await this.bot.telegram.sendMessage(chatId, messages.notExistQuestion);
      if(ctx)
        await ctx.scene.leave();
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

  @Start()
  async start(@Ctx() ctx: Context) {
    const chat_id = ctx.chat.id;
    if (this.sessions[chat_id] && this.sessions[chat_id].hasStarted) {
      return;
    }
    this.sessions[chat_id] = { ...this.sessions[chat_id], hasStarted: true };
    await ctx.reply(messages.startMessage);
    setTimeout(() => {
      if (this.sessions[chat_id]) {
        this.sessions[chat_id].hasStarted = false;
      }
    }, 1000);
  }

  @Help()
  async help(@Ctx() ctx: Context) {
    await ctx.reply(messages.helpResponse);
  }

  @Command('go')
  async getQuestion(@Ctx() ctx: SceneContext) {
    await ctx.scene.enter('goScene')
    return
  }

  @Command('feedback')
  async feedbackCommand(@Ctx() ctx: SceneContext) {
    await ctx.scene.enter('feedbackScene')
    return
  }
  @On('text')
  async handleText(@Ctx() ctx: SceneContext) {
    const { text } = ctx;
    const isValidAnswer = Object.values(AnswerOptions).includes(text as AnswerOptions);
    if(isValidAnswer) {
      await ctx.scene.enter('goScene', {fromCron: true, message: text});
    }
    return;
  }

  //@Cron('35 14 * * MON')
  async handleCron() {
    const users = await this.usersService.findAll();
    for (const user of users) {
      const chatId = user.chat_id;
      await this.sendQuestion(chatId, messages.cronMessage);
    }
  }
}