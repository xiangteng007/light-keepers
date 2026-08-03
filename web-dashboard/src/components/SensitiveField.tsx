import React from 'react';
import { useSensitiveData, SENSITIVE_FIELDS } from '../hooks/useSensitiveData';
import type { SensitiveField as SensitiveFieldType } from '../hooks/useSensitiveData';
import { Badge } from '../design-system';
import { LockIcon } from '../design-system/icons';
import './SensitiveField.css';

interface SensitiveFieldDisplayProps {
    /** 欄位類型 */
    field: SensitiveFieldType;
    /** 原始值 */
    value: string | undefined | null;
    /** 是否顯示鎖頭圖示 */
    showLockIcon?: boolean;
    /** 自訂 className */
    className?: string;
    /** 是否為自己的資料 (可略過權限檢查) */
    isSelfData?: boolean;
}

/**
 * 敏感資料欄位組件
 * 自動根據用戶權限控制顯示內容
 */
export function SensitiveFieldDisplay({
    field,
    value,
    showLockIcon = true,
    className = '',
    isSelfData = false,
}: SensitiveFieldDisplayProps) {
    const { canAccess, maskValue } = useSensitiveData();

    const hasAccess = isSelfData || canAccess(field);
    const displayValue = hasAccess ? (value || '-') : maskValue(value, field);

    return (
        <span className={`sensitive-field ${hasAccess ? '' : 'sensitive-field--masked'} ${className}`}>
            {displayValue}
            {!hasAccess && showLockIcon && (
                <span className="sensitive-field__lock" title="需要更高權限查看" aria-hidden="true"><LockIcon size={16} /></span>
            )}
        </span>
    );
}

interface SensitiveLabelProps {
    /** 欄位類型 */
    field: SensitiveFieldType;
    /** 自訂標籤文字 (預設使用 SENSITIVE_FIELDS 定義) */
    label?: string;
    /** 是否顯示權限徽章 */
    showBadge?: boolean;
}

/**
 * 敏感資料標籤組件
 * 在標籤旁顯示權限要求提示
 */
export function SensitiveLabel({
    field,
    label,
    showBadge = true,
}: SensitiveLabelProps) {
    const { canAccess } = useSensitiveData();
    const fieldConfig = SENSITIVE_FIELDS[field];
    const displayLabel = label || fieldConfig?.label || field;
    const hasAccess = canAccess(field);

    return (
        <span className="sensitive-label">
            {displayLabel}
            {showBadge && !hasAccess && (
                <Badge variant="info" size="sm" className="sensitive-label__badge">
                    <LockIcon size={16} aria-hidden="true" /> 限權限
                </Badge>
            )}
        </span>
    );
}

interface SensitiveRowProps {
    /** 欄位類型 */
    field: SensitiveFieldType;
    /** 原始值 */
    value: string | undefined | null;
    /** 自訂標籤 */
    label?: string;
    /** 是否顯示行 (權限不足時可隱藏) */
    hideIfNoAccess?: boolean;
    /** 是否為自己的資料 */
    isSelfData?: boolean;
}

/**
 * 敏感資料行組件
 * 顯示標籤和值的完整行
 */
export function SensitiveRow({
    field,
    value,
    label,
    hideIfNoAccess = false,
    isSelfData = false,
}: SensitiveRowProps) {
    const { canAccess } = useSensitiveData();
    const hasAccess = isSelfData || canAccess(field);

    if (hideIfNoAccess && !hasAccess) {
        return null;
    }

    return (
        <div className="sensitive-row">
            <span className="sensitive-row__label">
                <SensitiveLabel field={field} label={label} showBadge={!hasAccess} />
            </span>
            <span className="sensitive-row__value">
                <SensitiveFieldDisplay field={field} value={value} isSelfData={isSelfData} />
            </span>
        </div>
    );
}

interface SensitiveGuardProps {
    /** 需要的最低欄位權限 */
    requiredField?: SensitiveFieldType;
    /** 或者直接指定需要的權限等級 */
    requiredLevel?: number;
    /** 權限不足時顯示的內容 */
    fallback?: React.ReactNode;
    /** 權限足夠時顯示的內容 */
    children: React.ReactNode;
}

/**
 * 敏感資料守衛組件
 * 根據權限控制子組件的顯示
 */
export function SensitiveGuard({
    requiredField,
    requiredLevel,
    fallback = null,
    children,
}: SensitiveGuardProps) {
    const { canAccess, userLevel } = useSensitiveData();

    let hasAccess = true;

    if (requiredField) {
        hasAccess = canAccess(requiredField);
    } else if (requiredLevel !== undefined) {
        hasAccess = userLevel >= requiredLevel;
    }

    if (!hasAccess) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
