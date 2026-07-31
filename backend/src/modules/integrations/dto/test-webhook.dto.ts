import { Allow, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Webhook 測試發送
 *
 * `payload` 刻意保持不定型：本端點的用途就是把任意內容原樣 POST 到
 * 呼叫端指定的 webhook URL（ExternalApiService.sendWebhook() 直接把它
 * 交給 httpService.post，從不檢視任何欄位）。加上結構驗證會使該端點
 * 無法測試第三方 webhook 的實際酬載格式。
 *
 * 既有防護：端點位於 @RequiredLevel(ROLE_LEVELS.OWNER) 之下
 * （本專案最高權限層級），且掛有 CoreJwtGuard + UnifiedRolesGuard。
 *
 * `url` 則加上 @IsUrl 驗證——這是使用者可控的對外請求目標（SSRF 面），
 * 至少確保是合法 URL 而非任意字串。
 * 後續可收緊：加入 allow-list / 內網網段封鎖。
 */
export class TestWebhookDto {
    @ApiProperty({ description: 'Webhook 目標 URL' })
    @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
    url: string;

    @ApiProperty({ description: '要發送的酬載（自由結構，原樣轉發）', type: Object })
    @Allow()
    payload: unknown;
}
