import {IsInt, IsNotEmpty, IsString} from 'class-validator';

export class CreateResponseDto {
  @IsInt()
  @IsNotEmpty()
  user_id: number;

  @IsInt()
  @IsNotEmpty()
  question_id: number;

  @IsString()
  @IsNotEmpty()
  choice: string;
}
