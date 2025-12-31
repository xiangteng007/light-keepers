import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

// 權限等級定義 (與 implementation_plan.md 一致)
export const PERMISSION_LEVELS = {
    GUEST: 0,           // 一般民眾
    VOLUNTEER: 1,       // 登記志工
    CADRE: 2,           // 幹部
    EXECUTIVE: 3,       // 常務理事 (L30+)
    CHAIRMAN: 4,        // 理事長
    OWNER: 5,           // 系統擁有者
} as const;

// 敏感資料欄位定義
export const SENSITIVE_FIELDS = {
    // 個人識別資料 (L30+)
    idNumber: { minLevel: PERMISSION_LEVELS.EXECUTIVE, label: '身分證字號' },
    birthDate: { minLevel: PERMISSION_LEVELS.EXECUTIVE, label: '出生日期' },
    address: { minLevel: PERMISSION_LEVELS.EXECUTIVE, label: '詳細地址' },

    // 健康資訊 (L30+)
    healthNotes: { minLevel: PERMISSION_LEVELS.EXECUTIVE, label: '健康備註' },

    // 緊急聯絡人 (L20+)
    emergencyContactName: { minLevel: PERMISSION_LEVELS.CADRE, label: '緊急聯絡人' },
    emergencyContactPhone: { minLevel: PERMISSION_LEVELS.CADRE, label: '緊急聯絡電話' },
    emergencyContactRelation: { minLevel: PERMISSION_LEVELS.CADRE, label: '緊急聯絡人關係' },

    // 證照資訊 (L30+)
    certificateNumber: { minLevel: PERMISSION_LEVELS.EXECUTIVE, label: '證照編號' },

    // 車輛資訊 (L30+)
    licensePlate: { minLevel: PERMISSION_LEVELS.EXECUTIVE, label: '車牌號碼' },

    // 保險資訊 (L30+)
    policyNumber: { minLevel: PERMISSION_LEVELS.EXECUTIVE, label: '保單編號' },
} as const;

export type SensitiveField = keyof typeof SENSITIVE_FIELDS;

interface UseSensitiveDataResult {
    // 用戶權限等級
    userLevel: number;

    // 檢查是否可存取特定欄位
    canAccess: (field: SensitiveField) => boolean;

    // 檢查是否可存取任何敏感資料
    canAccessSensitive: boolean;

    // 遮罩敏感資料
    maskValue: (value: string | undefined | null, field: SensitiveField) => string;

    // 取得欄位的原始值或遮罩值
    getValue: <T>(value: T, field: SensitiveField) => T | string;

    // 是否為自己的資料 (自己可以看自己的資料)
    isSelf: (volunteerId?: string) => boolean;
}

/**
 * 敏感資料存取控制 Hook
 * 根據用戶權限等級自動控制敏感資料的顯示
 */
export function useSensitiveData(): UseSensitiveDataResult {
    const { user } = useAuth();

    const userLevel = useMemo(() => {
        if (!user) return PERMISSION_LEVELS.GUEST;

        // 從 user role 取得權限等級
        const roleLevel = (user as any)?.role?.level ?? 0;
        return roleLevel;
    }, [user]);

    const canAccess = (field: SensitiveField): boolean => {
        const fieldConfig = SENSITIVE_FIELDS[field];
        if (!fieldConfig) return true; // 未定義的欄位預設可存取
        return userLevel >= fieldConfig.minLevel;
    };

    const canAccessSensitive = useMemo(() => {
        return userLevel >= PERMISSION_LEVELS.EXECUTIVE;
    }, [userLevel]);

    const maskValue = (value: string | undefined | null, field: SensitiveField): string => {
        if (!value) return '-';
        if (canAccess(field)) return value;

        // 根據欄位類型使用不同的遮罩方式
        if (field === 'idNumber') {
            // 身分證：顯示前後各一碼
            return value.length > 2
                ? `${value[0]}${'*'.repeat(value.length - 2)}${value[value.length - 1]}`
                : '***';
        }

        if (field === 'licensePlate') {
            // 車牌：顯示前兩碼
            return value.length > 2 ? `${value.slice(0, 2)}${'*'.repeat(4)}` : '***';
        }

        if (field === 'emergencyContactPhone' || field === 'policyNumber') {
            // 電話/保單：顯示後四碼
            return value.length > 4 ? `${'*'.repeat(value.length - 4)}${value.slice(-4)}` : '***';
        }

        if (field === 'address') {
            // 地址：顯示區域
            const parts = value.split(/[區市鄉鎮]/);
            return parts[0] ? `${parts[0]}區...` : '***';
        }

        // 預設遮罩
        return '******';
    };

    const getValue = <T,>(value: T, field: SensitiveField): T | string => {
        if (canAccess(field)) return value;
        if (typeof value === 'string') return maskValue(value, field);
        return '******';
    };

    const isSelf = (volunteerId?: string): boolean => {
        if (!volunteerId || !user) return false;
        const userVolunteerId = (user as any)?.volunteerId;
        return userVolunteerId === volunteerId;
    };

    return {
        userLevel,
        canAccess,
        canAccessSensitive,
        maskValue,
        getValue,
        isSelf,
    };
}

/**
 * 敏感資料標籤組件的 Props
 */
export interface SensitiveFieldProps {
    field: SensitiveField;
    value: string | undefined | null;
    showLockIcon?: boolean;
    className?: string;
}
