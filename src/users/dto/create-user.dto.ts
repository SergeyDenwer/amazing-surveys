// src/users/dto/create-user.dto.ts
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  telegram_id: number;

  @IsBoolean()
  @IsOptional()
  is_bot?: boolean;

  @IsString()
  @IsOptional()
  language_code?: string;
}
