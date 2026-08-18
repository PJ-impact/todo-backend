// main.ts
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, VersioningType, ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler'; 
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';


@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    response.status(429).json({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Security Alert: You are logging in or sending requests too fast. Please wait a moment.',
      timestamp: new Date().toISOString(),
    });
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.getHttpAdapter().getInstance().set('trust proxy', 'loopback, linklocal, uniquelocal');

  
  app.useGlobalFilters(new ThrottlerExceptionFilter());

  // 1. Set global route prefix to /api
  app.setGlobalPrefix('api');

  // 2. Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  // 2. Enable URI versioning (/v1, /v2, etc.)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // 3. Configure Swagger UI
  const config = new DocumentBuilder()
    .setTitle('Todo App API')
    .setDescription('REST API for the Todo backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/api/v1/docs', app, documentFactory);

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();

