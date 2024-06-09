// session-state.interface.ts
import { User } from "../users/entities/user.entity";
import { Question } from "../surveys/entities/question.entity";
import { SceneSessionData } from "telegraf/typings/scenes";

export interface SessionState extends SceneSessionData {
  awaitingResponse?: boolean;
  question?: Question;
  user?: User;
}

export interface SceneSessionState extends SessionState {
  fromCron?: boolean;
  message?: string;
}
