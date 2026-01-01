import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

// Cloud Run startup timestamp - log immediately
const START_TIME = Date.now();
const GIT_COMMIT = process.env.GIT_COMMIT || process.env.GITHUB_SHA || 'unknown';
console.log('='.repeat(60));
console.log('[STARTUP] Light Keepers API bootstrapping...');
console.log(`[STARTUP] Time: ${new Date().toISOString()}`);
console.log(`[STARTUP] Node: ${process.version}`);
console.log(`[STARTUP] Commit: ${GIT_COMMIT.substring(0, 7)}`);
console.log('='.repeat(60));

async function bootstrap() {
    const bootstrapStart = Date.now();

    try {
        console.log('[STARTUP] Creating NestJS application...');
        const app = await NestFactory.create(AppModule, {
            logger: ['error', 'warn', 'log'],
        });
        console.log(`[STARTUP] NestJS created in ${Date.now() - bootstrapStart}ms`);

        const isProduction = process.env.NODE_ENV === 'production';

        // ===== Cookie Parser (for httpOnly refresh tokens) =====
        app.use(cookieParser());

        // ===== 安全 Headers (Helmet) =====
        app.use(helmet({
            contentSecurityPolicy: isProduction ? {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: [
                        "'self'",
                        "https://light-keepers-api-bsf4y44tja-de.a.run.app",
                    ],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    objectSrc: ["'none'"],
                    frameAncestors: ["'none'"],
                    baseUri: ["'self'"],
                    formAction: ["'self'"],
                },
            } : false, // 開發環境禁用 CSP
            crossOriginEmbedderPolicy: false,
            hsts: {
                maxAge: 31536000, // 1 年
                includeSubDomains: true,
                preload: true,
            },
        }));

        // ===== CORS 配置 =====
        const allowedOrigins = [
            'https://lightkeepers.ngo',
            'https://www.lightkeepers.ngo',
            'https://light-keepers-mvp.web.app',
            'https://light-keepers-mvp.firebaseapp.com',
            // 開發環境才允許 localhost
            ...(!isProduction ? [
                'http://localhost:5173',
                'http://localhost:5174',
                'http://localhost:5175'
            ] : []),
        ];

        app.enableCors({
            origin: process.env.CORS_ORIGIN?.split(',') || allowedOrigins,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            credentials: true,
            allowedHeaders: [
                'Content-Type',
                'Authorization',
                'X-Requested-With',
                'Accept',
            ],
            exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
            maxAge: 86400, // 24 小時
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

        // ===== Swagger/OpenAPI 文檔配置（僅開發環境）=====
        if (!isProduction) {
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
            console.log(`[STARTUP] Swagger 文檔：/${apiPrefix.replace('api/v1', 'api/docs')}`);
        }

        // Cloud Run 需要監聽 0.0.0.0，預設 port 8080
        const port = parseInt(process.env.PORT || '8080', 10);
        const host = '0.0.0.0';

        console.log('[STARTUP] Starting HTTP server...');
        await app.listen(port, host);

        const totalStartupTime = Date.now() - START_TIME;
        console.log('='.repeat(60));
        console.log('✅ Light Keepers API - READY');
        console.log(`📦 Version: 0.1.0`);
        console.log(`🔗 Commit: ${GIT_COMMIT.substring(0, 7)}`);
        console.log(`🌍 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
        console.log(`🔌 Listening on: http://${host}:${port}`);
        console.log(`⏱️  Startup time: ${totalStartupTime}ms`);
        console.log(`📅 Ready at: ${new Date().toISOString()}`);
        console.log('='.repeat(60));

    } catch (error) {
        const failTime = Date.now() - START_TIME;
        console.error('='.repeat(60));
        console.error('❌ STARTUP FAILED');
        console.error(`⏱️  Failed after: ${failTime}ms`);
        console.error(`💥 Error: ${error.message}`);
        console.error(`📋 Stack: ${error.stack}`);
        console.error('='.repeat(60));
        process.exit(1);
    }
}

bootstrap();

