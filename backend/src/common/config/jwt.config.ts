import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

const logger = new Logger('JwtConfig');

/**
 * 已外洩的歷史硬編碼 fallback 值。
 *
 * 這些字串曾經以明碼寫死在原始碼中並推上公開 repo，任何人都能用它們
 * 偽造任意等級（含 OWNER）的 token。若偵測到環境變數仍然是這些值，
 * 代表 secret 尚未輪替，必須立即更換。
 */
const KNOWN_LEAKED_SECRETS = [
    'light-keepers-jwt-secret-2024',
    'offline-fallback-secret',
];

/** 建議的最小密鑰長度（bytes）。低於此長度僅警告，不阻擋啟動。 */
const RECOMMENDED_MIN_LENGTH = 32;

function assertUsableSecret(secret: string | undefined, varName: string): string {
    if (!secret || secret.trim().length === 0) {
        throw new Error(
            `[SECURITY] 缺少必要的環境變數 ${varName}。` +
            `為避免退回硬編碼的預設密鑰導致任何人都能偽造 token，` +
            `應用程式拒絕啟動。請在部署環境掛載 ${varName}` +
            `（Cloud Run 請使用 --set-secrets=${varName}=jwt-secret:latest）。`,
        );
    }

    if (KNOWN_LEAKED_SECRETS.includes(secret)) {
        logger.error(
            `[SECURITY] ${varName} 目前的值是已外洩的歷史預設密鑰，` +
            `任何人都可以用它偽造 token。請立刻輪替此 secret。`,
        );
    } else if (secret.length < RECOMMENDED_MIN_LENGTH) {
        logger.warn(
            `[SECURITY] ${varName} 長度僅 ${secret.length} 字元，` +
            `建議至少 ${RECOMMENDED_MIN_LENGTH} 字元的高熵隨機字串。`,
        );
    }

    return secret;
}

/**
 * 取得 JWT 簽章密鑰，缺少時直接 throw（fail-fast）。
 *
 * 刻意「不提供」任何 fallback 預設值：設定錯誤時寧可讓容器起不來，
 * 也不能讓 production 靜默地使用可預測的密鑰。
 */
export function getRequiredJwtSecret(configService?: ConfigService): string {
    const secret = configService?.get<string>('JWT_SECRET') ?? process.env.JWT_SECRET;
    return assertUsableSecret(secret, 'JWT_SECRET');
}

/**
 * 取得離線 mesh 用的簽章密鑰。
 *
 * 優先使用 JWT_OFFLINE_SECRET，未設定時退回 JWT_SECRET；
 * 兩者皆無則 throw，不再退回硬編碼的 'offline-fallback-secret'。
 */
export function getRequiredOfflineSecret(configService?: ConfigService): string {
    const offline = configService?.get<string>('JWT_OFFLINE_SECRET') ?? process.env.JWT_OFFLINE_SECRET;
    if (offline && offline.trim().length > 0) {
        return assertUsableSecret(offline, 'JWT_OFFLINE_SECRET');
    }
    return getRequiredJwtSecret(configService);
}
