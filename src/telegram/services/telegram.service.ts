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
import {AnswerOptions} from "../../constants/answer-options.enum";
import {AdditionalQuestionResponseService} from "../../surveys/additional-question-response.service";
import {User} from "../../users/entities/user.entity";
import {Question} from "../../surveys/entities/question.entity";

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
  async getQuestion(@Ctx() ctx: SceneContext) {
    await this.telegramUtils.sendToGoogleAnalytics(ctx.from.id, 'go_command');
    await ctx.scene.enter('goScene');
    return;
  }

  @Command('feedback')
  async feedbackCommand(@Ctx() ctx: SceneContext) {
    await this.telegramUtils.sendToGoogleAnalytics(ctx.from.id, 'feedback_command');
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
    if ((ctx.session as any).awaitingResponse) {
      if (isValidAnswer) {
        delete (ctx.session as any).awaitingResponse;
        await this.telegramUtils.sendToGoogleAnalytics(chat.id, 'telegram_service_text', {
          'fromCron' : true,
          'isValidAnswer' : true,
          'answer' : text
        });
        await ctx.scene.enter('goScene', { fromCron: true, message: text });
      } else {
        await ctx.reply(messages.invalidResponse);
        await this.telegramUtils.sendToGoogleAnalytics(chat.id, 'telegram_service_text', {
          'fromCron' : true,
          'isValidAnswer' : false,
          'answer' : text
        });
      }
    } else {
      await ctx.reply(messages.unknownCommand);
      await this.telegramUtils.sendToGoogleAnalytics(chat.id, 'telegram_service_text', {
        'unknownCommand' : true,
        'answer' : text
      });
    }
  }

  //@Cron('00 15 * * MON')
  @Cron('52 17 * * *')
  async handleCron() {
    const question = await this.questionsService.getLatestQuestion();
    const users = await this.responsesService.findUsersWithoutResponseToLastQuestion(question);
    for (const user of users) {
      try {
        const chatId = user.chat_id;
        let sessionData = await this.sessionService.getSession(chatId) || {};
        sessionData.awaitingResponse = true;
        await this.sessionService.setSession(chatId, sessionData);
        await this.sendQuestion(user, question, messages.cronMessage);
      } catch (error) {
        if (error.response && error.response.error_code === 403) {
          await this.usersService.update(user, { bot_was_blocked: true });
          await this.sessionService.resetSession(user.chat_id)
          console.error(`User ${user.chat_id} has blocked the bot.`);
        } else {
          console.error(`Failed to send message to user ${user.chat_id}:`, error);
        }
      }
    }
  }

  async sendQuestion(user: User, question: Question, cronMessage: string | null = null) {
    const message = (cronMessage || '') + question.question + '\n\n' + messages.question;
    const replyMarkup = await this.telegramUtils.getEnumKeyboard(AnswerOptions);
    await this.bot.telegram.sendMessage(user.chat_id, message, replyMarkup);
    await this.telegramUtils.sendToGoogleAnalytics(user.chat_id, 'send_question', {
      'fromCron' : !!cronMessage
    });
  }
}