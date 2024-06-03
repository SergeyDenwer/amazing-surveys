import { Injectable, Inject } from '@nestjs/common';
import { SessionStore } from '@telegraf/session/types'; // Импортируем из правильного модуля

@Injectable()
export class SessionService {
  constructor(
    @Inject('SESSION_STORE') private readonly store: SessionStore<any>,
  ) {}

  async resetSession(id: string): Promise<void> {
    const key = `${id}:${id}`; // Формат ключа для удаления
    const emptySession = { __scenes: {} }; // Пустая сессия
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
