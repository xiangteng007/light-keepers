/**
 * Security Configuration
 * 生產環境安全配置
 * 
 * CORS, CSP, Helmet 等安全標頭設定
 */

import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import helmet from 'helmet';

/**
 * 環境類型
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * 判斷當前環境
 */
export function getEnvironment(): Environment {
    const env = process.env.NODE_ENV || 'development';
    if (env === 'production') return 'production';
    if (env === 'staging') return 'staging';
    return 'development';
}

/**
 * 允許的前端來源
 */
const ALLOWED_ORIGINS: Record<Environment, string[]> = {
    development: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
    ],
    staging: [
        'https://staging.lightkeepers.app',
        'https://staging-frontend.lightkeepers.app',
    ],
    production: [
        'https://lightkeepers.app',
        'https://www.lightkeepers.app',
        'https://app.lightkeepers.app',
    ],
};

/**
 * CORS 配置
 */
export function getCorsConfig(): CorsOptions {
    const env = getEnvironment();
    const origins = ALLOWED_ORIGINS[env];

    return {
        origin: (origin, callback) => {
            // 允許無 origin 的請求 (如 mobile apps, Postman)
            if (!origin) {
                callback(null, true);
                return;
            }

            if (origins.includes(origin) || env === 'development') {
                callback(null, true);
            } else {
                callback(new Error(`Origin ${origin} not allowed by CORS`), false);
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'Accept',
            'Origin',
            'X-Request-ID',
            'X-Correlation-ID',
        ],
        exposedHeaders: [
            'X-Request-ID',
            'X-RateLimit-Limit',
            'X-RateLimit-Remaining',
            'X-RateLimit-Reset',
        ],
        maxAge: 86400, // 24 hours
    };
}

/**
 * Helmet (安全標頭) 配置
 */
export function getHelmetConfig() {
    const env = getEnvironment();

    return helmet({
        // Content Security Policy
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    env === 'development' ? "'unsafe-inline'" : '', // 開發時允許內聯腳本
                    'https://cdn.jsdelivr.net',
                    'https://maps.googleapis.com',
                ].filter(Boolean),
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'", // 大多數 CSS-in-JS 需要
                    'https://fonts.googleapis.com',
                ],
                imgSrc: [
                    "'self'",
                    'data:',
                    'blob:',
                    'https://*.googleapis.com',
                    'https://*.gstatic.com',
                    'https://storage.googleapis.com',
                ],
                fontSrc: [
                    "'self'",
                    'https://fonts.gstatic.com',
                ],
                connectSrc: [
                    "'self'",
                    'wss://*.lightkeepers.app',
                    'https://*.googleapis.com',
                    'https://generativelanguage.googleapis.com',
                    env !== 'production' ? 'http://localhost:*' : '',
                    env !== 'production' ? 'ws://localhost:*' : '',
                ].filter(Boolean),
                frameSrc: [
                    "'self'",
                    'https://maps.google.com',
                ],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: env === 'production' ? [] : null,
            },
        },

        // Cross-Origin policies
        crossOriginEmbedderPolicy: false, // 允許嵌入 Google Maps 等
        crossOriginResourcePolicy: { policy: 'cross-origin' },

        // DNS Prefetch
        dnsPrefetchControl: { allow: true },

        // Frameguard (防止 clickjacking)
        frameguard: { action: 'sameorigin' },

        // Hide X-Powered-By
        hidePoweredBy: true,

        // HSTS (HTTP Strict Transport Security)
        hsts: env === 'production' ? {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
        } : false,

        // No Sniff
        noSniff: true,

        // Referrer Policy
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    });
}

/**
 * Rate Limit 配置
 */
export const RATE_LIMIT_CONFIG = {
    // 一般 API
    default: {
        points: 100,        // 100 requests
        duration: 60,       // per minute
        blockDuration: 60,  // block for 1 minute
    },

    // 認證相關
    auth: {
        points: 5,          // 5 attempts
        duration: 300,      // per 5 minutes
        blockDuration: 900, // block for 15 minutes
    },

    // 檔案上傳
    upload: {
        points: 10,         // 10 uploads
        duration: 60,       // per minute
        blockDuration: 300, // block for 5 minutes
    },

    // WebSocket
    websocket: {
        points: 500,        // 500 messages
        duration: 60,       // per minute
        blockDuration: 60,
    },
};

/**
 * 安全相關常數
 */
export const SECURITY_CONSTANTS = {
    // Session 過期時間
    SESSION_TTL: 24 * 60 * 60 * 1000, // 24 hours

    // JWT 過期時間
    JWT_ACCESS_TTL: '1h',
    JWT_REFRESH_TTL: '7d',

    // 密碼規則
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_REQUIRE_UPPERCASE: true,
    PASSWORD_REQUIRE_NUMBER: true,
    PASSWORD_REQUIRE_SPECIAL: true,

    // 最大上傳大小
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5 MB

    // 敏感資料遮罩閾值
    MASK_THRESHOLD_LEVEL: 3,
};
