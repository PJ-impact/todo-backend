import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Set global route prefix to /api
  app.setGlobalPrefix('api');

  // 2. Enable URI versioning (/v1, /v2, etc.)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // 3. Configure Swagger UI
  const config = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);

  // Serve Swagger UI at /docs so it doesn't conflict with /api endpoint routes
  SwaggerModule.setup('/api/v1/docs', app, documentFactory);

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
