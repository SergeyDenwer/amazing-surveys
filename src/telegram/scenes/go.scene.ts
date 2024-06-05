import { Injectable } from '@nestjs/common';
import { messages } from "../../messages";
import { SceneContext } from "telegraf/scenes";
import { Ctx, On, Scene, SceneEnter } from "nestjs-telegraf";
import { QuestionsService } from "../../surveys/questions.service";
import { ResponsesService } from "../../surveys/responses.service";
import { AnswerOptions } from "../../constants/answer-options.enum";
import { CreateResponseDto } from "../../surveys/dto/create-response.dto";
import { TelegramUtils } from "../utils/telegram.utils";
import { SessionService } from "../services/session.service";
import { UsersService } from "../../users/users.service";
import {TelegramService} from "../services/telegram.service";
import {AdditionalQuestionResponseService} from "../../surveys/additional-question-response.service";

@Injectable()
@Scene('goScene')
export class GoSceneCreator {
  constructor(
    private questionsService: QuestionsService,
    private responsesService: ResponsesService,
    private readonly sessionService: SessionService,
    private readonly usersService: UsersService,
    private telegramService: TelegramService,
    private additionalQuestionResponseService: AdditionalQuestionResponseService,
    private readonly telegramUtils: TelegramUtils,
  ) {}

  @SceneEnter()
  async sceneEnter(@Ctx() ctx: SceneContext) {
    const fromCron = (ctx.scene.state as any).fromCron as boolean;
    const message = (ctx.scene.state as any).message as string;

    const createUserDto = { telegram_id: ctx.from.id, chat_id: ctx.chat.id};
    const user = await this.usersService.getOrCreateUser(createUserDto);

    (ctx.scene.state as any).user = user;

    if (fromCron && message) {
      await this.saveResponse(ctx);
    } else {
      const question = await this.questionsService.getLatestQuestion();
      const hasResponded = await this.responsesService.hasUserAlreadyResponded(user.id, question.id);
      if (hasResponded) {
        await this.telegramUtils.sendToGoogleAnalytics(user.chat_id, 'send_question', {
          'hasResponded' : true
        });
        await ctx.scene.enter('additionalQuestionScene', {
          user: user,
          responseId: null,
        });
        return;
      }
      await this.telegramService.sendQuestion(user, question,null);
      this.telegramUtils.setTimer(ctx);
    }
  }

  @On('text')
  async handleText(@Ctx() ctx: SceneContext) {
    this.telegramUtils.clearTimer(ctx);
    await this.saveResponse(ctx);
  }

  private async saveResponse(@Ctx() ctx: SceneContext) {
    const { text } = ctx;

    const answerOptionKey = this.telegramUtils.getEnumKeyByValue(AnswerOptions, text);
    if (!answerOptionKey) {
      await this.telegramUtils.handleInvalidResponse(ctx);
      this.telegramUtils.setTimer(ctx);
      await this.telegramUtils.sendToGoogleAnalytics(ctx.chat.id, 'go_scene_save_response', {
        'isValidAnswer' : false,
      });
      return;
    }

    const { user } = ctx.scene.state as { user: any };
    const question = await this.questionsService.getLatestQuestion();
    const response = await this.createResponse(user.id, question.id, answerOptionKey);
    await this.telegramUtils.sendToGoogleAnalytics(ctx.chat.id, 'go_scene_save_response', {
      'isValidAnswer' : true,
      'answer' : text
    });
    delete (ctx.session as any).mainQuestion;
    const previousQuestion = await this.questionsService.getPreviousQuestion();
    if (previousQuestion) {
      const imagePath = await this.telegramUtils.getImage('result.png', previousQuestion.id, previousQuestion.created_at);
      await ctx.replyWithPhoto({ source: imagePath }, {
        caption: messages.thanksResponse + ' ' + messages.thanksResponseDescription,
      });
    } else {
      await ctx.reply(messages.noPreviousQuestionResults);
    }

    await ctx.scene.enter('additionalQuestionScene', {
      user: user,
      responseId: response.id,
    });
  }

  private async createResponse(userId: number, questionId: number, choice: string) {
    const createResponseDto = new CreateResponseDto();
    createResponseDto.user_id = userId;
    createResponseDto.question_id = questionId;
    createResponseDto.choice = choice;
    return this.responsesService.create(createResponseDto);
  }
}
