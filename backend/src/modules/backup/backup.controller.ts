import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    Res,
} from '@nestjs/common';
import { Response } from 'express';
import { BackupService } from './backup.service';

@Controller('admin/backup')
export class BackupController {
    constructor(private readonly backupService: BackupService) { }

    // 列出所有備份
    @Get()
    async listBackups() {
        const backups = await this.backupService.listBackups();
        return {
            success: true,
            data: backups,
            count: backups.length,
        };
    }

    // 建立備份
    @Post('create')
    async createBackup(@Body() dto: { tables?: string[] }) {
        const result = await this.backupService.createBackup(dto.tables);
        return {
            success: result.success,
            message: result.success ? '備份建立成功' : '備份建立失敗',
            data: result.metadata,
            error: result.error,
        };
    }

    // 還原備份
    @Post('restore/:id')
    async restoreBackup(
        @Param('id') id: string,
        @Body() dto: { tables?: string[] },
    ) {
        const result = await this.backupService.restoreBackup(id, dto.tables);
        return {
            success: result.success,
            message: result.success
                ? `成功還原 ${result.recordCount} 筆記錄到 ${result.restoredTables?.length} 個表格`
                : '還原失敗',
            data: {
                restoredTables: result.restoredTables,
                recordCount: result.recordCount,
            },
            error: result.error,
        };
    }

    // 刪除備份
    @Delete(':id')
    async deleteBackup(@Param('id') id: string) {
        const success = await this.backupService.deleteBackup(id);
        return {
            success,
            message: success ? '備份已刪除' : '刪除失敗或備份不存在',
        };
    }

    // 匯出表格為 CSV
    @Get('export/:table')
    async exportTable(
        @Param('table') table: string,
        @Query('download') download: string,
        @Res() res: Response,
    ) {
        const result = await this.backupService.exportTableToCSV(table);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error,
            });
        }

        if (download === 'true') {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${table}_export.csv"`);
            return res.send(result.csv);
        }

        return res.json({
            success: true,
            data: {
                table,
                csv: result.csv,
                preview: result.csv?.split('\n').slice(0, 6).join('\n'),
            },
        });
    }
}
