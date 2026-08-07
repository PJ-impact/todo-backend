import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TodoStatus } from './create-todo.dto';

export class UpdateTodoDto {
  @ApiPropertyOptional({
    example: 'Buy groceries',
    description: 'Updated title for the todo item.',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: 'Milk, eggs, bread and butter',
    description: 'Updated description for the todo item.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: TodoStatus,
    description: 'Updated status. Setting to "completed" will record the completion time.',
  })
  @IsEnum(TodoStatus, {
    message: 'status must be one of: in_progress, completed',
  })
  @IsOptional()
  status?: TodoStatus;
}
