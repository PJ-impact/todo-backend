import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TodoBackendController } from './todo-backend.controller';
import { TodoBackendService } from './todo-backend.service';

@Module({
  imports: [DatabaseModule],
  providers: [TodoBackendService],
  controllers: [TodoBackendController],
})
export class TodoBackendModule {}
