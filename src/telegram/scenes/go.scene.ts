// go.scene.ts
import { Injectable } from '@nestjs/common';
import { messages } from "../../messages";
import {SceneContext} from "telegraf/scenes";
import {Ctx, On, Scene, SceneEnter} from "nestjs-telegraf";
import {CreateUserDto} from "../../users/dto/create-user.dto";
import {UpdateUserDto} from "../../users/dto/update-user.dto";
import {UsersService} from "../../users/users.service";
import {QuestionsService} from "../../surveys/questions.service";
import {ResponsesService} from "../../surveys/responses.service";
import {AnswerOptions} from "../../constants/answer-options.enum";
import {CreateResponseDto} from "../../surveys/dto/create-response.dto";
import {TelegramService} from "../telegram.service";


@Injectable()
@Scene('goScene')
export class GoSceneCreator {
  constructor(
    private questionsService: QuestionsService,
    private responsesService: ResponsesService,
    private usersService: UsersService,
    private telegramService: TelegramService,
  ) {}

  private async saveResponse(@Ctx() ctx: SceneContext) {

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
          await ctx.scene.leave();
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

    await ctx.scene.leave();
  }

  private getImage(name: string){
    const path = require('path');
    return path.join(__dirname, '..', '..', '..', '..', 'images', name);
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
  @SceneEnter()
  async sceneEnter(@Ctx() ctx: SceneContext) {
    const fromCron = (ctx.scene.state as any).fromCron as boolean;
    const message = (ctx.scene.state as any).message as string;

    if (fromCron && message) {
      await this.saveResponse(ctx);
    } else {
      const chatId = ctx.chat.id;
      await this.telegramService.sendQuestion(chatId);
    }
  }

  @On('text')
  async handleText(@Ctx() ctx: SceneContext) {
    await this.saveResponse(ctx)
  }
}