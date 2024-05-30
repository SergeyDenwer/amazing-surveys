import { Injectable } from '@nestjs/common';
import { SceneContext } from 'telegraf/scenes';
import { SessionService } from './session.service';
import { messages } from '../messages';

const activeTimers: Map<number, NodeJS.Timeout> = new Map();

@Injectable()
export class TimerService {
  constructor(private readonly sessionService: SessionService) {}

  setTimer(ctx: SceneContext) {
    this.clearTimer(ctx);
    const timeoutId = setTimeout(async () => {
      await ctx.reply(messages.timeoutMessage);
      await ctx.scene.leave();
      await this.sessionService.resetSession(String(ctx.chat.id));
      activeTimers.delete(ctx.chat.id);
    }, 10000);
    activeTimers.set(ctx.chat.id, timeoutId);
  }

  clearTimer(ctx: SceneContext) {
    const timeoutId = activeTimers.get(ctx.chat.id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      activeTimers.delete(ctx.chat.id);
    }
  }
}
