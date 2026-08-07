import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { TodoBackendService } from './todo-backend.service';

@ApiTags('todos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt')) // All routes require a valid JWT token
@Controller('todos')
export class TodoBackendController {
  constructor(private readonly todoService: TodoBackendService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new todo' })
  @ApiResponse({ status: 201, description: 'Todo created successfully.' })
  create(@Req() req, @Body() dto: CreateTodoDto) {
    return this.todoService.create(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all todos for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of todos returned.' })
  findAll(@Req() req) {
    return this.todoService.findAll(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single todo by ID' })
  @ApiResponse({ status: 200, description: 'Todo returned.' })
  @ApiResponse({ status: 404, description: 'Todo not found.' })
  findOne(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.todoService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a todo by ID' })
  @ApiResponse({ status: 200, description: 'Todo updated successfully.' })
  @ApiResponse({ status: 404, description: 'Todo not found.' })
  update(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTodoDto,
  ) {
    return this.todoService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a todo by ID' })
  @ApiResponse({ status: 200, description: 'Todo deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Todo not found.' })
  remove(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.todoService.remove(req.user.userId, id);
  }
}
