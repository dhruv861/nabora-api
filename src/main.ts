import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { initFirebaseAdmin } from './config/firebase-admin.config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const helmet = require('helmet');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const compression = require('compression');

async function bootstrap() {
  // Initialize Firebase Admin before anything else
  initFirebaseAdmin();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ─── Global Prefix ──────────────────────────────────────────────────────────
  app.setGlobalPrefix('v1');

  // ─── Middleware ─────────────────────────────────────────────────────────────
  app.use(helmet());
  app.use(compression());

  // ─── CORS ───────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3001',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // ─── Static Files (local storage dev mode) ──────────────────────────────────
  if (process.env.STORAGE_PROVIDER === 'local') {
    app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });
    console.log('[Storage] Serving local uploads at /uploads');
  }

  // ─── Global Pipes ───────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Global Interceptors ────────────────────────────────────────────────────
  app.useGlobalInterceptors(new ResponseInterceptor());

  // ─── Global Filters ─────────────────────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ─── Swagger ─────────────────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nabora API')
    .setDescription('Hyperlocal Workforce Marketplace API — v1')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication — OTP / Firebase')
    .addTag('users', 'User profiles and worker profiles')
    .addTag('skills', 'Skill catalogue')
    .addTag('upload', 'File upload')
    .addTag('jobs', 'Job listings and feed')
    .addTag('applications', 'Job applications')
    .addTag('hires', 'Hire management')
    .addTag('organizations', 'Organization management')
    .addTag('events', 'Event management')
    .addTag('attendance', 'Attendance tracking')
    .addTag('chat', 'Messaging')
    .addTag('notifications', 'Notifications')
    .addTag('ratings', 'Ratings and reviews')
    .addTag('invoices', 'Invoice management')
    .addTag('disputes', 'Dispute resolution')
    .addTag('admin', 'Admin panel')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // ─── Start ───────────────────────────────────────────────────────────────────
  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port);
  console.log(`[Nabora API] Running on http://localhost:${port}/v1`);
  console.log(`[Swagger]    Docs at  http://localhost:${port}/docs`);
}

bootstrap().catch(console.error);
