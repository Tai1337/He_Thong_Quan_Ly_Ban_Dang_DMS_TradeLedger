import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // Đặt global prefix /api để đồng bộ với tất cả router hiện có
  app.setGlobalPrefix('api');

  const PORT = process.env.PORT || 3001;
  await app.listen(PORT);
  console.log(`NestJS Backend Server đang chạy tại http://localhost:${PORT}/api`);
}

bootstrap();
