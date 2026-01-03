import {
    IsString,
    IsOptional,
    IsNumber,
    IsIn,
    IsUUID,
    IsBoolean,
    IsEmail,
    Length,
    Min,
    Max,
    Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaymentMethod, DonationStatus, DonationType } from '../donation.entity';
import { DonorType } from '../donor.entity';

/**
 * DTO for creating a new donor
 */
export class CreateDonorDto {
    @IsIn(['individual', 'corporate'], { message: '類型必須是 individual 或 corporate' })
    type: DonorType;

    @IsString()
    @Length(1, 100, { message: '姓名/公司名稱長度需介於 1-100 字元' })
    name: string;

    @IsEmail({}, { message: 'Email 格式不正確' })
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    @Matches(/^[0-9+\-\s()]*$/, { message: '電話格式不正確' })
    @Length(0, 20)
    phone?: string;

    // 身分證字號 (個人) - 會加密儲存
    @IsString()
    @IsOptional()
    @Matches(/^[A-Z][12]\d{8}$/, { message: '身分證字號格式不正確' })
    identityNumber?: string;

    // 統一編號 (企業)
    @IsString()
    @IsOptional()
    @Matches(/^\d{8}$/, { message: '統一編號必須是 8 位數字' })
    taxId?: string;

    @IsString()
    @IsOptional()
    @Length(0, 500)
    address?: string;

    @IsBoolean()
    @IsOptional()
    isAnonymous?: boolean;

    @IsBoolean()
    @IsOptional()
    wantsReceipt?: boolean;

    @IsBoolean()
    @IsOptional()
    wantsEmailReceipt?: boolean;

    @IsUUID('4')
    @IsOptional()
    accountId?: string;

    @IsString()
    @IsOptional()
    notes?: string;
}

/**
 * DTO for updating a donor
 */
export class UpdateDonorDto {
    @IsString()
    @IsOptional()
    @Length(1, 100, { message: '姓名/公司名稱長度需介於 1-100 字元' })
    name?: string;

    @IsEmail({}, { message: 'Email 格式不正確' })
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    @Matches(/^[0-9+\-\s()]*$/, { message: '電話格式不正確' })
    @Length(0, 20)
    phone?: string;

    @IsString()
    @IsOptional()
    @Length(0, 500)
    address?: string;

    @IsBoolean()
    @IsOptional()
    wantsReceipt?: boolean;

    @IsBoolean()
    @IsOptional()
    wantsEmailReceipt?: boolean;
}

/**
 * DTO for creating a new donation
 */
export class CreateDonationDto {
    @IsUUID('4')
    @IsOptional()
    donorId?: string;

    // 可以直接帶入捐款人資料
    @IsOptional()
    donor?: CreateDonorDto;

    @IsNumber({}, { message: '金額必須是數字' })
    @Min(1, { message: '金額必須大於 0' })
    @Type(() => Number)
    amount: number;

    @IsIn(['credit_card', 'atm', 'cvs', 'line_pay', 'bank_transfer', 'cash', 'other'], {
        message: '付款方式必須是有效的類型',
    })
    paymentMethod: PaymentMethod;

    @IsIn(['one_time', 'recurring'], { message: '捐款類型必須是 one_time 或 recurring' })
    @IsOptional()
    donationType?: DonationType;

    @IsString()
    @IsOptional()
    @Length(0, 100)
    projectName?: string;

    @IsString()
    @IsOptional()
    @Length(0, 500)
    purpose?: string;

    @IsString()
    @IsOptional()
    notes?: string;
}

/**
 * DTO for confirming a payment
 */
export class ConfirmPaymentDto {
    @IsString()
    @Length(1, 100, { message: '商家訂單編號不可為空' })
    merchantTradeNo: string;

    @IsString()
    @Length(1, 100, { message: '交易編號不可為空' })
    transactionId: string;
}

/**
 * DTO for querying donations
 */
export class DonationQueryDto {
    @IsIn(['pending', 'paid', 'failed', 'refunded', 'cancelled'], {
        message: '狀態必須是有效的類型',
    })
    @IsOptional()
    status?: DonationStatus;

    @IsUUID('4')
    @IsOptional()
    donorId?: string;

    @IsIn(['credit_card', 'atm', 'cvs', 'line_pay', 'bank_transfer', 'cash', 'other'], {
        message: '付款方式必須是有效的類型',
    })
    @IsOptional()
    paymentMethod?: PaymentMethod;

    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(100)
    limit?: number;

    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(0)
    offset?: number;
}

/**
 * DTO for issuing a receipt
 */
export class IssueReceiptDto {
    @IsUUID('4', { message: '捐款 ID 必須是有效的 UUID' })
    donationId: string;
}

/**
 * DTO for cancelling a receipt
 */
export class CancelReceiptDto {
    @IsString()
    @Length(1, 500, { message: '作廢原因不可為空' })
    reason: string;
}

/**
 * DTO for exporting donations
 */
export class ExportDonationsDto {
    @Type(() => Number)
    @IsNumber()
    @Min(2000)
    @Max(2100)
    year: number;
}
