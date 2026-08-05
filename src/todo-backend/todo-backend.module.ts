import { Module } from '@nestjs/common';
import { TodoBackendService } from './todo-backend.service';
import { TodoBackendController } from './todo-backend.controller';

@Module({
  providers: [TodoBackendService],
  controllers: [TodoBackendController],
})
export class TodoBackendModule {}
