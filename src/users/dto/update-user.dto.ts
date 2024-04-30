// src/users/dto/create-user.dto.ts
import {IsInt} from 'class-validator';

export class UpdateUserDto {
  @IsInt()
  chat_id: number;
}
