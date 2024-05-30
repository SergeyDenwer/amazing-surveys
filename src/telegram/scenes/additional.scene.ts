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
import { TimerService } from "../timer.service";
import { TelegramService } from "../telegram.service";

@Injectable()
@Scene('additionalQuestionScene')
export class AdditionalQuestionSceneCreator {
  constructor(
    private additionalQuestionResponseService: AdditionalQuestionResponseService,
    private telegramService: TelegramService,
    private readonly timerService: TimerService,
  ) {}

  @SceneEnter()
  async sceneEnter(@Ctx() ctx: SceneContext) {
    const { user } = ctx.scene.state as { user: User };
    for (const questionKey of Object.values(AdditionalQuestions)) {
      const recentResponse = await this.additionalQuestionResponseService.findRecent(
        user.id,
        questionKey,
        additionalQuestionsConfig[questionKey].expiresIn
      );

      if (!recentResponse) {
        (ctx.scene.state as { additionalQuestion: AdditionalQuestions }).additionalQuestion = questionKey;
        await this.sendAdditionalQuestion(ctx, questionKey);
        return;
      }
    }

    await ctx.scene.leave();
  }

  @On('text')
  async handleText(@Ctx() ctx: SceneContext) {
    await this.saveAdditionalResponse(ctx);
  }

  async sendAdditionalQuestion(ctx: SceneContext, questionKey: AdditionalQuestions) {
    const replyMarkup = await this.telegramService.getEnumKeyboard(additionalQuestionsConfig[questionKey].options);
    await ctx.reply(messages.additionalQuestionDescription + messages[questionKey], replyMarkup);
    this.timerService.setTimer(ctx);
  }

  private async saveAdditionalResponse(@Ctx() ctx: SceneContext) {
    const { text } = ctx;
    const { user, responseId, additionalQuestion } = ctx.scene.state as {
      user: User;
      responseId: number;
      additionalQuestion: AdditionalQuestions;
    };

    const answer = this.telegramService.getEnumKeyByValue({ ...BinaryOptions, ...AgeOptions }, text);
    if (!answer) {
      await this.telegramService.handleInvalidResponse(ctx);
      return;
    }

    const createAdditionalResponseDto = new CreateAdditionalQuestionResponseDto();
    createAdditionalResponseDto.user_id = user.id;
    createAdditionalResponseDto.response_id = responseId;
    createAdditionalResponseDto.question = additionalQuestion;
    createAdditionalResponseDto.answer = answer;

    await this.additionalQuestionResponseService.create(createAdditionalResponseDto);
    this.timerService.clearTimer(ctx);
    await ctx.reply(messages.thanksResponse);
    await ctx.scene.leave();
  }
}
