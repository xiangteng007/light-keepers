import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Swagger API Documentation Setup
 */
export function setupSwagger(app: INestApplication): void {
    const config = new DocumentBuilder()
        .setTitle('光守護者災防平台 API')
        .setDescription(`
## 概述
台灣光守護者協會 AI 災難應變平台 REST API 文件

## 認證
大部分 API 需要 JWT Bearer Token 認證

## 版本
- **v1.0-v3.0**: 核心模組 (志工、事件、物資)
- **v4.0**: 未來擴展 (AR/VR/機器人)
- **v5.0**: 進階擴展 (群眾/AI)
- **v6.0**: 組織特色
- **v7.0**: 深度整合 (LINE/NGO)
- **v8.0**: 數據分析
- **v9.0**: 基礎設施

## 快速連結
- [GitHub Repo](https://github.com/xiangteng007/Emergency-Response)
        `)
        .setVersion('9.0')
        .addBearerAuth({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'Authorization',
            description: 'JWT Token',
            in: 'header',
        })
        .addTag('核心模組', '志工、事件、任務、物資管理')
        .addTag('GIS 地圖', '地圖、POI、路徑規劃')
        .addTag('通訊', 'PTT、WebSocket、即時推播')
        .addTag('AI 服務', '預測、分析、語音、翻譯')
        .addTag('整合', 'LINE、NGO、政府 API')
        .addTag('財務', '捐款、報銷、公開報表')
        .addTag('系統', '快取、日誌、排程')
        .addServer('http://localhost:3000', '本地開發')
        .addServer('https://emergency-response-api-xxxxx.run.app', '正式環境')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
        customSiteTitle: '光守護者 API 文件',
        customfavIcon: '/favicon.ico',
        swaggerOptions: {
            persistAuthorization: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
        },
    });
}
