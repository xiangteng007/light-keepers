/**
 * Sensitive Data Masking Interceptor
 * 敏感資料遮罩攔截器
 * 
 * 根據用戶權限等級自動遮罩敏感欄位
 * roleLevel < 3 的用戶會看到遮罩後的資料
 */

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

/**
 * 需要遮罩的欄位類型
 */
export type SensitiveFieldType = 'phone' | 'email' | 'idNumber' | 'address' | 'bankAccount' | 'name';

/**
 * 欄位遮罩配置
 */
export interface MaskConfig {
    field: string;
    type: SensitiveFieldType;
    minLevel?: number;  // 低於此等級會遮罩 (預設 3)
}

/**
 * 裝飾器: 標記需要遮罩的欄位
 */
export const SENSITIVE_FIELDS_KEY = 'sensitiveFields';
export const SensitiveFields = (config: MaskConfig[]): MethodDecorator => {
    return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(SENSITIVE_FIELDS_KEY, config, descriptor.value);
        return descriptor;
    };
};

/**
 * 遮罩函數
 */
export const maskFunctions: Record<SensitiveFieldType, (value: string) => string> = {
    phone: (v) => {
        if (!v || v.length < 4) return '****';
        return v.slice(0, 3) + '****' + v.slice(-3);
    },
    email: (v) => {
        if (!v || !v.includes('@')) return '****@****.***';
        const [local, domain] = v.split('@');
        if (local.length <= 2) return '*'.repeat(local.length) + '@' + domain;
        return local[0] + '*'.repeat(local.length - 2) + local.slice(-1) + '@' + domain;
    },
    idNumber: (v) => {
        if (!v || v.length < 4) return '**********';
        return v.slice(0, 2) + '*'.repeat(v.length - 4) + v.slice(-2);
    },
    address: (v) => {
        if (!v || v.length < 10) return '****市****區****';
        // 保留縣市，遮罩其餘
        const match = v.match(/^(.{2,3}[市縣])/);
        if (match) {
            return match[1] + '***' + '(詳細地址已隱藏)';
        }
        return v.slice(0, 3) + '***' + '(詳細地址已隱藏)';
    },
    bankAccount: (v) => {
        if (!v || v.length < 8) return '****-****-****';
        return v.slice(0, 4) + '-****-' + v.slice(-4);
    },
    name: (v) => {
        if (!v || v.length < 2) return '*';
        if (v.length === 2) return v[0] + '*';
        return v[0] + '*'.repeat(v.length - 2) + v.slice(-1);
    },
};

/**
 * 預設敏感欄位映射
 */
const DEFAULT_SENSITIVE_FIELDS: MaskConfig[] = [
    { field: 'phone', type: 'phone', minLevel: 3 },
    { field: 'mobile', type: 'phone', minLevel: 3 },
    { field: 'email', type: 'email', minLevel: 2 },
    { field: 'idNumber', type: 'idNumber', minLevel: 4 },
    { field: 'id_number', type: 'idNumber', minLevel: 4 },
    { field: 'address', type: 'address', minLevel: 3 },
    { field: 'homeAddress', type: 'address', minLevel: 3 },
    { field: 'emergencyContactPhone', type: 'phone', minLevel: 3 },
    { field: 'emergency_contact_phone', type: 'phone', minLevel: 3 },
    { field: 'emergencyContactName', type: 'name', minLevel: 3 },
    { field: 'bankAccount', type: 'bankAccount', minLevel: 4 },
];

@Injectable()
export class SensitiveDataMaskingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(SensitiveDataMaskingInterceptor.name);

    constructor(private reflector: Reflector) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const roleLevel = user?.roleLevel ?? 0;

        // 從方法取得自訂敏感欄位配置
        const handler = context.getHandler();
        const customConfig = this.reflector.get<MaskConfig[]>(SENSITIVE_FIELDS_KEY, handler);
        const fieldsConfig = customConfig || DEFAULT_SENSITIVE_FIELDS;

        return next.handle().pipe(
            map((data) => {
                if (!data) return data;
                return this.maskData(data, roleLevel, fieldsConfig);
            }),
        );
    }

    private maskData(data: unknown, roleLevel: number, config: MaskConfig[]): unknown {
        if (Array.isArray(data)) {
            return data.map((item) => this.maskData(item, roleLevel, config));
        }

        if (data && typeof data === 'object') {
            const masked = { ...data } as Record<string, unknown>;

            for (const { field, type, minLevel = 3 } of config) {
                if (roleLevel < minLevel && masked[field]) {
                    const original = masked[field];
                    masked[field] = maskFunctions[type](String(original));
                }
            }

            // 遞迴處理嵌套物件
            for (const key of Object.keys(masked)) {
                if (masked[key] && typeof masked[key] === 'object' && !config.some(c => c.field === key)) {
                    masked[key] = this.maskData(masked[key], roleLevel, config);
                }
            }

            return masked;
        }

        return data;
    }
}

/**
 * 全域敏感資料遮罩 (用於手動調用)
 */
export function maskSensitiveData(
    data: unknown,
    roleLevel: number,
    customFields?: MaskConfig[],
): unknown {
    const config = customFields || DEFAULT_SENSITIVE_FIELDS;

    if (Array.isArray(data)) {
        return data.map((item) => maskSensitiveData(item, roleLevel, config));
    }

    if (data && typeof data === 'object') {
        const masked = { ...data } as Record<string, unknown>;

        for (const { field, type, minLevel = 3 } of config) {
            if (roleLevel < minLevel && masked[field]) {
                masked[field] = maskFunctions[type](String(masked[field]));
            }
        }

        return masked;
    }

    return data;
}
