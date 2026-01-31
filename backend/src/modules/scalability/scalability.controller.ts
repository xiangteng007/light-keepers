import { Controller, Get, Post, Put, Param, Query, Body, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBody, ApiHeader } from '@nestjs/swagger';
import { ScalabilityService } from './scalability.service';

@ApiTags('Scalability')
@Controller('scalability')
export class ScalabilityController {
    constructor(private readonly scalability: ScalabilityService) {}

    // === System Health ===

    @Get('health')
    @ApiOperation({ summary: '取得系統健康狀態' })
    async getSystemHealth() {
        return this.scalability.getSystemHealth();
    }

    // === Offline Sync ===

    @Get('offline/:clientId/pending')
    @ApiOperation({ summary: '取得待同步操作' })
    getPendingOperations(@Param('clientId') clientId: string) {
        return this.scalability.getPendingOperations(clientId);
    }

    @Get('offline/:clientId/conflicts')
    @ApiOperation({ summary: '取得衝突操作' })
    getConflictOperations(@Param('clientId') clientId: string) {
        return this.scalability.getConflictOperations(clientId);
    }

    @Post('offline/:clientId/sync')
    @ApiOperation({ summary: '同步離線操作' })
    async syncOperations(@Param('clientId') clientId: string) {
        return this.scalability.syncOfflineOperations(clientId);
    }

    @Post('offline/queue')
    @ApiOperation({ summary: '排隊離線操作' })
    queueOperation(@Body() data: any) {
        return this.scalability.queueOfflineOperation(data);
    }

    @Put('offline/:operationId/resolve')
    @ApiOperation({ summary: '解決衝突' })
    resolveConflict(
        @Param('operationId') operationId: string,
        @Body() body: { resolution: 'use_client' | 'use_server' | 'merge'; mergedData?: any }
    ) {
        return { resolved: this.scalability.resolveConflict(operationId, body.resolution, body.mergedData) };
    }

    // === API Versioning ===

    @Get('api/versions')
    @ApiOperation({ summary: '取得 API 版本列表' })
    getApiVersions() {
        return this.scalability.getAllApiVersions();
    }

    @Get('api/versions/current')
    @ApiOperation({ summary: '取得當前 API 版本' })
    getCurrentApiVersion() {
        return { version: this.scalability.getCurrentApiVersion() };
    }

    @Get('api/versions/:version')
    @ApiOperation({ summary: '取得特定版本資訊' })
    getApiVersion(@Param('version') version: string) {
        return this.scalability.getApiVersion(version);
    }

    @Get('api/negotiate')
    @ApiOperation({ summary: '協商 API 版本' })
    @ApiQuery({ name: 'version', required: false })
    @ApiHeader({ name: 'Accept', required: false })
    negotiateVersion(
        @Query('version') version?: string,
        @Headers('accept') accept?: string
    ) {
        return this.scalability.negotiateApiVersion(version || '', accept);
    }

    // === SLA Monitor ===

    @Get('sla/targets')
    @ApiOperation({ summary: '取得 SLA 目標' })
    getSlaTargets() {
        return this.scalability.getSlaTargets();
    }

    @Get('sla/metrics')
    @ApiOperation({ summary: '取得當前 SLA 指標' })
    async getSlaMetrics() {
        return this.scalability.getSlaMetrics();
    }

    @Get('sla/report')
    @ApiOperation({ summary: '生成 SLA 報告' })
    @ApiQuery({ name: 'hours', required: false, description: '報告時間範圍（小時）' })
    getSlaReport(@Query('hours') hours?: string) {
        return this.scalability.generateSlaReport(hours ? parseInt(hours) : undefined);
    }

    @Get('sla/compliant')
    @ApiOperation({ summary: '檢查 SLA 合規性' })
    checkSlaCompliance() {
        return { compliant: this.scalability.isSlaCompliant() };
    }

    // === Circuit Breaker ===

    @Get('circuits')
    @ApiOperation({ summary: '取得所有熔斷器狀態' })
    getAllCircuits() {
        return this.scalability.getAllCircuitStatus();
    }

    @Get('circuits/:name')
    @ApiOperation({ summary: '取得熔斷器狀態' })
    getCircuit(@Param('name') name: string) {
        return this.scalability.getCircuitStatus(name);
    }

    @Post('circuits/:name/reset')
    @ApiOperation({ summary: '重置熔斷器' })
    resetCircuit(@Param('name') name: string) {
        this.scalability.resetCircuit(name);
        return { reset: true };
    }

    // === Rate Limiter ===

    @Get('rate-limits')
    @ApiOperation({ summary: '取得限流配置' })
    getRateLimitConfigs() {
        return this.scalability.getRateLimitConfigs();
    }

    @Get('rate-limits/:name/:key')
    @ApiOperation({ summary: '檢查限流狀態' })
    checkRateLimit(@Param('name') name: string, @Param('key') key: string) {
        return this.scalability.checkRateLimit(name, key, 0); // 只檢查不消耗
    }

    @Put('rate-limits/:name')
    @ApiOperation({ summary: '更新限流配置' })
    updateRateLimitConfig(@Param('name') name: string, @Body() updates: any) {
        return { updated: this.scalability.updateRateLimitConfig(name, updates) };
    }

    @Post('rate-limits/:name/:key/reset')
    @ApiOperation({ summary: '重置限流計數' })
    resetRateLimit(@Param('name') name: string, @Param('key') key: string) {
        this.scalability.resetRateLimit(name, key);
        return { reset: true };
    }
}
