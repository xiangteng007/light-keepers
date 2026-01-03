import {
    IsString,
    IsOptional,
    IsArray,
    IsNumber,
    IsIn,
    Length,
    Min,
    Max,
    IsLatitude,
    IsLongitude,
    Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ReportStatus, ReportType, ReportSeverity, ReportSource } from '../reports.entity';

/**
 * DTO for creating a new disaster report
 */
export class CreateReportDto {
    @IsIn(
        ['earthquake', 'flood', 'fire', 'typhoon', 'landslide', 'traffic', 'infrastructure', 'other'],
        { message: '災情類型必須是有效的類型' }
    )
    type: ReportType;

    @IsIn(['low', 'medium', 'high', 'critical'], { message: '嚴重程度必須是 low, medium, high 或 critical' })
    @IsOptional()
    severity?: ReportSeverity;

    @IsString()
    @Length(1, 200, { message: '標題長度需介於 1-200 字元' })
    title: string;

    @IsString()
    @Length(1, 5000, { message: '描述長度需介於 1-5000 字元' })
    description: string;

    @IsNumber({}, { message: '緯度必須是數字' })
    @IsLatitude({ message: '緯度格式不正確' })
    @Type(() => Number)
    latitude: number;

    @IsNumber({}, { message: '經度必須是數字' })
    @IsLongitude({ message: '經度格式不正確' })
    @Type(() => Number)
    longitude: number;

    @IsString()
    @IsOptional()
    @Length(0, 500, { message: '地址長度不可超過 500 字元' })
    address?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    photos?: string[];

    @IsString()
    @IsOptional()
    @Length(0, 200, { message: '聯絡人姓名長度不可超過 200 字元' })
    contactName?: string;

    @IsString()
    @IsOptional()
    @Matches(/^[0-9+\-\s()]*$/, { message: '聯絡電話格式不正確' })
    @Length(0, 50, { message: '聯絡電話長度不可超過 50 字元' })
    contactPhone?: string;

    // 來源追蹤
    @IsIn(['web', 'line'], { message: '來源必須是 web 或 line' })
    @IsOptional()
    source?: ReportSource;

    @IsString()
    @IsOptional()
    @Length(0, 50, { message: 'LINE 使用者 ID 長度不可超過 50 字元' })
    reporterLineUserId?: string;

    @IsString()
    @IsOptional()
    @Length(0, 100, { message: 'LINE 顯示名稱長度不可超過 100 字元' })
    reporterLineDisplayName?: string;
}

/**
 * DTO for updating an existing report (admin use)
 */
export class UpdateReportDto {
    @IsIn(
        ['earthquake', 'flood', 'fire', 'typhoon', 'landslide', 'traffic', 'infrastructure', 'other'],
        { message: '災情類型必須是有效的類型' }
    )
    @IsOptional()
    type?: ReportType;

    @IsIn(['low', 'medium', 'high', 'critical'], { message: '嚴重程度必須是 low, medium, high 或 critical' })
    @IsOptional()
    severity?: ReportSeverity;

    @IsString()
    @IsOptional()
    @Length(1, 200, { message: '標題長度需介於 1-200 字元' })
    title?: string;

    @IsString()
    @IsOptional()
    @Length(1, 5000, { message: '描述長度需介於 1-5000 字元' })
    description?: string;

    @IsNumber({}, { message: '緯度必須是數字' })
    @IsLatitude({ message: '緯度格式不正確' })
    @IsOptional()
    @Type(() => Number)
    latitude?: number;

    @IsNumber({}, { message: '經度必須是數字' })
    @IsLongitude({ message: '經度格式不正確' })
    @IsOptional()
    @Type(() => Number)
    longitude?: number;

    @IsString()
    @IsOptional()
    @Length(0, 500, { message: '地址長度不可超過 500 字元' })
    address?: string;
}

/**
 * DTO for reviewing a report (approve/reject)
 */
export class ReviewReportDto {
    @IsIn(['confirmed', 'rejected'], { message: '審核狀態必須是 confirmed 或 rejected' })
    status: 'confirmed' | 'rejected';

    @IsString()
    @Length(1, 100, { message: '審核者 ID 不可為空' })
    reviewedBy: string;

    @IsString()
    @IsOptional()
    @Length(0, 1000, { message: '審核備註長度不可超過 1000 字元' })
    reviewNote?: string;
}

/**
 * DTO for querying/filtering reports
 */
export class ReportQueryDto {
    @IsIn(['pending', 'confirmed', 'rejected'], { message: '狀態必須是 pending, confirmed 或 rejected' })
    @IsOptional()
    status?: ReportStatus;

    @IsIn(
        ['earthquake', 'flood', 'fire', 'typhoon', 'landslide', 'traffic', 'infrastructure', 'other'],
        { message: '災情類型必須是有效的類型' }
    )
    @IsOptional()
    type?: ReportType;

    @IsIn(['low', 'medium', 'high', 'critical'], { message: '嚴重程度必須是 low, medium, high 或 critical' })
    @IsOptional()
    severity?: ReportSeverity;

    @IsIn(['web', 'line'], { message: '來源必須是 web 或 line' })
    @IsOptional()
    source?: ReportSource;

    @IsString()
    @IsOptional()
    search?: string;

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
 * DTO for hotspot analysis options
 */
export class HotspotQueryDto {
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(0.5)
    @Max(50)
    gridSizeKm?: number;

    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(100)
    minCount?: number;

    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(365)
    days?: number;
}
