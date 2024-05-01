import {
  Update,
  Ctx,
  Start,
  Help,
  On,
  Command,
} from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
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
import { CreateFeedbackDto } from "../feedback/dto/create-feedback.dto";
import { FeedbackService } from "../feedback/feedback.service";

interface SessionData {
  state: 'AWAITING_FEEDBACK' | null;
  hasStarted?: boolean;
}

@Update()
@Injectable()
export class TelegramService {

  private sessions: Record<number, SessionData> = {};
  constructor(
    private usersService: UsersService,
    private questionsService: QuestionsService,
    private responsesService: ResponsesService,
    private feedbackService: FeedbackService,
  ) {}

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
    const question = await this.questionsService.getLatestQuestion();
    if (question) {
      await ctx.reply(question.question, {
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
      });
    } else {
      await ctx.reply(messages.notExistQuestion);
    }
  }

  @Command('feedback')
  async requestFeedback(@Ctx() ctx: Context) {
    const chat_id = ctx.chat.id;
    this.sessions[chat_id] = { state: 'AWAITING_FEEDBACK' };
    await ctx.reply(messages.feedbackTitle);
  }

  @On('text')
  async handleText(@Ctx() ctx: Context) {
    const chat_id = ctx.chat.id;
    const { text } = ctx;
    const session = this.sessions[chat_id];

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

    if (session && session.state === 'AWAITING_FEEDBACK') {
      if (!text) {
        await ctx.reply(messages.notExistFeedback);
        return;
      }

      const createFeedbackDto = new CreateFeedbackDto();
      createFeedbackDto.user_id = user.id;
      createFeedbackDto.text = text;

      await this.feedbackService.create(createFeedbackDto);
      await ctx.reply(messages.feedbackResponse);
      this.sessions[chat_id] = { state: null };
      return;
    }

    const answerOptionKey = getAnswerOptionKey(text);
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
        await ctx.replyWithPhoto({ source: getImage('last_result.png') }, { caption: messages.thanksResponse });
      }
    }
  }
  //@Cron('0 */6 * * *')
  //@Cron('*/5 * * * *')
  //@Cron('0 11 * * 1')
  async handleCron() {
    //this.logger.debug('Started sending notifications');
    const users = await this.usersService.findAll();
    const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    const message = ''

    for (const user of users) {
      await bot.telegram.sendMessage(user.chat_id, message);
    }
  }
}

function getImage(name: string){
  const path = require('path');
  return path.join(__dirname, '..', '..', '..', 'images', name);
}

function getAnswerOptionKey(text: string): string | null {
  const entries = Object.entries(AnswerOptions);
  for (const [key, value] of entries) {
    if (value === text) {
      return key;
    }
  }
  return null;
}