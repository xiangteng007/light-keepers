import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // 啟用 CORS - 限制允許的網域
    app.enableCors({
        origin: process.env.CORS_ORIGIN?.split(',') || [
            'https://lightkeepers.ngo',
            'https://www.lightkeepers.ngo',
            'https://light-keepers-dashboard.vercel.app',
            'https://light-keepers-mvp.web.app',
            'https://light-keepers-mvp.firebaseapp.com',
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:5175'
        ],
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
    const apiPrefix = process.env.API_PREFIX || 'api/v1';
    app.setGlobalPrefix(apiPrefix);

    // ===== Swagger/OpenAPI 文檔配置 =====
    const swaggerConfig = new DocumentBuilder()
        .setTitle('Light Keepers API')
        .setDescription(`
## 光守護者防災平台 API 文檔

### 認證方式
部分 API 需要 JWT Token 認證，請在 Authorization header 中加入：
\`Bearer <your-token>\`

### 模組說明
- **auth** - 認證與授權
- **accounts** - 帳戶管理
- **reports** - 災情回報
- **events** - 災情事件
- **tasks** - 任務分派
- **volunteers** - 志工管理
- **resources** - 物資管理
- **community** - 社群牆
- **analytics** - 數據分析
- **integrations** - 外部整合
- **admin/backup** - 數據備份
        `)
        .setVersion('1.0.0')
        .setContact(
            '曦望燈塔救援協會',
            'https://lightkeepers.ngo',
            'support@lightkeepers.ngo'
        )
        .addBearerAuth(
            { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            'JWT-auth'
        )
        .addTag('auth', '認證與授權')
        .addTag('accounts', '帳戶管理')
        .addTag('reports', '災情回報')
        .addTag('events', '災情事件')
        .addTag('tasks', '任務分派')
        .addTag('volunteers', '志工管理')
        .addTag('resources', '物資管理')
        .addTag('community', '社群牆')
        .addTag('analytics', '數據分析與預測')
        .addTag('integrations', '外部服務整合')
        .addTag('backup', '數據備份與還原')
        .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            docExpansion: 'none',
            filter: true,
            showRequestDuration: true,
        },
        customSiteTitle: 'Light Keepers API 文檔',
        customCss: '.swagger-ui .topbar { display: none }',
    });

    console.log(`📚 Swagger 文檔：/${apiPrefix.replace('api/v1', 'api/docs')}`);

    // Cloud Run 需要監聽 0.0.0.0，預設 port 8080
    const port = process.env.PORT || 8080;
    const host = '0.0.0.0';
    await app.listen(port, host);

    console.log(`🚀 Light Keepers API 啟動於 http://${host}:${port}`);
}

bootstrap();
