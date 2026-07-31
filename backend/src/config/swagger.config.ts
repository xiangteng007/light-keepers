/**
 * Swagger/OpenAPI Configuration
 * Auto-generated API documentation
 */

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication, Logger } from '@nestjs/common';

const logger = new Logger('SwaggerConfig');

export function setupSwagger(app: INestApplication): void {
    const config = new DocumentBuilder()
        .setTitle('光守護者災防平台 API')
        .setDescription(`
# 光守護者 AI 災難防範平台 API 文件

## 概述
此 API 提供災難應變平台的所有後端服務端點，包括：
- 使用者認證與授權
- 災情回報與 SOS 緊急求救
- 任務派遣與志工管理
- 物資調度與捐贈管理
- 即時通知與 LINE 整合
- AI 分析與預測

## 認證方式
大多數端點需要 JWT Bearer Token 認證：
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

## 回應格式
所有回應遵循統一格式：
\`\`\`json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
\`\`\`

## 錯誤處理
錯誤回應包含錯誤代碼與訊息：
\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERR_CODE",
    "message": "錯誤描述"
  }
}
\`\`\`
        `)
        .setVersion('2.1.0')
        .setContact(
            '光守護者技術團隊',
            'https://lightkeepers.org',
            'tech@lightkeepers.org'
        )
        .setLicense('MIT', 'https://opensource.org/licenses/MIT')
        .addServer('http://localhost:3000', '開發環境')
        .addServer('https://api.lightkeepers.org', '正式環境')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'JWT 存取權杖',
            },
            'JWT-auth'
        )
        .addApiKey(
            {
                type: 'apiKey',
                in: 'header',
                name: 'X-API-Key',
                description: 'API 金鑰 (用於 Webhook 呼叫)',
            },
            'API-Key'
        )
        // Core Modules
        .addTag('auth', '認證與授權')
        .addTag('users', '使用者管理')
        .addTag('reports', '災情回報')
        .addTag('sos', 'SOS 緊急求救')
        .addTag('tasks', '任務派遣')
        .addTag('volunteers', '志工管理')
        .addTag('resources', '物資管理')
        .addTag('donations', '捐贈管理')
        .addTag('notifications', '通知系統')
        .addTag('analytics', 'AI 分析')
        .addTag('webhooks', 'Webhook 管理')
        .addTag('system', '系統設定')
        // Integration Modules
        .addTag('line', 'LINE 整合')
        .addTag('line-liff', 'LINE LIFF Mini App')
        .addTag('weather', '氣象資料')
        .addTag('voice', '語音通話')
        .addTag('fire-119', '消防署 119 整合')
        // Disaster Response Modules
        .addTag('shelters', '避難所管理')
        .addTag('mobilization', '志工動員')
        .addTag('triage', '傷患分類')
        .addTag('structural-assessment', '建物結構評估')
        .addTag('reunification', '家庭重聚')
        .addTag('dispatch', '派遣管理')
        // Governance Modules
        .addTag('audit', '稽核日誌')
        .addTag('approvals', '審批管理')
        .build();

    const document = SwaggerModule.createDocument(app, config, {
        operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    });

    SwaggerModule.setup('api/docs', app, document, {
        customSiteTitle: '光守護者 API 文件',
        customfavIcon: '/favicon.ico',
        customCss: `
            .swagger-ui .topbar { display: none }
            .swagger-ui .info .title { color: #d4af37 }
            .swagger-ui .opblock.opblock-post { border-color: #10b981 }
            .swagger-ui .opblock.opblock-get { border-color: #3b82f6 }
            .swagger-ui .opblock.opblock-put { border-color: #f59e0b }
            .swagger-ui .opblock.opblock-delete { border-color: #ef4444 }
        `,
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            docExpansion: 'none',
            filter: true,
            showExtensions: true,
        },
    });

    logger.log('Swagger API docs available at /api/docs');
}

// API Response DTOs for Swagger documentation
export class ApiResponseDto<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: {
        code: string;
        message: string;
    };
}

export class PaginatedResponseDto<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
