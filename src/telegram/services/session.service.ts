import { Injectable, Inject } from '@nestjs/common';
import { SessionStore } from '@telegraf/session/types'; // Импортируем из правильного модуля

@Injectable()
export class SessionService {
  constructor(
    @Inject('SESSION_STORE') private readonly store: SessionStore<any>,
  ) {}

  async resetSession(id: number): Promise<void> {
    const key = `${id}:${id}`;
    const emptySession = { __scenes: {} };
    try {
      await this.store.set(key, emptySession);
    } catch (err) {
      console.error('Error resetting session:', err);
    }
  }

  async getSession(id: number): Promise<any> {
    const key = `${id}:${id}`;
    return await this.store.get(key);
  }

  async setSession(id: number, sessionData: any): Promise<void> {
    const key = `${id}:${id}`;
    try {
      await this.store.set(key, sessionData);
    } catch (err) {
      console.error('Error updating session:', err);
    }
  }
}
