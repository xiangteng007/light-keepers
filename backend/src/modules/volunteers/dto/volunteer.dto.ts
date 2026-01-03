import {
    IsString,
    IsOptional,
    IsArray,
    IsEmail,
    IsUUID,
    IsIn,
    IsBoolean,
    IsDate,
    Length,
    Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { VolunteerStatus, VolunteerApprovalStatus, Gender } from '../volunteers.entity';

/**
 * DTO for creating a new volunteer
 */
export class CreateVolunteerDto {
    @IsString()
    @Length(1, 100, { message: '姓名長度需介於 1-100 字元' })
    name: string;

    @IsEmail({}, { message: '請輸入有效的 Email 格式' })
    @IsOptional()
    email?: string;

    @IsString()
    @Length(8, 20, { message: '電話號碼長度需介於 8-20 字元' })
    @Matches(/^[0-9+\-\s()]+$/, { message: '電話號碼格式不正確' })
    phone: string;

    @IsString()
    @Length(1, 100, { message: '區域長度需介於 1-100 字元' })
    region: string;

    @IsString()
    @IsOptional()
    @Length(0, 500, { message: '地址長度不可超過 500 字元' })
    address?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    skills?: string[];

    @IsString()
    @IsOptional()
    @Length(0, 100, { message: '緊急聯絡人姓名長度不可超過 100 字元' })
    emergencyContactName?: string;

    @IsString()
    @IsOptional()
    @Matches(/^[0-9+\-\s()]*$/, { message: '緊急聯絡電話格式不正確' })
    emergencyContactPhone?: string;

    @IsString()
    @IsOptional()
    @Length(0, 50, { message: '緊急聯絡人關係長度不可超過 50 字元' })
    emergencyContactRelation?: string;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsString()
    @IsOptional()
    @Length(0, 500, { message: '照片 URL 長度不可超過 500 字元' })
    photoUrl?: string;

    @IsUUID('4', { message: '帳號 ID 必須是有效的 UUID' })
    @IsOptional()
    accountId?: string;

    // 身分證字號
    @IsString()
    @IsOptional()
    @Matches(/^[A-Z][12]\d{8}$/, { message: '身分證字號格式不正確' })
    idNumber?: string;

    // 生日
    @IsDate()
    @IsOptional()
    @Type(() => Date)
    birthDate?: Date;

    // 性別
    @IsIn(['male', 'female', 'other'], { message: '性別必須是 male, female 或 other' })
    @IsOptional()
    gender?: Gender;

    // 健康備註
    @IsString()
    @IsOptional()
    healthNotes?: string;

    // 個資同意
    @IsBoolean()
    @IsOptional()
    privacyConsent?: boolean;

    // LINE User ID
    @IsString()
    @IsOptional()
    @Length(0, 100)
    lineUserId?: string;
}

/**
 * DTO for updating an existing volunteer
 */
export class UpdateVolunteerDto {
    @IsString()
    @IsOptional()
    @Length(1, 100, { message: '姓名長度需介於 1-100 字元' })
    name?: string;

    @IsEmail({}, { message: '請輸入有效的 Email 格式' })
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    @Length(8, 20, { message: '電話號碼長度需介於 8-20 字元' })
    @Matches(/^[0-9+\-\s()]+$/, { message: '電話號碼格式不正確' })
    phone?: string;

    @IsString()
    @IsOptional()
    @Length(1, 100, { message: '區域長度需介於 1-100 字元' })
    region?: string;

    @IsString()
    @IsOptional()
    @Length(0, 500, { message: '地址長度不可超過 500 字元' })
    address?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    skills?: string[];

    @IsString()
    @IsOptional()
    @Length(0, 100, { message: '緊急聯絡人姓名長度不可超過 100 字元' })
    emergencyContactName?: string;

    @IsString()
    @IsOptional()
    @Matches(/^[0-9+\-\s()]*$/, { message: '緊急聯絡電話格式不正確' })
    emergencyContactPhone?: string;

    @IsString()
    @IsOptional()
    @Length(0, 50, { message: '緊急聯絡人關係長度不可超過 50 字元' })
    emergencyContactRelation?: string;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsString()
    @IsOptional()
    @Length(0, 500, { message: '照片 URL 長度不可超過 500 字元' })
    photoUrl?: string;

    // 身分證字號
    @IsString()
    @IsOptional()
    @Matches(/^[A-Z][12]\d{8}$/, { message: '身分證字號格式不正確' })
    idNumber?: string;

    // 生日
    @IsDate()
    @IsOptional()
    @Type(() => Date)
    birthDate?: Date;

    // 性別
    @IsIn(['male', 'female', 'other'], { message: '性別必須是 male, female 或 other' })
    @IsOptional()
    gender?: Gender;

    // 健康備註
    @IsString()
    @IsOptional()
    healthNotes?: string;

    // 個資同意
    @IsBoolean()
    @IsOptional()
    privacyConsent?: boolean;

    // 可用狀態
    @IsIn(['available', 'busy', 'offline'], { message: '狀態必須是 available, busy 或 offline' })
    @IsOptional()
    status?: VolunteerStatus;
}

/**
 * DTO for querying/filtering volunteers
 */
export class VolunteerQueryDto {
    @IsIn(['available', 'busy', 'offline'], { message: '狀態必須是 available, busy 或 offline' })
    @IsOptional()
    status?: VolunteerStatus;

    @IsIn(['pending', 'approved', 'rejected', 'suspended'], { message: '審核狀態格式不正確' })
    @IsOptional()
    approvalStatus?: VolunteerApprovalStatus;

    @IsString()
    @IsOptional()
    region?: string;

    @IsString()
    @IsOptional()
    skill?: string;

    @IsString()
    @IsOptional()
    search?: string;

    @Type(() => Number)
    @IsOptional()
    @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
    limit?: number;

    @Type(() => Number)
    @IsOptional()
    @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
    offset?: number;
}

/**
 * DTO for approving a volunteer
 */
export class ApproveVolunteerDto {
    @IsUUID('4', { message: '審核者 ID 必須是有效的 UUID' })
    approvedBy: string;

    @IsString()
    @IsOptional()
    note?: string;
}

/**
 * DTO for rejecting a volunteer
 */
export class RejectVolunteerDto {
    @IsUUID('4', { message: '審核者 ID 必須是有效的 UUID' })
    rejectedBy: string;

    @IsString()
    @IsOptional()
    note?: string;
}

/**
 * DTO for updating volunteer status
 */
export class UpdateVolunteerStatusDto {
    @IsIn(['available', 'busy', 'offline'], { message: '狀態必須是 available, busy 或 offline' })
    status: VolunteerStatus;
}
