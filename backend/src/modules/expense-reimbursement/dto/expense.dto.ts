import { Type } from 'class-transformer';
import {
    IsDate,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 報銷審核動作
 */
export enum ClaimReviewAction {
    APPROVE = 'approve',
    REJECT = 'reject',
    REQUEST_REVISION = 'request_revision',
}

/**
 * 提交報銷申請
 *
 * 欄位對應 ExpenseReimbursementService.submitClaim() 的 ClaimInput。
 * 起步採寬鬆策略：僅 service 實際依賴的欄位為必填
 * （amount 用於金額門檻與統計、submitterId 用於個人紀錄查詢）。
 * 後續可收緊：amount 加 @Min(0)、category 改 @IsEnum（對齊 getExpenseCategories()）。
 */
export class SubmitClaimDto {
    @ApiProperty({ description: '申請人 ID' })
    @IsString()
    submitterId: string;

    @ApiProperty({ description: '申請人姓名' })
    @IsString()
    submitterName: string;

    @ApiProperty({ description: '支出類別（transport/meals/...）' })
    @IsString()
    category: string;

    @ApiProperty({ description: '支出說明' })
    @IsString()
    description: string;

    @ApiProperty({ description: '金額（TWD）' })
    @IsNumber()
    amount: number;

    @ApiPropertyOptional({ description: '收據檔案 URL' })
    @IsOptional()
    @IsString()
    receiptUrl?: string;

    @ApiPropertyOptional({ description: '關聯事件 ID' })
    @IsOptional()
    @IsString()
    incidentId?: string;

    @ApiPropertyOptional({ description: '關聯活動 ID' })
    @IsOptional()
    @IsString()
    eventId?: string;
}

/**
 * 審核報銷（對應 service 的 ClaimReview）
 */
export class ReviewClaimDto {
    @ApiProperty({ description: '審核人 ID' })
    @IsString()
    reviewerId: string;

    @ApiProperty({ description: '審核人姓名' })
    @IsString()
    reviewerName: string;

    @ApiProperty({ enum: ClaimReviewAction, description: '審核動作' })
    @IsEnum(ClaimReviewAction)
    action: ClaimReviewAction;

    @ApiPropertyOptional({ description: '審核意見' })
    @IsOptional()
    @IsString()
    comment?: string;
}

/**
 * 標記已付款（對應 service 的 PaymentInfo）
 *
 * paidAt 設為選填，controller 未提供時以伺服器時間補上，
 * 避免前端未送出時間戳即被 400 擋下。
 */
export class MarkPaidDto {
    @ApiProperty({ description: '付款方式' })
    @IsString()
    method: string;

    @ApiProperty({ description: '實付金額' })
    @IsNumber()
    amount: number;

    @ApiPropertyOptional({ description: '付款時間（ISO8601），未提供則使用伺服器時間' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    paidAt?: Date;

    @ApiPropertyOptional({ description: '付款憑證/交易編號' })
    @IsOptional()
    @IsString()
    reference?: string;
}
