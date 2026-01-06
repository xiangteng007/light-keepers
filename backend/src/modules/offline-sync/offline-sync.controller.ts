import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OfflineSyncService } from './offline-sync.service';

@ApiTags('Offline Sync 離線同步')
@Controller('api/sync')
export class OfflineSyncController {
    constructor(private readonly syncService: OfflineSyncService) { }

    @Post('upload')
    @ApiOperation({ summary: '上傳離線資料', description: '同步客戶端離線期間產生的資料' })
    async uploadSync(@Body() body: { userId: string; items: any[] }): Promise<any> {
        return this.syncService.processSync(body.userId, body.items);
    }

    @Get('pending')
    @ApiOperation({ summary: '取得待同步項目', description: '取得伺服器端等待同步的項目' })
    getPending(@Query('userId') userId: string): any {
        return this.syncService.getPendingItems(userId);
    }

    @Get('updates')
    @ApiOperation({ summary: '取得更新', description: '取得自上次同步後的更新' })
    getUpdates(@Query('userId') userId: string, @Query('since') since: string): any {
        return this.syncService.getUpdatesForClient(userId, new Date(since));
    }

    @Get('summary')
    @ApiOperation({ summary: '離線資料摘要', description: '取得離線同步統計' })
    getSummary(): any {
        return this.syncService.getOfflineDataSummary();
    }
}
