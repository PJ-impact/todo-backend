import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum TodoStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export class CreateTodoDto {
  @ApiProperty({
    example: 'Buy groceries',
    description: 'A short title for the todo item.',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    example: 'Milk, eggs, bread and butter',
    description: 'An optional longer description of the todo.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: TodoStatus,
    default: TodoStatus.IN_PROGRESS,
    description: 'Status of the todo. Defaults to "in_progress" if not provided.',
  })
  @IsEnum(TodoStatus, {
    message: 'status must be one of: in_progress, completed',
  })
  @IsOptional()
  status?: TodoStatus;
}
