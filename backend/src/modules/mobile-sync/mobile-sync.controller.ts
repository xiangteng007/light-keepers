import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MobileSyncService } from './mobile-sync.service';

@ApiTags('Mobile Sync')
@ApiBearerAuth()
@Controller('mobile-sync')
export class MobileSyncController {
    constructor(private readonly mobileSyncService: MobileSyncService) { }

    // ===== 裝置同步 =====

    @Get('state/:deviceId')
    @ApiOperation({ summary: '取得裝置同步狀態' })
    getSyncState(@Param('deviceId') deviceId: string) {
        return this.mobileSyncService.getSyncState(deviceId);
    }

    @Post('register')
    @ApiOperation({ summary: '註冊裝置' })
    registerDevice(@Body() dto: { deviceId: string; userId: string; version: string }) {
        return this.mobileSyncService.registerDevice(dto.deviceId, dto.userId, dto.version);
    }

    @Put('state/:deviceId')
    @ApiOperation({ summary: '更新同步狀態' })
    updateSyncState(@Param('deviceId') deviceId: string, @Body() updates: any) {
        return this.mobileSyncService.updateSyncState(deviceId, updates);
    }

    // ===== 離線打卡 =====

    @Post('offline-checkin')
    @ApiOperation({ summary: '提交離線打卡記錄' })
    queueOfflineCheckIn(@Body() dto: {
        volunteerId: string;
        deviceId: string;
        timestamp: Date;
        location: { lat: number; lng: number; accuracy?: number };
        type: 'check_in' | 'check_out';
    }) {
        return this.mobileSyncService.queueOfflineCheckIn(dto);
    }

    @Get('offline-queue/:deviceId')
    @ApiOperation({ summary: '取得離線隊列' })
    getOfflineQueue(@Param('deviceId') deviceId: string) {
        return this.mobileSyncService.getOfflineQueue(deviceId);
    }

    @Post('sync/:deviceId')
    @ApiOperation({ summary: '執行同步' })
    async syncOfflineQueue(@Param('deviceId') deviceId: string) {
        return this.mobileSyncService.syncOfflineQueue(deviceId);
    }

    @Delete('synced/:deviceId')
    @ApiOperation({ summary: '清除已同步項目' })
    clearSyncedItems(@Param('deviceId') deviceId: string) {
        const cleared = this.mobileSyncService.clearSyncedItems(deviceId);
        return { cleared };
    }

    // ===== 推播通知 =====

    @Post('push/register')
    @ApiOperation({ summary: '註冊推播訂閱' })
    registerPushSubscription(@Body() dto: {
        userId: string;
        deviceId: string;
        token: string;
        platform: 'ios' | 'android' | 'web';
        topics?: string[];
    }) {
        return this.mobileSyncService.registerPushSubscription(dto);
    }

    @Get('push/:deviceId')
    @ApiOperation({ summary: '取得推播訂閱' })
    getSubscription(@Param('deviceId') deviceId: string) {
        return this.mobileSyncService.getSubscription(deviceId);
    }

    @Get('push/user/:userId')
    @ApiOperation({ summary: '取得用戶所有裝置訂閱' })
    getUserSubscriptions(@Param('userId') userId: string) {
        return this.mobileSyncService.getUserSubscriptions(userId);
    }

    @Put('push/:deviceId')
    @ApiOperation({ summary: '更新推播設定' })
    updateSubscription(@Param('deviceId') deviceId: string, @Body() updates: any) {
        return this.mobileSyncService.updateSubscription(deviceId, updates);
    }

    @Post('push/:deviceId/topic')
    @ApiOperation({ summary: '切換主題訂閱' })
    toggleTopic(
        @Param('deviceId') deviceId: string,
        @Body() dto: { topic: string; enabled: boolean }
    ) {
        const success = this.mobileSyncService.toggleTopic(deviceId, dto.topic, dto.enabled);
        return { success };
    }

    @Post('push/send/:userId')
    @ApiOperation({ summary: '發送推播通知給用戶' })
    async sendPushNotification(
        @Param('userId') userId: string,
        @Body() notification: { title: string; body: string; data?: Record<string, any> }
    ) {
        const sent = await this.mobileSyncService.sendPushNotification(userId, notification);
        return { sent };
    }

    @Post('push/broadcast/:topic')
    @ApiOperation({ summary: '廣播推播通知到主題' })
    async broadcastToTopic(
        @Param('topic') topic: string,
        @Body() notification: { title: string; body: string; data?: Record<string, any> }
    ) {
        const sent = await this.mobileSyncService.broadcastToTopic(topic, notification);
        return { sent };
    }

    // ===== GPS 追蹤 =====

    @Post('location/:userId')
    @ApiOperation({ summary: '回報位置' })
    reportLocation(
        @Param('userId') userId: string,
        @Body() location: { lat: number; lng: number }
    ) {
        this.mobileSyncService.reportLocation(userId, location);
        return { success: true };
    }

    @Get('location/:userId/history')
    @ApiOperation({ summary: '取得位置歷史' })
    getLocationHistory(
        @Param('userId') userId: string,
        @Query('limit') limit?: number
    ) {
        return this.mobileSyncService.getLocationHistory(userId, limit || 20);
    }

    @Get('location/active')
    @ApiOperation({ summary: '取得活躍用戶位置' })
    getActiveUsers(@Query('minutes') minutes?: number) {
        return this.mobileSyncService.getActiveUsers(minutes || 10);
    }
}
