import { Type } from 'class-transformer';
import {
    IsArray,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 揀貨項目（對應 DispatchService 的 DispatchItem）
 *
 * `itemId` 會被當成資源 ID 傳給 resourcesService.deductStock() 實際扣庫存，
 * 因此必填且需為字串。
 */
export class DispatchItemDto {
    @ApiProperty({ description: '資源項目 ID（用於扣庫存）' })
    @IsString()
    itemId: string;

    @ApiProperty({ description: '項目名稱' })
    @IsString()
    itemName: string;

    @ApiProperty({ description: '需求數量' })
    @IsNumber()
    @Min(0)
    quantity: number;

    @ApiPropertyOptional({ description: '實際揀貨數量；> 0 時才會扣庫存' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    pickedQuantity?: number;
}

/**
 * 完成揀貨（PATCH /dispatch/:id/complete-picking）
 */
export class CompletePickingDto {
    @ApiProperty({ type: [DispatchItemDto], description: '揀貨明細' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DispatchItemDto)
    pickedItems: DispatchItemDto[];

    @ApiProperty({ description: '操作人員姓名（庫存異動稽核欄位）' })
    @IsString()
    operatorName: string;
}
