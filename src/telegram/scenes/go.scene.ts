import { Injectable } from '@nestjs/common';
import { messages } from "../../messages";
import { SceneContext } from "telegraf/scenes";
import { Ctx, On, Scene, SceneEnter } from "nestjs-telegraf";
import { QuestionsService } from "../../surveys/questions.service";
import { ResponsesService } from "../../surveys/responses.service";
import { AnswerOptions } from "../../constants/answer-options.enum";
import { CreateResponseDto } from "../../surveys/dto/create-response.dto";
import { TelegramService } from "../telegram.service";
import { TimerService } from "../timer.service";

@Injectable()
@Scene('goScene')
export class GoSceneCreator {
  constructor(
    private questionsService: QuestionsService,
    private responsesService: ResponsesService,
    private telegramService: TelegramService,
    private readonly timerService: TimerService,
  ) {}

  @SceneEnter()
  async sceneEnter(@Ctx() ctx: SceneContext) {
    const fromCron = (ctx.scene.state as any).fromCron as boolean;
    const message = (ctx.scene.state as any).message as string;

    if (fromCron && message) {
      await this.saveResponse(ctx);
    } else {
      await this.telegramService.sendQuestion(ctx.chat.id, null, ctx);
      this.timerService.setTimer(ctx);
    }
  }

  @On('text')
  async handleText(@Ctx() ctx: SceneContext) {
    this.timerService.clearTimer(ctx);
    await this.saveResponse(ctx);
  }

  private async saveResponse(@Ctx() ctx: SceneContext) {
    const { text } = ctx;
    const user = await this.telegramService.getOrCreateUser(ctx);

    const answerOptionKey = this.telegramService.getEnumKeyByValue(AnswerOptions, text);
    if (!answerOptionKey) {
      await this.telegramService.handleInvalidResponse(ctx);
      return;
    }

    const latestQuestion = await this.questionsService.getLatestQuestion();
    if (!latestQuestion) {
      await ctx.reply(messages.notExistQuestion);
      await ctx.scene.leave();
      return;
    }

    if (await this.responsesService.hasUserAlreadyResponded(user.id, latestQuestion.id)) {
      await ctx.reply(messages.alreadyResponded);
      await ctx.scene.leave();
      return;
    }

    const response = await this.createResponse(user.id, latestQuestion.id, answerOptionKey);
    const previousQuestion = await this.questionsService.getPreviousQuestion();
    if (previousQuestion) {
      const imagePath = await this.telegramService.getImage('result.png', previousQuestion.id, previousQuestion.created_at);
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
