import {
  Update,
  Ctx,
  Start,
  Help,
  On,
  Command, InjectBot,
} from 'nestjs-telegraf';
import {Context, Scenes, Telegraf} from 'telegraf';
import { UsersService } from "../users/users.service";
import { QuestionsService } from "../surveys/questions.service";
import { Injectable } from "@nestjs/common";
import { AnswerOptions } from "../constants/answer-options.enum";
import { CreateUserDto } from "../users/dto/create-user.dto";
import { UpdateUserDto } from "../users/dto/update-user.dto";
import { ResponsesService } from "../surveys/responses.service";
import { CreateResponseDto } from "../surveys/dto/create-response.dto";
import { Cron } from "@nestjs/schedule";
import { messages } from "../messages";
import {SceneContext} from "telegraf/scenes";

interface SessionData {
  state: 'AWAITING_FEEDBACK' | null;
  hasStarted?: boolean;
}

@Update()
@Injectable()
export class TelegramService {

  private sessions: Record<number, SessionData> = {};
  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private usersService: UsersService,
    private questionsService: QuestionsService,
    private responsesService: ResponsesService
  ) {}

  private async sendQuestion(chat_id: number, bot?: Telegraf<Context>, ctx?: Context) {
    const question = await this.questionsService.getLatestQuestion();
    if (!question) {
      const message = messages.notExistQuestion;
      if (ctx) {
        await ctx.reply(message);
      } else if (bot) {
        await bot.telegram.sendMessage(chat_id, message);
      }
      return;
    }

    const message = question.question + '\n\n' + messages.question;
    const replyMarkup = {
      reply_markup: {
        keyboard: [
          [{ text: AnswerOptions.Option1 }],
          [{ text: AnswerOptions.Option2 }],
          [{ text: AnswerOptions.Option3 }],
          [{ text: AnswerOptions.Option4 }],
          [{ text: AnswerOptions.Option5 }],
        ],
        one_time_keyboard: true,
      },
    };

    if (ctx) {
      await ctx.reply(message, replyMarkup);
    } else if (bot) {
      await bot.telegram.sendMessage(chat_id, messages.additionalText + message, replyMarkup);
    }
  }

  private getImage(name: string){
    const path = require('path');
    return path.join(__dirname, '..', '..', '..', 'images', name);
  }

  private getAnswerOptionKey(text: string): string | null {
    const entries = Object.entries(AnswerOptions);
    for (const [key, value] of entries) {
      if (value === text) {
        return key;
      }
    }
    return null;
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
  async getQuestion(@Ctx() ctx: Context) {
    await this.sendQuestion(ctx.chat.id, undefined, ctx);
  }

  @Command('feedback')
  async feedbackCommand(@Ctx() ctx: SceneContext) {
    await ctx.scene.enter('feedbackScene')
    return
  }

  @On('text')
  async handleText(@Ctx() ctx: Context) {
    const chat_id = ctx.chat.id;
    const { text } = ctx;

    const telegram_id = ctx.from.id;
    const is_bot = ctx.from.is_bot;
    const language_code = ctx.from.language_code;

    let user = await this.usersService.findByTelegramID(telegram_id);
    if (!user) {
      const createUserDto: CreateUserDto = {
        telegram_id,
        chat_id,
        is_bot,
        language_code
      };
      user = await this.usersService.create(createUserDto);
    } else {
      const updateUserDto: UpdateUserDto = {
        chat_id
      };
      await this.usersService.update(user, updateUserDto);
    }

    const answerOptionKey = this.getAnswerOptionKey(text);
    if (answerOptionKey) {
      const latestQuestion = await this.questionsService.getLatestQuestion();
      if (latestQuestion) {
        const alreadyResponded = await this.responsesService.hasUserAlreadyResponded(user.id, latestQuestion.id);
        if (alreadyResponded) {
          await ctx.reply(messages.alreadyResponded);
          return;
        }

        const createResponseDto = new CreateResponseDto();
        createResponseDto.user_id = user.id;
        createResponseDto.question_id = latestQuestion.id;
        createResponseDto.choice = answerOptionKey;

        await this.responsesService.create(createResponseDto);
        await ctx.replyWithPhoto({ source: this.getImage('last_result.png') }, { caption: messages.thanksResponse });
      }
    }
  }

  //@Cron('0 16 * * MON')
  @Cron('30 15 * * MON')
  async handleCron() {
    const users = await this.usersService.findAll();
    const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    for (const user of users) {
      await this.sendQuestion(user.chat_id, bot);
    }
  }
}