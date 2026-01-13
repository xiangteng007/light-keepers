/**
 * Data Export Controller
 * 
 * Endpoints for GDPR-compliant data export
 * v1.0
 */

import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    Res,
    UseGuards,
    Req,
    HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DataExportService } from './services/data-export.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Data Export')
@Controller('account/export')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DataExportController {
    constructor(private readonly dataExportService: DataExportService) { }

    @Post('request')
    @ApiOperation({ summary: 'Request a data export' })
    @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv', 'zip'], description: 'Export format' })
    async requestExport(
        @Req() req: Request,
        @Query('format') format: 'json' | 'csv' | 'zip' = 'json'
    ) {
        const userId = (req as any).user?.id;
        const exportRequest = await this.dataExportService.requestExport(userId, format);

        return {
            success: true,
            message: '匯出請求已建立，處理完成後可下載',
            data: {
                requestId: exportRequest.id,
                status: exportRequest.status,
                format: exportRequest.format,
                createdAt: exportRequest.createdAt,
            },
        };
    }

    @Get('status/:requestId')
    @ApiOperation({ summary: 'Get export request status' })
    async getStatus(@Req() req: Request, @Param('requestId') requestId: string) {
        const userId = (req as any).user?.id;
        const exportRequest = await this.dataExportService.getExportStatus(requestId, userId);

        return {
            success: true,
            data: {
                requestId: exportRequest.id,
                status: exportRequest.status,
                format: exportRequest.format,
                createdAt: exportRequest.createdAt,
                completedAt: exportRequest.completedAt,
                downloadUrl: exportRequest.downloadUrl,
                expiresAt: exportRequest.expiresAt,
                error: exportRequest.error,
            },
        };
    }

    @Get('download/:requestId')
    @ApiOperation({ summary: 'Download completed export' })
    async download(
        @Req() req: Request,
        @Param('requestId') requestId: string,
        @Res() res: Response
    ) {
        const userId = (req as any).user?.id;
        const filePath = await this.dataExportService.getDownloadPath(requestId, userId);
        const request = await this.dataExportService.getExportStatus(requestId, userId);

        // Set content disposition for download
        const filename = `lightkeepers-export-${new Date().toISOString().split('T')[0]}.${request.format}`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Set content type based on format
        switch (request.format) {
            case 'json':
                res.setHeader('Content-Type', 'application/json');
                break;
            case 'csv':
                res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                break;
            case 'zip':
                res.setHeader('Content-Type', 'application/zip');
                break;
        }

        return res.sendFile(filePath);
    }
}
