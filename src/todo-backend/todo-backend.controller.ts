import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtBlacklistGuard } from '../auth/jwt-blacklist.guard';
import { CreateTodoDto, TodoStatus } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { TodoBackendService } from './todo-backend.service';
import { Throttle } from '@nestjs/throttler';

@ApiTags('todos')
@ApiBearerAuth()
// Both guards run on every route in this controller:
//   AuthGuard('jwt')    → verifies the token signature and expiry
//   JwtBlacklistGuard   → rejects tokens that were revoked on logout
@UseGuards(AuthGuard('jwt'), JwtBlacklistGuard)
@Controller('todos')
export class TodoBackendController {
  constructor(private readonly todoService: TodoBackendService) {}

  // ─── Create ─────────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new todo' })
  @ApiResponse({ status: 201, description: 'Todo created successfully.' })
  create(@Req() req, @Body() dto: CreateTodoDto) {
    return this.todoService.create(req.user.userId, dto);
  }

  // ─── Read ────────────────────────────────────────────────────────────────────

  /**
   * GET /todos                         → all todos
   * GET /todos?status=completed        → only completed
   * GET /todos?status=in_progress      → only active
   * GET /todos?search=groceries        → title contains "groceries"
   * GET /todos?status=completed&search=buy → completed AND title contains "buy"
   *
   * Privacy: the service always adds WHERE userId = me — users can never
   * filter or see each other's tasks.
   */
  // @Throttle({ default: { limit: 3, ttl: 3000 } }) 
  @Get()
  @ApiOperation({
    summary: 'Get todos for the logged-in user (with optional filters)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: TodoStatus,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by title (partial match)',
  })
  @ApiResponse({ status: 200, description: 'List of todos returned.' })
  findAll(
    @Req() req,
    @Query('status') status?: TodoStatus,
    @Query('search') search?: string,
  ) {
    return this.todoService.findAll(req.user.userId, status, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single todo by ID' })
  @ApiResponse({ status: 200, description: 'Todo returned.' })
  @ApiResponse({ status: 404, description: 'Todo not found.' })
  findOne(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.todoService.findOne(req.user.userId, id);
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

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

  /**
   * PATCH /todos/:id/toggle
   *
   * Flips the status without sending the full task body.
   *   - in_progress  → completed  (sets completedAt to now)
   *   - completed    → in_progress (clears completedAt)
   */
  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle a todo between in_progress and completed' })
  @ApiResponse({ status: 200, description: 'Todo status toggled.' })
  @ApiResponse({ status: 404, description: 'Todo not found.' })
  toggle(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.todoService.toggle(req.user.userId, id);
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a single todo by ID' })
  @ApiResponse({ status: 200, description: 'Todo deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Todo not found.' })
  remove(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.todoService.remove(req.user.userId, id);
  }

  /**
   * DELETE /todos/completed
   *
   * Wipes every completed task for the logged-in user in a single operation.
   * Returns how many tasks were removed.
   *
   * NOTE: this route MUST be declared before DELETE /todos/:id
   * otherwise NestJS will try to parse "completed" as a numeric :id.
   */
  @Delete('completed')
  @ApiOperation({
    summary: 'Delete all completed todos for the logged-in user',
  })
  @ApiResponse({ status: 200, description: 'Completed todos deleted.' })
  deleteCompleted(@Req() req) {
    return this.todoService.deleteCompleted(req.user.userId);
  }
}
