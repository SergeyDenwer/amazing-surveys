import { Injectable } from '@nestjs/common';
import { messages } from "../../messages";
import { SceneContext } from "telegraf/scenes";
import { Ctx, On, Scene, SceneEnter } from "nestjs-telegraf";
import { AdditionalQuestions } from "../../constants/additional-questions.enum";
import { AdditionalQuestionResponseService } from "../../surveys/additional-question-response.service";
import { CreateAdditionalQuestionResponseDto } from "../../surveys/dto/create-additional-question-response.dto";
import { BinaryOptions } from "../../constants/binary-options.enum";
import { AgeOptions } from "../../constants/age-options.enum";
import { User } from "../../users/entities/user.entity";
import { additionalQuestionsConfig } from "../../../config/additional-questions-config";
import { TelegramUtils } from "../utils/telegram.utils";
import { SessionService } from "../services/session.service";
import { UsersService } from "../../users/users.service";
import { ResponsesService } from "../../surveys/responses.service";
import { MonthlyIncomeOptions } from "../../constants/monthly-income-options.enum";

@Injectable()
@Scene('additionalQuestionScene')
export class AdditionalQuestionSceneCreator {
  constructor(
    private additionalQuestionResponseService: AdditionalQuestionResponseService,
    private readonly sessionService: SessionService,
    private readonly usersService: UsersService,
    private readonly responsesService: ResponsesService,
    private readonly telegramUtils: TelegramUtils,
  ) {}

  @SceneEnter()
  async sceneEnter(@Ctx() ctx: SceneContext) {
    const { user } = ctx.scene.state as { user: User };
    const questionKey = await this.telegramUtils.checkAvailableQuestions(user);

    if (questionKey !== false) {
      (ctx.scene.state as { additionalQuestion: AdditionalQuestions }).additionalQuestion = questionKey;
      await this.sendAdditionalQuestion(ctx, questionKey);
      await this.telegramUtils.sendToGoogleAnalytics(user.chat_id, 'send_additional_question', {
        'have_additional_questions' : true,
        'additional_question' : questionKey
      });
      return;
    }

    await this.telegramUtils.sendToGoogleAnalytics(user.chat_id, 'send_additional_question', {
      'have_additional_questions' : false
    });
    await ctx.reply(messages.alreadyResponded);
    await ctx.scene.leave();
  }

  @On('text')
  async handleText(@Ctx() ctx: SceneContext) {
    await this.saveAdditionalResponse(ctx);
  }

  async sendAdditionalQuestion(ctx: SceneContext, questionKey: AdditionalQuestions) {
    const replyMarkup = await this.telegramUtils.getEnumKeyboard(additionalQuestionsConfig[questionKey].options);
    await ctx.reply(messages.additionalQuestionDescription + messages[questionKey], replyMarkup);
    this.telegramUtils.setTimer(ctx);
  }

  private async saveAdditionalResponse(@Ctx() ctx: SceneContext) {
    const { text } = ctx;
    const { user, responseId, additionalQuestion } = ctx.scene.state as {
      user: User;
      responseId: number;
      additionalQuestion: AdditionalQuestions;
    };

    const answer = this.telegramUtils.getEnumKeyByValue({ ...BinaryOptions, ...AgeOptions, ...MonthlyIncomeOptions }, text);
    if (!answer) {
      await this.telegramUtils.handleInvalidResponse(ctx);
      await this.telegramUtils.sendToGoogleAnalytics(ctx.chat.id, 'additional_question_save_response', {
        'isValidAnswer' : false,
        'answer' : text
      });
      return;
    }

    const createAdditionalResponseDto = new CreateAdditionalQuestionResponseDto();
    createAdditionalResponseDto.user_id = user.id;
    createAdditionalResponseDto.response_id = responseId;
    createAdditionalResponseDto.question = additionalQuestion;
    createAdditionalResponseDto.answer = answer;

    await this.additionalQuestionResponseService.create(createAdditionalResponseDto);
    this.telegramUtils.clearTimer(ctx);
    await ctx.reply(messages.thanksResponse);
    await ctx.scene.leave();
    await this.telegramUtils.sendToGoogleAnalytics(ctx.chat.id, 'additional_question_save_response', {
      'isValidAnswer' : true,
      'answer' : text
    });
  }
}
