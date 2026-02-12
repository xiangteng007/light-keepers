import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';

// Cloud Run startup timestamp - log immediately
const START_TIME = Date.now();
const GIT_COMMIT = process.env.GIT_COMMIT || process.env.GITHUB_SHA || 'unknown';
const DB_REQUIRED = process.env.DB_REQUIRED !== 'false';

console.log('='.repeat(60));
console.log('[STARTUP] Light Keepers API bootstrapping...');
console.log(`[STARTUP] Time: ${new Date().toISOString()}`);
console.log(`[STARTUP] Node: ${process.version}`);
console.log(`[STARTUP] Commit: ${GIT_COMMIT.substring(0, 7)}`);
console.log(`[STARTUP] DB_REQUIRED: ${DB_REQUIRED}`);
console.log(`[STARTUP] Mode: ${DB_REQUIRED ? 'FULL' : 'HEALTH-ONLY'}`);
console.log('='.repeat(60));

async function bootstrap() {
    const bootstrapStart = Date.now();

    try {
        console.log('[STARTUP] Creating NestJS application...');

        // 根據 DB_REQUIRED 決定載入哪個模組
        // DB_REQUIRED=false → 載入 HealthOnlyModule（用於 CI health check）
        // DB_REQUIRED=true → 載入 AppModule（完整功能）
        let AppModuleToLoad;
        if (DB_REQUIRED) {
            console.log('[STARTUP] Loading full AppModule with database support...');
            const { AppModule } = await import('./app.module');
            AppModuleToLoad = AppModule;
        } else {
            console.log('[STARTUP] Loading HealthOnlyModule (no database)...');
            const { HealthOnlyModule } = await import('./health-only.module');
            AppModuleToLoad = HealthOnlyModule;
        }

        // 初始化 Cloud Error Reporting（僅 production，且優雅降級）
        let cloudErrorReporting = null;
        const isProd = process.env.NODE_ENV === 'production';

        if (isProd && DB_REQUIRED) {
            try {
                const { ErrorReporting } = await import('@google-cloud/error-reporting');
                cloudErrorReporting = new ErrorReporting({
                    projectId: process.env.GCP_PROJECT_ID || 'light-keepers-mvp',
                    reportMode: 'production',
                });
                console.log('[STARTUP] Cloud Error Reporting enabled');
            } catch (err) {
                console.warn('[STARTUP] Cloud Error Reporting initialization failed (will continue without it):', err.message);
                // 繼續執行，不讓 error reporting 阻塞啟動
            }
        }

        const app = await NestFactory.create(AppModuleToLoad, {
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
                        ...(process.env.API_URL ? [process.env.API_URL] : ["https://light-keepers-api-bsf4y44tja-de.a.run.app"]),
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
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
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

        console.log(`[STARTUP] ✓ Port from ENV: ${process.env.PORT || '(using default 8080)'}`);
        console.log(`[STARTUP] ✓ Binding to: ${host}:${port}`);
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

