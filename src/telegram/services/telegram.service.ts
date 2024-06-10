// telegram.service.ts
import { Injectable } from "@nestjs/common";
import { Update, Ctx, Start, Help, Command, InjectBot, On } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { Cron } from "@nestjs/schedule";
import { messages } from "../../messages";
import { SceneContext } from "telegraf/scenes";
import { UsersService } from "../../users/users.service";
import { QuestionsService } from "../../surveys/questions.service";
import { ResponsesService } from "../../surveys/responses.service";
import { SessionService } from './session.service';
import { TelegramUtils } from "../utils/telegram.utils";
import { AnswerOptions } from "../../constants/answer-options.enum";
import { AdditionalQuestionResponseService } from "../../surveys/additional-question-response.service";
import { User } from "../../users/entities/user.entity";
import { Question } from "../../surveys/entities/question.entity";
import { SessionState } from '../session-state.interface';

@Update()
@Injectable()
export class TelegramService {
  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly usersService: UsersService,
    private questionsService: QuestionsService,
    private responsesService: ResponsesService,
    private readonly sessionService: SessionService,
    private additionalQuestionResponseService: AdditionalQuestionResponseService,
    private readonly telegramUtils: TelegramUtils,
  ) {}

  @Start()
  async start(@Ctx() ctx: Context) {
    await this.telegramUtils.sendToGoogleAnalytics(ctx.from.id, 'start_command');
    await ctx.reply(messages.startMessage);
  }

  @Help()
  async help(@Ctx() ctx: Context) {
    await this.telegramUtils.sendToGoogleAnalytics(ctx.from.id, 'help_command');
    await ctx.reply(messages.helpResponse);
  }

  @Command('go')
  async getQuestion(@Ctx() ctx: SceneContext<SessionState>) {
    await this.telegramUtils.sendToGoogleAnalytics(ctx.from.id, 'go_command');
    await ctx.scene.enter('goScene');
    return;
  }

  @Command('feedback')
  async feedbackCommand(@Ctx() ctx: SceneContext<SessionState>) {
    await this.telegramUtils.sendToGoogleAnalytics(ctx.from.id, 'feedback_command');
    await ctx.scene.enter('feedbackScene');
    return;
  }

  @Command('gen')
  async generatePictures(@Ctx() ctx: SceneContext<SessionState>) {
    await this.telegramUtils.generatePictures(ctx);
  }

  @On('text')
  async handleText(@Ctx() ctx: SceneContext<SessionState>) {
    const { text, chat } = ctx;
    const isValidAnswer = Object.values(AnswerOptions).includes(text as AnswerOptions);
    if ((ctx.session as SessionState).awaitingResponse) {
      let eventParams = {
        'fromCron' : true,
        'isValidAnswer' : true,
        'answer' : text
      };
      if (isValidAnswer) {
        (ctx.session as SessionState).awaitingResponse = false;
        await this.telegramUtils.sendToGoogleAnalytics(chat.id, 'telegram_service_text', eventParams);
        await ctx.scene.enter('goScene', { fromCron: true, message: text });
      } else {
        await ctx.reply(messages.invalidResponse);
        eventParams.isValidAnswer = false;
        await this.telegramUtils.sendToGoogleAnalytics(chat.id, 'telegram_service_text', eventParams);
      }
    } else {
      await ctx.reply(messages.unknownCommand);
      await this.telegramUtils.sendToGoogleAnalytics(chat.id, 'telegram_service_text', {
        'unknownCommand' : true,
        'answer' : text
      });
    }
  }

  //@Cron('48 13 * * *')
  @Cron('00 13 * * MON')
  async handleCron() {
    const question = await this.questionsService.getLatestQuestion();
    const users = await this.responsesService.findUsersWithoutResponseToLastQuestion(question);
    for (const user of users) {
      try {
        await this.sendQuestion(user, question, messages.cronMessage);
        await this.setCronSession(user, question)
      } catch (error) {
        await this.handleSendMessageError(user, error)
      }
    }
  }

  private async setCronSession(user, question) {
    const chatId = user.chat_id;
    let sessionData = await this.sessionService.getSession(chatId) || {};
    sessionData.awaitingResponse = true;
    sessionData.question = question;
    await this.sessionService.setSession(chatId, sessionData);
  }

  private async handleSendMessageError(user: User, error: any) {
    if (error.response && error.response.error_code === 403) {
      await this.usersService.update(user, { bot_was_blocked: true });
      console.error(`User ${user.chat_id} has blocked the bot.`);
    } else {
      console.error(`Failed to send message to user ${user.chat_id}:`, error);
    }
  }

  async sendQuestion(user: User, question: Question, cronMessage: string | null = null) {
    const message = (cronMessage || '') + question.question + '\n\n' + messages.question;
    const replyMarkup = await this.telegramUtils.getEnumKeyboard(AnswerOptions);
    await this.bot.telegram.sendMessage(user.chat_id, message, replyMarkup);
    await this.telegramUtils.sendToGoogleAnalytics(user.chat_id, 'send_question', {'fromCron' : !!cronMessage});
  }
}