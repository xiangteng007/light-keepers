import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // 啟用 CORS
    app.enableCors({
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        credentials: true,
    });

    // 全域驗證管道
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));

    // API 前綴
    app.setGlobalPrefix(process.env.API_PREFIX || 'api/v1');

    const port = process.env.PORT || 3000;
    await app.listen(port);

    console.log(`🚀 Light Keepers API 啟動於 http://localhost:${port}`);
}

bootstrap();
