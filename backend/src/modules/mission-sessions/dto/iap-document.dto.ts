import { IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 更新 IAP 文件內容
 *
 * `content` 刻意維持自由形式：IAPDocument.content 是 jsonb 欄位，
 * 其結構隨 documentType 而異（objectives / organization / assignments /
 * communications / medical / traffic / resources / safety / map_attachments
 * 共 9 種，各自結構不同且尚未定版）。IAPService.upsertDocument() 不檢視任何
 * 鍵值，僅整包存取，因此在此鎖定欄位白名單並無依據。
 * 改為驗證「必須是非空物件」，至少擋掉字串／陣列／null 等錯誤型別。
 *
 * 後續可收緊：待 9 種文件結構定版後，改為 discriminated union DTO。
 */
export class UpsertIapDocumentDto {
    @ApiProperty({
        description: 'IAP 文件內容（結構依 documentType 而異）',
        type: Object,
    })
    @IsObject()
    @IsNotEmpty()
    content: Record<string, unknown>;
}
