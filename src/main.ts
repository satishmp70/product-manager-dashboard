import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  console.log('DATABASE_URL from process.env:', process.env.DATABASE_URL);
  const app = await NestFactory.create(AppModule);

  // Path prefix
  app.setGlobalPrefix('api/v1');

  // Security Headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // Compression — skip for report streaming endpoints to prevent binary corruption
  app.use((req: any, res: any, next: any) => {
    if (req.path && req.path.startsWith('/api/v1/reports')) {
      return next();
    }
    return compression()(req, res, next);
  });

  // Logging
  app.use(morgan('dev'));

  // Serve static upload directory
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  app.use('/uploads', express.static(join(process.cwd(), uploadDir)));

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
    exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length'],
  });

  // Global validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Product Management API')
    .setDescription('Enterprise Product Management System API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api/v1`);
  console.log(`API Docs available at: http://localhost:${port}/api/docs`);
}
bootstrap();
