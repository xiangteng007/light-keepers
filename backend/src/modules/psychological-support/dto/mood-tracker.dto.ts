import {
    ArrayMaxSize,
    IsArray,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 心理支持（care）端點的輸入驗證。
 *
 * 這四個端點原本都是行內型別 `@Body() body: { ... }`，編譯後沒有 metatype，
 * 全域 ValidationPipe 完全不會執行。影響：
 *  - 心情分數沒有範圍檢查（service 以 1-10 為前提做預警門檻判斷，
 *    寫入 -999 或字串會讓「需關注名單」的判斷失真）
 *  - 祈福牆與 HopeBot 對話的文字沒有長度上限
 *  - `userId` 雖然已在 controller 以 JWT 覆寫（IDOR 修補），
 *    但沒有 whitelist 時其餘欄位仍可整包夾帶進 repository.create()
 *
 * 心理健康屬特種個資，這裡的欄位白名單同時是「不該存進資料庫的東西擋在門口」。
 */

export class LogMoodDto {
    /**
     * 保留欄位以相容既有前端；controller 一律以 JWT 的身分覆寫，
     * 呼叫端送什麼都不會影響實際寫入的 userId。
     */
    @ApiPropertyOptional({ description: '使用者 ID（伺服器一律以 JWT 覆寫，此欄位僅為相容）' })
    @IsOptional()
    @IsString()
    @MaxLength(128)
    userId?: string;

    @ApiProperty({ description: '心情分數 1-10' })
    @IsInt()
    @Min(1)
    @Max(10)
    score: number;

    @ApiPropertyOptional({ type: [String], description: '心情標籤' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @IsString({ each: true })
    @MaxLength(50, { each: true })
    tags?: string[];

    @ApiPropertyOptional({ description: '文字記錄' })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    note?: string;

    @ApiPropertyOptional({ description: '關聯任務 ID' })
    @IsOptional()
    @IsUUID()
    taskId?: string;
}

export class PostBlessingDto {
    @ApiPropertyOptional({ description: '使用者 ID（伺服器一律以 JWT 覆寫，此欄位僅為相容）' })
    @IsOptional()
    @IsString()
    @MaxLength(128)
    userId?: string;

    @ApiProperty({ description: '顯示名稱（可用暱稱）' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    displayName: string;

    @ApiProperty({ description: '祝福訊息' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    message: string;

    @ApiPropertyOptional({ description: '圖示類型' })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    iconType?: string;
}

export class ChatDto {
    @ApiPropertyOptional({ description: '使用者 ID（伺服器一律以 JWT 覆寫，此欄位僅為相容）' })
    @IsOptional()
    @IsString()
    @MaxLength(128)
    userId?: string;

    @ApiProperty({ description: '對話 session ID' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(128)
    sessionId: string;

    @ApiProperty({ description: '使用者訊息' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    message: string;
}

export class NewChatSessionDto {
    @ApiProperty({ description: '對話 session ID' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(128)
    sessionId: string;
}
