import { IsLatitude, IsLongitude, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 任務簽到／簽退的輸入驗證。
 *
 * 原本兩個端點都寫成 `@Body() dto: { latitude: number; ... }` 的行內型別，
 * 編譯後沒有 metatype，全域 ValidationPipe 不會執行 → 座標可以是字串、
 * NaN 或超出範圍的值，而簽到座標會被拿去做 GPS 距離驗證與出勤佐證。
 */

export class TaskCheckInDto {
    @ApiProperty({ description: '簽到緯度' })
    @IsLatitude()
    latitude: number;

    @ApiProperty({ description: '簽到經度' })
    @IsLongitude()
    longitude: number;

    @ApiPropertyOptional({ description: '備註' })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    note?: string;
}

export class TaskCheckOutDto {
    @ApiPropertyOptional({ description: '簽退緯度' })
    @IsOptional()
    @IsLatitude()
    latitude?: number;

    @ApiPropertyOptional({ description: '簽退經度' })
    @IsOptional()
    @IsLongitude()
    longitude?: number;

    @ApiPropertyOptional({ description: '備註' })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    notes?: string;
}
