import {
    IsObject,
    IsOptional,
    IsString,
    ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 新增組織節點（對應 OrgChartService 的 NodeInput）
 *
 * 注意 `parentId` 在 NodeInput 中是「必填但可為 null」（根節點為 null），
 * 與「可省略」不同，故用 @ValidateIf 而非 @IsOptional。
 *
 * 後續可收緊：`type` 目前是自由字串，前端 orgChartApi.ts 宣告的
 * 5 值聯集（organization/division/branch/team/unit）尚未在後端強制，
 * 待常數表定案後改 @IsEnum。
 */
export class CreateOrgNodeDto {
    @ApiPropertyOptional({ description: '節點 ID，未提供時由伺服器產生' })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({ description: '節點名稱' })
    @IsString()
    name: string;

    @ApiProperty({ description: '節點類型（organization/division/branch/team/unit）' })
    @IsString()
    type: string;

    @ApiProperty({ description: '上層節點 ID；根節點請明確傳入 null', nullable: true })
    @ValidateIf((o) => o.parentId !== null)
    @IsString()
    parentId: string | null;

    @ApiPropertyOptional({ description: '主管帳號 ID' })
    @IsOptional()
    @IsString()
    managerId?: string;

    /** 各單位自訂的節點屬性（編制員額、代號…），無固定結構。 */
    @ApiPropertyOptional({ description: '自由形式擴充屬性', type: Object })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}

/**
 * 更新組織節點
 *
 * OrgChartService.updateNode() 實際只讀取 name / parentId / managerId /
 * metadata 四個欄位；`id` 與 `type` 雖被 Partial<NodeInput> 允許卻遭忽略，
 * 故刻意不列入白名單，避免呼叫端誤以為可更新。
 */
export class UpdateOrgNodeDto {
    @ApiPropertyOptional({ description: '節點名稱' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ description: '上層節點 ID（可為 null）', nullable: true })
    @IsOptional()
    @ValidateIf((o) => o.parentId !== null)
    @IsString()
    parentId?: string | null;

    @ApiPropertyOptional({ description: '主管帳號 ID' })
    @IsOptional()
    @IsString()
    managerId?: string;

    /** 以淺層合併（Object.assign）方式併入既有 metadata，而非整包取代。 */
    @ApiPropertyOptional({ description: '自由形式擴充屬性（淺層合併）', type: Object })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}
