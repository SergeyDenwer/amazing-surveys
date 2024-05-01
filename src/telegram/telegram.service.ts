import {
  Update,
  Ctx,
  Start,
  Help,
  On,
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

@Update()
@Injectable()
export class TelegramService {
  constructor(
    private usersService: UsersService,
    private questionsService: QuestionsService,
    private responsesService: ResponsesService,
  ) {}

  @Start()
  async start(@Ctx() ctx: Context) {
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

  @Help()
  async help(@Ctx() ctx: Context) {
    await ctx.reply(messages.helpResponse);
  }

  @On('message')
  async on(@Ctx() ctx: Context) {
    const { text } = ctx;
    const telegram_id = ctx.from.id;
    const chat_id = ctx.chat.id;
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

    const answerOptionKey = getAnswerOptionKey(text);
    if (answerOptionKey) {
      const latestQuestion = await this.questionsService.getLatestQuestion();
      if (latestQuestion) {

        const alreadyResponded = await this.responsesService.hasUserAlreadyResponded(user.id, latestQuestion.id);
        if (alreadyResponded) {
          ctx.reply(messages.alreadyResponded);
          return;
        }

        const createResponseDto: CreateResponseDto = {
          user_id: user.id,
          question_id: latestQuestion.id,
          choice: answerOptionKey
        };
        await this.responsesService.create(createResponseDto);
        ctx.replyWithPhoto({ source: getImage('test_pic.jpeg') }, { caption: messages.thanksResponse });
      }
    } else {
      ctx.reply(messages.errorResponse);
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