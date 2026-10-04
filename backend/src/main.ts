import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: (origin, callback) => {
      // Cho phép mọi origin gửi kèm cookie / credentials
      callback(null, true);
    },
    credentials: true,
  });

  // Đặt global prefix /api để đồng bộ với tất cả router hiện có
  app.setGlobalPrefix('api');

  const PORT = process.env.PORT || 3001;
  await app.listen(PORT);
  console.log(`NestJS Backend Server đang chạy tại http://localhost:${PORT}/api`);
}

bootstrap();
