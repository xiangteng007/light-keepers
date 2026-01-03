import {
    IsString,
    IsOptional,
    IsNumber,
    IsIn,
    IsUUID,
    IsDate,
    IsBoolean,
    Length,
    Min,
    Max,
    IsEmail,
    Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ResourceCategory, ResourceStatus, ControlLevel } from '../resources.entity';
import { TransactionType } from '../resource-transaction.entity';
import { DonorType } from '../donation-source.entity';

/**
 * DTO for creating a new resource
 */
export class CreateResourceDto {
    @IsString()
    @Length(1, 200, { message: '物資名稱長度需介於 1-200 字元' })
    name: string;

    @IsIn(['food', 'water', 'medical', 'shelter', 'clothing', 'equipment', 'other'], {
        message: '分類必須是有效的類型',
    })
    category: ResourceCategory;

    @IsIn(['civil', 'controlled', 'medical'], { message: '管控等級必須是 civil, controlled 或 medical' })
    @IsOptional()
    controlLevel?: ControlLevel;

    @IsString()
    @IsOptional()
    @Length(0, 2000, { message: '描述長度不可超過 2000 字元' })
    description?: string;

    @IsNumber({}, { message: '數量必須是數字' })
    @Min(0, { message: '數量不可為負數' })
    @Type(() => Number)
    quantity: number;

    @IsString()
    @IsOptional()
    @Length(0, 20, { message: '單位長度不可超過 20 字元' })
    unit?: string;

    @IsNumber({}, { message: '最低庫存警戒必須是數字' })
    @IsOptional()
    @Min(0)
    @Type(() => Number)
    minQuantity?: number;

    @IsString()
    @IsOptional()
    @Length(0, 200, { message: '存放位置長度不可超過 200 字元' })
    location?: string;

    @IsDate()
    @IsOptional()
    @Type(() => Date)
    expiresAt?: Date;

    @IsString()
    @IsOptional()
    @Length(0, 500, { message: '照片 URL 長度不可超過 500 字元' })
    photoUrl?: string;

    @IsString()
    @IsOptional()
    @Length(0, 100, { message: '條碼長度不可超過 100 字元' })
    barcode?: string;

    @IsBoolean()
    @IsOptional()
    isAssetized?: boolean;

    @IsUUID('4')
    @IsOptional()
    storageLocationId?: string;

    // 敏感欄位
    @IsNumber({}, { message: '單價必須是數字' })
    @IsOptional()
    @Min(0)
    @Type(() => Number)
    unitPrice?: number;

    @IsString()
    @IsOptional()
    @Length(0, 500)
    donorInfo?: string;

    @IsString()
    @IsOptional()
    internalNotes?: string;
}

/**
 * DTO for updating an existing resource
 */
export class UpdateResourceDto {
    @IsString()
    @IsOptional()
    @Length(1, 200, { message: '物資名稱長度需介於 1-200 字元' })
    name?: string;

    @IsIn(['food', 'water', 'medical', 'shelter', 'clothing', 'equipment', 'other'], {
        message: '分類必須是有效的類型',
    })
    @IsOptional()
    category?: ResourceCategory;

    @IsIn(['civil', 'controlled', 'medical'], { message: '管控等級必須是 civil, controlled 或 medical' })
    @IsOptional()
    controlLevel?: ControlLevel;

    @IsString()
    @IsOptional()
    @Length(0, 2000, { message: '描述長度不可超過 2000 字元' })
    description?: string;

    @IsNumber({}, { message: '數量必須是數字' })
    @IsOptional()
    @Min(0, { message: '數量不可為負數' })
    @Type(() => Number)
    quantity?: number;

    @IsString()
    @IsOptional()
    @Length(0, 20, { message: '單位長度不可超過 20 字元' })
    unit?: string;

    @IsNumber({}, { message: '最低庫存警戒必須是數字' })
    @IsOptional()
    @Min(0)
    @Type(() => Number)
    minQuantity?: number;

    @IsString()
    @IsOptional()
    @Length(0, 200, { message: '存放位置長度不可超過 200 字元' })
    location?: string;

    @IsDate()
    @IsOptional()
    @Type(() => Date)
    expiresAt?: Date;

    @IsString()
    @IsOptional()
    @Length(0, 500, { message: '照片 URL 長度不可超過 500 字元' })
    photoUrl?: string;

    @IsString()
    @IsOptional()
    @Length(0, 100, { message: '條碼長度不可超過 100 字元' })
    barcode?: string;
}

/**
 * DTO for resource transactions (stock in/out)
 */
export class ResourceTransactionDto {
    @IsUUID('4', { message: '物資 ID 必須是有效的 UUID' })
    resourceId: string;

    @IsIn(['in', 'out', 'transfer', 'adjust', 'donate', 'expired'], {
        message: '異動類型必須是 in, out, transfer, adjust, donate 或 expired',
    })
    type: TransactionType;

    @IsNumber({}, { message: '數量必須是數字' })
    @Min(1, { message: '數量必須大於 0' })
    @Type(() => Number)
    quantity: number;

    @IsString()
    @Length(1, 100, { message: '操作人員姓名長度需介於 1-100 字元' })
    operatorName: string;

    @IsUUID('4')
    @IsOptional()
    operatorId?: string;

    @IsString()
    @IsOptional()
    @Length(0, 200)
    fromLocation?: string;

    @IsString()
    @IsOptional()
    @Length(0, 200)
    toLocation?: string;

    @IsString()
    @IsOptional()
    @Length(0, 1000)
    notes?: string;

    @IsString()
    @IsOptional()
    @Length(0, 100)
    referenceNo?: string;

    // Phase 4: 領用人資訊 (controlled/medical 必填)
    @IsString()
    @IsOptional()
    @Length(0, 100, { message: '領用人姓名長度不可超過 100 字元' })
    recipientName?: string;

    @IsString()
    @IsOptional()
    @Matches(/^[0-9+\-\s()]*$/, { message: '領用人電話格式不正確' })
    recipientPhone?: string;

    @IsString()
    @IsOptional()
    @Length(0, 20)
    recipientIdNo?: string;

    @IsString()
    @IsOptional()
    @Length(0, 200)
    recipientOrg?: string;

    @IsString()
    @IsOptional()
    @Length(0, 500, { message: '用途說明長度不可超過 500 字元' })
    purpose?: string;
}

/**
 * DTO for creating a donation source
 */
export class CreateDonationSourceDto {
    @IsString()
    @Length(1, 200, { message: '捐贈者名稱長度需介於 1-200 字元' })
    name: string;

    @IsIn(['individual', 'corporate', 'organization', 'government'], {
        message: '類型必須是 individual, corporate, organization 或 government',
    })
    type: DonorType;

    @IsString()
    @IsOptional()
    @Length(0, 100)
    contactPerson?: string;

    @IsString()
    @IsOptional()
    @Matches(/^[0-9+\-\s()]*$/, { message: '電話格式不正確' })
    phone?: string;

    @IsEmail({}, { message: 'Email 格式不正確' })
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    @Length(0, 500)
    address?: string;

    @IsString()
    @IsOptional()
    @Length(0, 20)
    taxId?: string;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsBoolean()
    @IsOptional()
    needsReceipt?: boolean;
}

/**
 * DTO for querying resources
 */
export class ResourceQueryDto {
    @IsIn(['food', 'water', 'medical', 'shelter', 'clothing', 'equipment', 'other'], {
        message: '分類必須是有效的類型',
    })
    @IsOptional()
    category?: ResourceCategory;

    @IsIn(['available', 'low', 'depleted', 'reserved'], { message: '狀態必須是有效的類型' })
    @IsOptional()
    status?: ResourceStatus;

    @IsIn(['civil', 'controlled', 'medical'], { message: '管控等級必須是 civil, controlled 或 medical' })
    @IsOptional()
    controlLevel?: ControlLevel;

    @IsString()
    @IsOptional()
    search?: string;

    @IsString()
    @IsOptional()
    location?: string;

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
 * DTO for creating a resource batch
 */
export class CreateResourceBatchDto {
    @IsUUID('4', { message: '物資 ID 必須是有效的 UUID' })
    resourceId: string;

    @IsString()
    @Length(1, 50, { message: '批號長度需介於 1-50 字元' })
    batchNo: string;

    @IsNumber({}, { message: '數量必須是數字' })
    @Min(1, { message: '數量必須大於 0' })
    @Type(() => Number)
    quantity: number;

    @IsDate()
    @IsOptional()
    @Type(() => Date)
    expiresAt?: Date;

    @IsDate()
    @IsOptional()
    @Type(() => Date)
    manufacturedAt?: Date;

    @IsUUID('4')
    @IsOptional()
    donationSourceId?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    @Type(() => Number)
    unitPrice?: number;

    @IsString()
    @IsOptional()
    @Length(0, 200)
    location?: string;

    @IsString()
    @IsOptional()
    @Length(0, 100)
    barcode?: string;

    @IsString()
    @IsOptional()
    @Length(0, 500)
    photoUrl?: string;

    @IsString()
    @IsOptional()
    notes?: string;
}
