import { Type } from 'class-transformer';
import {
    Allow,
    IsDate,
    IsDefined,
    IsEnum,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    Min,
    ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OfflineOperationType } from '../services/offline-sync.service';

/**
 * 排隊離線操作（POST /scalability/offline/queue）
 *
 * 對應 `Omit<OfflineOperation, 'id' | 'syncStatus' | 'retryCount'>`。
 * 那三個欄位由 service 於排隊時覆寫，呼叫端送出也無效，故不列入白名單。
 * `conflictData` 同為伺服器管理欄位（衝突時寫入、解決後刪除），一併排除。
 *
 * `timestamp` 必須轉為 Date：syncBatch() 會呼叫 `a.timestamp.getTime()`、
 * hasConflict() 亦然，傳入 JSON 字串會在執行期拋
 * `timestamp.getTime is not a function`。@Type(() => Date) 一併修掉該缺陷。
 */
export class QueueOfflineOperationDto {
    @ApiProperty({ description: '離線客戶端識別' })
    @IsString()
    clientId: string;

    @ApiProperty({ description: '實體類型' })
    @IsString()
    entityType: string;

    @ApiProperty({ description: '實體 ID' })
    @IsString()
    entityId: string;

    @ApiProperty({ enum: OfflineOperationType, description: '操作類型' })
    @IsEnum(OfflineOperationType)
    operation: OfflineOperationType;

    /**
     * 待同步的實體內容：形狀依 entityType 而異（任務、報告、簽到…），
     * 屬真正的動態結構，service 也只做整包搬移，故以 @Allow() 放行不驗證。
     */
    @ApiProperty({ description: '待同步的實體內容（自由結構）', type: Object })
    @Allow()
    data: unknown;

    @ApiProperty({ description: '客戶端產生時間（ISO8601）' })
    @Type(() => Date)
    @IsDate()
    timestamp: Date;
}

export const CONFLICT_RESOLUTIONS = ['use_client', 'use_server', 'merge'] as const;

/**
 * 解決同步衝突（PUT /scalability/offline/:operationId/resolve）
 *
 * `mergedData` 僅在 resolution === 'merge' 時被讀取；原本若選 merge 卻未帶
 * mergedData，service 會靜默略過卻仍回傳 true。此處以 @ValidateIf 補上
 * 條件必填，讓該情境明確 400。
 */
export class ResolveConflictDto {
    @ApiProperty({ enum: CONFLICT_RESOLUTIONS, description: '衝突解決策略' })
    @IsIn(CONFLICT_RESOLUTIONS as unknown as string[])
    resolution: 'use_client' | 'use_server' | 'merge';

    // @IsDefined() 而非 @Allow()：@Allow() 只是「放行不驗證」，不會要求存在。
    // 搭配 @ValidateIf 才能達成「僅在 merge 時必填」。
    @ApiPropertyOptional({ description: '合併後內容（resolution 為 merge 時必填）', type: Object })
    @ValidateIf((o) => o.resolution === 'merge')
    @IsDefined()
    mergedData?: unknown;
}

export const RATE_LIMIT_STRATEGIES = ['sliding', 'fixed'] as const;

/**
 * 更新限流配置（PUT /scalability/rate-limits/:name）
 *
 * 對應 Partial<RateLimitConfig>；service 以 Object.assign 無過濾合併，
 * 白名單在此重要。
 * 刻意排除 `name`：設定是以原 name 作為 Map 索引鍵，允許改名會造成
 * 記錄與索引鍵不一致。要改名應透過路由參數重新建立。
 */
export class UpdateRateLimitConfigDto {
    @ApiPropertyOptional({ description: '請求數上限' })
    @IsOptional()
    @IsInt()
    @Min(1)
    limit?: number;

    @ApiPropertyOptional({ description: '時間窗口（毫秒）' })
    @IsOptional()
    @IsInt()
    @Min(1)
    window?: number;

    @ApiPropertyOptional({ enum: RATE_LIMIT_STRATEGIES, description: '計算策略' })
    @IsOptional()
    @IsIn(RATE_LIMIT_STRATEGIES as unknown as string[])
    strategy?: 'sliding' | 'fixed';
}
