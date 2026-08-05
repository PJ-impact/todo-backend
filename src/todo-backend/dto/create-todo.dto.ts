import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateTodoDto {
  @IsString()
  @IsNotEmpty()
  title!: string; // <-- Added '!' right here

  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;
}