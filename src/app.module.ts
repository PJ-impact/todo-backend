// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core'; // 👈 Binds the guard globally
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'; 

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TodoBackendModule } from './todo-backend/todo-backend.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { AutoWipeService } from './auth/auto-wipe.service';
import { UsersService } from './users/users.service';

@Module({
  imports: [
    // Load .env globally — available in every module via ConfigService
    ConfigModule.forRoot({ isGlobal: true }),

    // ScheduleModule enables the @Cron() decorator used in AutoWipeService.
    // forRoot() initialises the scheduler once at app startup.
    ScheduleModule.forRoot(),

        // Configures the global rate limit rules and custom error messages
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000, // 1 minute in milliseconds
          limit: 60,   // Max requests allowed per IP in the ttl window
        },
      ],
      
      errorMessage: () => JSON.stringify({
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Security Alert: You are logging in or sending requests too fast. Please wait a moment.',
        timestamp: new Date().toISOString(),
      }),
    }),


    TodoBackendModule,
    DatabaseModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // AutoWipeService needs UsersService and the DB provider.
    // DatabaseModule is imported above so DRIZZLE token is available here.
    UsersService,
    AutoWipeService,

    // Binds ThrottlerGuard globally across your entire application
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
