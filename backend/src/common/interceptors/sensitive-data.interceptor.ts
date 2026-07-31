/**
 * SensitiveDataInterceptor - 敏感個資遮罩攔截器 (F-M2)
 *
 * 對應 docs/audit/04-security-and-governance.md「敏感資料遮罩實作」。
 *
 * 規則：
 * 1. roleLevel >= 3（DIRECTOR）→ 不遮罩，直接回傳原物件（不走訪，零成本）。
 * 2. 端點標記 @SkipSensitiveMask() → 不遮罩（供匯出／列印等已由 L3+ guard 保護的端點使用）。
 * 3. 其餘情況遮罩 SENSITIVE_FIELD_GROUPS 登記的欄位，
 *    但「本人資料」不遮罩——回應物件的 id / accountId / userId 等於呼叫者的 account id 時，
 *    該物件連同其子樹整個跳過。
 *
 * 掛載方式（刻意不設為全域，避免對非個資端點造成無謂走訪與誤遮罩）：
 *
 * ```ts
 * @Controller('volunteers')
 * @UseInterceptors(SensitiveDataInterceptor)
 * export class VolunteersController {}
 * ```
 */

import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
    SELF_IDENTITY_FIELDS,
    SENSITIVE_MASKERS,
    SENSITIVE_MASK_MIN_ROLE_LEVEL,
    SensitiveMaskType,
    getSensitiveMaskType,
    normalizeFieldName,
} from '../constants/sensitive-fields.constants';

/** @SkipSensitiveMask() 的 metadata key */
export const SKIP_SENSITIVE_MASK_KEY = 'skipSensitiveMask';

/**
 * 標記端點略過敏感資料遮罩。
 *
 * 僅限以下兩種情境，其餘一律不得使用——掛在其他端點等同於關閉 F-M2 防護：
 *
 * 1. **已由 L3+ guard 保護的匯出／列印端點**：接收者本就有權讀取完整個資，
 *    略過遮罩可省下大型 payload 的走訪成本。
 * 2. **回應不含個資、但欄位名稱與清單相撞的端點**：例如收容所（Shelter）的 `address`
 *    是設施地點而非個人住址，遮罩會讓志工無法導航到收容所。
 *
 * @example
 * @Get('export')
 * @RequiredLevel(ROLE_LEVELS.DIRECTOR)
 * @SkipSensitiveMask()
 * exportAll() {}
 */
export const SkipSensitiveMask = () => SetMetadata(SKIP_SENSITIVE_MASK_KEY, true);

/**
 * 遞迴深度上限。
 * 一般 REST 回應（含 { success, data: [...] } 包裝與一層關聯）深度遠低於此值，
 * 設上限是為了避免異常巨大／異常巢狀的 payload 拖垮回應時間。
 */
const MAX_TRAVERSAL_DEPTH = 8;

/**
 * 判斷物件是否應該遞迴走訪。
 * Date / Buffer / RegExp / Map / Set 等特殊物件視為葉節點，避免破壞序列化結果。
 */
function isTraversable(value: object): boolean {
    if (value instanceof Date) return false;
    if (value instanceof RegExp) return false;
    if (value instanceof Map || value instanceof Set) return false;
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return false;
    return true;
}

/** 只有字串／數字（以及生日的 Date）才套用遮罩，避免把物件誤轉成字串 */
function isMaskableValue(value: unknown, maskType: SensitiveMaskType): boolean {
    if (typeof value === 'string') return value.length > 0;
    if (typeof value === 'number') return true;
    if (maskType === 'birthDate' && value instanceof Date) return true;
    return false;
}

/** 回應物件是否為呼叫者本人的資料 */
function isSelfRecord(record: Record<string, unknown>, selfId: string | null): boolean {
    if (!selfId) return false;
    for (const key of Object.keys(record)) {
        if (!SELF_IDENTITY_FIELDS.has(normalizeFieldName(key))) continue;
        if (record[key] === selfId) return true;
    }
    return false;
}

/**
 * 走訪並遮罩節點。
 *
 * 效能設計（copy-on-write）：
 * 沒有任何欄位被遮罩時直接回傳「原本的 reference」，不做任何複製；
 * 只有實際發生變更的物件才會被淺複製一份。
 * 因此大型列表中不含敏感欄位的節點完全不產生額外配置，也不會整棵樹 deep clone。
 *
 * `path` 記錄目前遞迴路徑上的物件，用來防止循環引用造成無限遞迴。
 * （實務上帶循環引用的回應無法被 JSON 序列化，這裡純屬防禦。）
 */
function maskNode(
    node: unknown,
    selfId: string | null,
    depth: number,
    path: WeakSet<object>,
): unknown {
    if (node === null || typeof node !== 'object') return node;
    if (depth > MAX_TRAVERSAL_DEPTH) return node;
    if (!isTraversable(node)) return node;
    if (path.has(node)) return node;

    path.add(node);
    try {
        if (Array.isArray(node)) {
            let changed = false;
            const result: unknown[] = new Array(node.length);
            for (let i = 0; i < node.length; i++) {
                const maskedItem = maskNode(node[i], selfId, depth + 1, path);
                result[i] = maskedItem;
                if (maskedItem !== node[i]) changed = true;
            }
            return changed ? result : node;
        }

        const record = node as Record<string, unknown>;

        // 本人資料：整個物件（含子樹）不遮罩
        if (isSelfRecord(record, selfId)) return node;

        let clone: Record<string, unknown> | null = null;

        for (const key of Object.keys(record)) {
            const value = record[key];
            if (value === null || value === undefined) continue;

            const maskType = getSensitiveMaskType(key);
            if (maskType) {
                if (isMaskableValue(value, maskType)) {
                    const masked = SENSITIVE_MASKERS[maskType](value);
                    if (masked !== value) {
                        clone = clone ?? { ...record };
                        clone[key] = masked;
                    }
                    continue;
                }
                // 敏感欄位名稱但值不是可遮罩的純量（例如巢狀物件）→ 照常往下走訪
            }

            if (typeof value === 'object') {
                const maskedChild = maskNode(value, selfId, depth + 1, path);
                if (maskedChild !== value) {
                    clone = clone ?? { ...record };
                    clone[key] = maskedChild;
                }
            }
        }

        return clone ?? node;
    } finally {
        path.delete(node);
    }
}

/**
 * 對任意 payload 套用遮罩（供攔截器與單元測試使用）。
 *
 * @param data   要遮罩的資料
 * @param selfId 呼叫者的 account id；命中的物件視為本人資料而不遮罩
 */
export function maskSensitivePayload(data: unknown, selfId: string | null = null): unknown {
    return maskNode(data, selfId, 0, new WeakSet<object>());
}

@Injectable()
export class SensitiveDataInterceptor implements NestInterceptor {
    constructor(private readonly reflector: Reflector) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const skip = this.reflector.getAllAndOverride<boolean>(SKIP_SENSITIVE_MASK_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (skip) return next.handle();

        const request = context.switchToHttp().getRequest<{
            user?: { sub?: string; id?: string; uid?: string; roleLevel?: number };
        }>();
        const user = request?.user;

        // 未登入視為 Level 0，採最保守處理（遮罩）
        const roleLevel = typeof user?.roleLevel === 'number' ? user.roleLevel : 0;
        if (roleLevel >= SENSITIVE_MASK_MIN_ROLE_LEVEL) {
            return next.handle();
        }

        const selfId = user?.sub ?? user?.id ?? user?.uid ?? null;

        return next.handle().pipe(
            map((data) => maskSensitivePayload(data, selfId)),
        );
    }
}
