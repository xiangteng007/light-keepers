import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    BadRequestException,
    UseGuards,
} from '@nestjs/common';
import { UploadsService, UploadResult } from './uploads.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

interface UploadDto {
    file: string; // Base64 data URL
    folder?: string;
}

interface BulkUploadDto {
    files: string[]; // Array of Base64 data URLs
    folder?: string;
}

@Controller('uploads')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.VOLUNTEER)
export class UploadsController {
    constructor(private readonly uploadsService: UploadsService) { }

    /**
     * POST /uploads
     * 上傳單一檔案 (Base64)
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async uploadFile(@Body() dto: UploadDto): Promise<UploadResult> {
        if (!dto.file) {
            throw new BadRequestException('Missing file data');
        }

        if (!dto.file.startsWith('data:')) {
            throw new BadRequestException('Invalid file format. Expected Base64 data URL');
        }

        return this.uploadsService.uploadBase64(dto.file, dto.folder || 'general');
    }

    /**
     * POST /uploads/bulk
     * 批次上傳多個檔案
     */
    @Post('bulk')
    @HttpCode(HttpStatus.CREATED)
    async uploadBulk(@Body() dto: BulkUploadDto): Promise<UploadResult[]> {
        if (!dto.files || dto.files.length === 0) {
            throw new BadRequestException('No files provided');
        }

        if (dto.files.length > 10) {
            throw new BadRequestException('Maximum 10 files allowed per request');
        }

        const results: UploadResult[] = [];
        for (const file of dto.files) {
            if (!file.startsWith('data:')) {
                continue; // 跳過無效檔案
            }
            const result = await this.uploadsService.uploadBase64(file, dto.folder || 'general');
            results.push(result);
        }

        return results;
    }
}
