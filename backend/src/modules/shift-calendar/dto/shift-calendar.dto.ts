import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 更新班次（PUT /shift-calendar/:shiftId）
 *
 * 對應 Partial<ShiftInput>。ShiftCalendarService.updateShift() 實際只套用
 * volunteerId / volunteerName / templateId / notes 四個欄位——
 * `date` 雖在 Partial<ShiftInput> 型別內卻從未被寫入，
 * 故刻意不列入白名單，避免呼叫端誤以為可改期。
 * （若要改期，應另開端點或走刪除重建。）
 *
 * 每個欄位在 service 內都以 truthiness 判斷，空字串會被靜默忽略。
 *
 * 後續可收緊：templateId 目前僅有 morning/afternoon/night 三種種子範本，
 * 待範本改為可設定後再決定是否加 @IsIn。
 */
export class UpdateShiftDto {
    @ApiPropertyOptional({ description: '志工帳號 ID' })
    @IsOptional()
    @IsString()
    volunteerId?: string;

    @ApiPropertyOptional({ description: '志工姓名' })
    @IsOptional()
    @IsString()
    volunteerName?: string;

    @ApiPropertyOptional({ description: '班別範本 ID（morning/afternoon/night）' })
    @IsOptional()
    @IsString()
    templateId?: string;

    @ApiPropertyOptional({ description: '備註' })
    @IsOptional()
    @IsString()
    notes?: string;
}
