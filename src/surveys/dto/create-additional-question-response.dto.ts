import { IsNotEmpty, IsEnum, IsString, IsOptional } from 'class-validator';
import {AdditionalQuestions} from "../../constants/additional-questions.enum";

export class CreateAdditionalQuestionResponseDto {
  // @IsNotEmpty()
  user_id: number;

  @IsEnum(AdditionalQuestions)
  question: AdditionalQuestions;

  @IsString()
  @IsNotEmpty()
  answer: string;

  @IsOptional()
  response_id?: number;
}
