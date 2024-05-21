// go.scene.ts
import { Injectable } from '@nestjs/common';
import { messages } from "../../messages";
import {SceneContext} from "telegraf/scenes";
import {Ctx, On, Scene, SceneEnter} from "nestjs-telegraf";
import {CreateUserDto} from "../../users/dto/create-user.dto";
import {UsersService} from "../../users/users.service";
import {QuestionsService} from "../../surveys/questions.service";
import {ResponsesService} from "../../surveys/responses.service";
import {AnswerOptions} from "../../constants/answer-options.enum";
import {CreateResponseDto} from "../../surveys/dto/create-response.dto";
import {TelegramService} from "../telegram.service";
import {AdditionalQuestions} from "../../constants/additional-questions.enum";
import {AdditionalQuestionResponseService} from "../../surveys/additional-question-response.service";
import {CreateAdditionalQuestionResponseDto} from "../../surveys/dto/create-additional-question-response.dto";
import {BinaryOptions} from "../../constants/binary-options.enum";
import {AgeOptions} from "../../constants/age-options.enum";
import {User} from "../../users/entities/user.entity";
import {additionalQuestionsConfig} from "../../../config/additional-questions-config";
import * as fs from "node:fs";
import * as moment from 'moment';

interface CustomSceneState {
  questionIndex?: number;
  additionalQuestion?: AdditionalQuestions;
  responseId?: number;
  user?: User;
}

@Injectable()
@Scene('goScene')
export class GoSceneCreator {
  constructor(
    private questionsService: QuestionsService,
    private responsesService: ResponsesService,
    private usersService: UsersService,
    private telegramService: TelegramService,
    private additionalQuestionResponseService: AdditionalQuestionResponseService,
  ) {}

  private async saveResponse(@Ctx() ctx: SceneContext) {

    const { text } = ctx;
    const user = await this.getOrCreateUser(ctx);
    (ctx.scene.state as CustomSceneState).user = user;
    const answerOptionKey = this.getEnumKeyByValue(AnswerOptions, text);

    if (answerOptionKey) {
      const latestQuestion = await this.questionsService.getLatestQuestion();
      const previousQuestion = await this.questionsService.getPreviousQuestion();
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

        const response = await this.responsesService.create(createResponseDto);
        (ctx.scene.state as CustomSceneState).responseId = response.id;

        if (previousQuestion) {
          const imagePath = await this.getImage('result.png', previousQuestion.id, previousQuestion.created_at);
          await ctx.replyWithPhoto({ source: imagePath }, {
            caption: messages.thanksResponse + ' ' + messages.thanksResponseDescription
          });
        } else {
          await ctx.reply(messages.noPreviousQuestionResults);
          await ctx.scene.leave();
        }

        (ctx.scene.state as CustomSceneState).questionIndex += 1;
        await this.additionalQuestion(ctx)
      } else {
        await ctx.reply(messages.notExistQuestion);
        await ctx.scene.leave();
      }
    } else {
      await ctx.scene.leave();
    }
  }

  private async additionalQuestion(@Ctx() ctx: SceneContext) {
    const user = (ctx.scene.state as CustomSceneState).user || await this.getOrCreateUser(ctx);

    for (const questionKey of Object.values(AdditionalQuestions)) {
      const recentResponse = await this.additionalQuestionResponseService.findRecent(
        user.id,
        questionKey,
        additionalQuestionsConfig[questionKey].expiresIn
      );

      if (!recentResponse) {
        (ctx.scene.state as CustomSceneState).additionalQuestion = questionKey;
        const replyMarkup = await this.telegramService.getEnumKeyboard(additionalQuestionsConfig[questionKey].options);
        await ctx.reply(messages.additionalQuestionDescription + messages[questionKey], replyMarkup);
        return;
      }
    }

    await ctx.scene.leave();
  }

  private async saveAdditionalResponse(@Ctx() ctx: SceneContext) {
    const { text } = ctx;
    const user = (ctx.scene.state as CustomSceneState).user || await this.getOrCreateUser(ctx);
    const responseId = (ctx.scene.state as CustomSceneState).responseId;

    const createAdditionalResponseDto = new CreateAdditionalQuestionResponseDto();
    createAdditionalResponseDto.user_id = user.id;
    if (responseId) {
      createAdditionalResponseDto.response_id = responseId;
    }

    const options = { ...BinaryOptions, ...AgeOptions };
    createAdditionalResponseDto.question = (ctx.scene.state as CustomSceneState).additionalQuestion;
    createAdditionalResponseDto.answer = this.getEnumKeyByValue(options, text);

    if (createAdditionalResponseDto.answer) {
      await this.additionalQuestionResponseService.create(createAdditionalResponseDto);
      await ctx.reply(messages.thanksResponse);
    }

    await ctx.scene.leave();
  }

  private async getImage(name: string, questionId: number, date: Date) {
    const year = moment(date).year();
    const week = moment(date).week();
    const path = require('path');
    const imagePath = path.join(__dirname, '..', '..', '..', 'images', 'results', year.toString(), `${week}`, name);

    if (fs.existsSync(imagePath)) {
      return imagePath;
    }

    // Запуск процесса генерации изображения
    const generatedImages = await this.responsesService.generateImageForQuestion(questionId, true);
    if (generatedImages) {
      return generatedImages.mainImagePath;
    }

    throw new Error('Image generation failed');
  }

  private getEnumKeyByValue(enumObj: { [s: string]: string }, value: string): string | null {
    const entries = Object.entries(enumObj);
    for (const [key, val] of entries) {
      if (val === value) {
        return key;
      }
    }
    return null;
  }

  private async getOrCreateUser(@Ctx() ctx: SceneContext): Promise<User> {
    const createUserDto: CreateUserDto = {
      telegram_id: ctx.from.id,
      chat_id: ctx.chat.id,
      is_bot: ctx.from.is_bot,
      language_code: ctx.from.language_code
    };
    return this.usersService.getOrCreateUser(createUserDto);
  }

  @SceneEnter()
  async sceneEnter(@Ctx() ctx: SceneContext) {
    const fromCron = (ctx.scene.state as any).fromCron as boolean;
    const message = (ctx.scene.state as any).message as string;

    if (fromCron && message) {
      (ctx.scene.state as CustomSceneState).questionIndex = 1;
      await this.saveResponse(ctx);
    } else {
      (ctx.scene.state as CustomSceneState).questionIndex = 0;
      const chatId = ctx.chat.id;
      await this.telegramService.sendQuestion(chatId, null, ctx);
    }
  }

  @On('text')
  async handleText(@Ctx() ctx: SceneContext) {
    //await ctx.scene.leave(); return;
    const stage = (ctx.scene.state as CustomSceneState).questionIndex;
    if(stage === 0){
      await this.saveResponse(ctx)
    } else {
      await this.saveAdditionalResponse(ctx);
    }
  }
}