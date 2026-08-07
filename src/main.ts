import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Set global route prefix to /api
  app.setGlobalPrefix('api');

  // 2. Enable global validation pipe
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

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

  // Serve Swagger UI at /docs so it doesn't conflict with /api endpoint routes
  SwaggerModule.setup('/api/v1/docs', app, documentFactory);

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
