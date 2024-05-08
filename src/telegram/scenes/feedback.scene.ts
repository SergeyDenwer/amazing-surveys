// feedback.scene.ts
import { Injectable } from '@nestjs/common';
import { FeedbackService } from '../../feedback/feedback.service';
import { messages } from "../../messages";
import { CreateFeedbackDto } from '../../feedback/dto/create-feedback.dto';
import {SceneContext} from "telegraf/scenes";
import {Ctx, On, Scene, SceneEnter} from "nestjs-telegraf";
import {CreateUserDto} from "../../users/dto/create-user.dto";
import {UpdateUserDto} from "../../users/dto/update-user.dto";
import {UsersService} from "../../users/users.service";

@Injectable()
@Scene('feedbackScene')
export class FeedbackSceneCreator {
  constructor(
    private readonly feedbackService: FeedbackService,
    private usersService: UsersService,
  ) {}
  @SceneEnter()
  sceneEnter(@Ctx() ctx: SceneContext){
    ctx.reply(messages.feedbackTitle)
  }


  @On('text')
  async handleText(@Ctx() ctx: SceneContext) {

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