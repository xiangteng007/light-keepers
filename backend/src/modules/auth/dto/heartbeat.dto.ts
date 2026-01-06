import { IsNotEmpty, IsString, IsOptional, IsUUID, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Heartbeat Response DTO
 */
export class HeartbeatResponseDto {
    @ApiProperty({ description: '是否成功' })
    success: boolean;

    @ApiProperty({ description: '伺服器時間戳' })
    timestamp: string;

    @ApiProperty({ description: '建議下次心跳間隔(秒)' })
    nextHeartbeatSeconds: number;
}

/**
 * Commander Status DTO
 */
export class CommanderStatusDto {
    @ApiProperty({ description: '用戶 ID' })
    userId: string;

    @ApiProperty({ description: '顯示名稱' })
    displayName: string;

    @ApiProperty({ description: '角色等級' })
    roleLevel: number;

    @ApiProperty({ description: '是否在線' })
    isOnline: boolean;

    @ApiPropertyOptional({ description: '最後心跳時間' })
    lastHeartbeat: string | null;

    @ApiPropertyOptional({ description: '距離最後心跳秒數' })
    timeSinceLastHeartbeatSeconds: number | null;

    @ApiProperty({ description: 'Break-Glass 是否啟用' })
    breakGlassEnabled: boolean;

    @ApiPropertyOptional({ description: '緊急接班人 ID' })
    emergencySuccessorId: string | null;
}

/**
 * Break-Glass Request DTO
 */
export class BreakGlassDto {
    @ApiProperty({ description: '目標指揮官 ID' })
    @IsUUID()
    @IsNotEmpty()
    targetCommanderId: string;

    @ApiProperty({ description: '接管原因' })
    @IsString()
    @IsNotEmpty()
    reason: string;
}

/**
 * Break-Glass Configuration DTO
 */
export class BreakGlassConfigDto {
    @ApiPropertyOptional({ description: '指定接班人 ID' })
    @IsUUID()
    @IsOptional()
    successorId?: string;

    @ApiPropertyOptional({ description: '超時時間(分鐘)', minimum: 5, maximum: 60 })
    @IsNumber()
    @Min(5)
    @Max(60)
    @IsOptional()
    timeoutMinutes?: number;

    @ApiPropertyOptional({ description: '是否啟用 Break-Glass' })
    @IsBoolean()
    @IsOptional()
    enabled?: boolean;
}
