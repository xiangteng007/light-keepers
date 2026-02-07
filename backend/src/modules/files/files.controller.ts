/**
 * Files Controller
 * REST API for file management
 */

import { Controller, Get, Post, Delete, Param, Query, UseGuards, UseInterceptors, UploadedFile, Res, StreamableFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FileStorageService } from './file-storage.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS, CurrentUser } from '../shared/guards';
import { getErrorMessage } from '../../common/utils/error-utils';
import { JwtPayload } from '../shared/guards/core-jwt.guard';

@Controller('files')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
export class FilesController {
    constructor(private fileStorageService: FileStorageService) { }

    /**
     * Upload a file
     */
    @Post('upload')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
        @UploadedFile() file: any,
        @CurrentUser() user: JwtPayload,
        @Query('folder') folder?: string
    ) {
        if (!file) {
            return { success: false, error: '請選擇檔案' };
        }

        try {
            const storedFile = await this.fileStorageService.saveFile(
                file.buffer,
                file.originalname,
                file.mimetype,
                user?.uid || user?.id,
                { folder }
            );

            return { success: true, data: storedFile };
        } catch (error: unknown) {
            return { success: false, error: getErrorMessage(error) };
        }
    }

    /**
     * Download a file
     */
    @Get('download/*filepath')
    @RequiredLevel(ROLE_LEVELS.PUBLIC)
    async downloadFile(
        @Param('filepath') filePath: string,
        @Res({ passthrough: true }) res: Response
    ): Promise<StreamableFile | { success: boolean; error: string }> {
        const buffer = this.fileStorageService.getFile(filePath);

        if (!buffer) {
            return { success: false, error: '檔案不存在' };
        }

        const filename = filePath.split('/').pop() || 'file';
        res.set({
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        });

        return new StreamableFile(buffer);
    }

    /**
     * Delete a file
     */
    @Delete('*filepath')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async deleteFile(@Param('filepath') filePath: string) {
        const deleted = this.fileStorageService.deleteFile(filePath);
        return { success: deleted };
    }

    /**
     * List files in a folder
     */
    @Get('list/*folder')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async listFiles(@Param('folder') folder: string) {
        const files = this.fileStorageService.listFiles(folder);
        return { success: true, data: files };
    }

    /**
     * Get storage statistics
     */
    @Get('stats')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getStats() {
        const stats = this.fileStorageService.getStorageStats();
        return {
            success: true,
            data: {
                ...stats,
                totalSizeMB: Math.round(stats.totalSize / 1024 / 1024 * 100) / 100,
            },
        };
    }

    /**
     * Clean old files (admin only)
     */
    @Post('clean')
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async cleanOldFiles(@Query('days') days?: string) {
        const daysOld = Number(days) || 30;
        const deleted = await this.fileStorageService.cleanOldFiles(daysOld);
        return { success: true, data: { deleted } };
    }
}
