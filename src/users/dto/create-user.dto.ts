// src/users/dto/create-user.dto.ts
import {IsBoolean, IsInt, IsOptional, IsString} from 'class-validator';

export class CreateUserDto {
  @IsInt()
  telegram_id: number;

  @IsInt()
  chat_id: number;

  @IsBoolean()
  @IsOptional()
  is_bot?: boolean;

  @IsString()
  @IsOptional()
  language_code?: string;
}
