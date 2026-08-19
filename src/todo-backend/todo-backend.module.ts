import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { TodoBackendController } from './todo-backend.controller';
import { TodoBackendService } from './todo-backend.service';

@Module({
  // AuthModule is imported so JwtBlacklistGuard (exported from AuthModule)
  // can be resolved when applied as a guard in TodoBackendController
  imports: [DatabaseModule, AuthModule],
  providers: [TodoBackendService],
  controllers: [TodoBackendController],
})
export class TodoBackendModule {}
