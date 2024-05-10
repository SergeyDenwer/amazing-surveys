// feedback.scene.ts
import { Injectable } from '@nestjs/common';
import { FeedbackService } from '../../feedback/feedback.service';
import { messages } from "../../messages";
import { CreateFeedbackDto } from '../../feedback/dto/create-feedback.dto';
import {SceneContext} from "telegraf/scenes";
import {Ctx, On, Scene, SceneEnter} from "nestjs-telegraf";
import {CreateUserDto} from "../../users/dto/create-user.dto";
import {UsersService} from "../../users/users.service";

@Injectable()
@Scene('feedbackScene')
export class FeedbackSceneCreator {
  constructor(
    private readonly feedbackService: FeedbackService,
    private usersService: UsersService,
  ) {}
  @SceneEnter()
  async sceneEnter(@Ctx() ctx: SceneContext){
    await ctx.reply(messages.feedbackTitle)
  }


  @On('text')
  async handleText(@Ctx() ctx: SceneContext) {

    const { text } = ctx;
    const createUserDto: CreateUserDto = {
      telegram_id: ctx.from.id,
      chat_id: ctx.chat.id,
      is_bot: ctx.from.is_bot,
      language_code: ctx.from.language_code
    };
    const user = await this.usersService.getOrCreateUser(createUserDto);

    if (!text) {
      await ctx.reply(messages.notExistFeedback);
      return;
    }

    const createFeedbackDto = new CreateFeedbackDto();
    createFeedbackDto.user_id = user.id;
    createFeedbackDto.text = text;

    await this.feedbackService.create(createFeedbackDto);
    await ctx.reply(messages.feedbackResponse);

    await ctx.scene.leave();
  }
}