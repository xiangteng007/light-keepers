import { Controller, Get, Post, Put, Param, Query, Body, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBody, ApiHeader } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { ScalabilityService } from './scalability.service';
import {
    QueueOfflineOperationDto,
    ResolveConflictDto,
    UpdateRateLimitConfigDto,
} from './dto/scalability.dto';

// 定級理由：本 controller 全部是系統層級設定與韌性機制（限流、熔斷、SLA、離線同步佇列），
// 遭竄改會影響「全系統可用性」而非單一業務資料，屬「破壞性或全域設定」→ class 基準 L4（理事長）。
// 例外放寬：API 版本協商（`api/versions*`、`api/negotiate`）是用戶端相容性查詢，任何登入者都需要 → L1；
// 離線同步佇列（`offline/*`）是每位外勤使用者自己的待同步資料 → L2（含衝突解決，屬第一線作業）。
@ApiTags('Scalability')
@Controller('scalability')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.CHAIRMAN)
export class ScalabilityController {
    constructor(private readonly scalability: ScalabilityService) {}

    // === System Health ===

    @Get('health')
    @ApiOperation({ summary: '取得系統健康狀態' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    async getSystemHealth() {
        return this.scalability.getSystemHealth();
    }

    // === Offline Sync ===

    @Get('offline/:clientId/pending')
    @ApiOperation({ summary: '取得待同步操作' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    getPendingOperations(@Param('clientId') clientId: string) {
        return this.scalability.getPendingOperations(clientId);
    }

    @Get('offline/:clientId/conflicts')
    @ApiOperation({ summary: '取得衝突操作' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    getConflictOperations(@Param('clientId') clientId: string) {
        return this.scalability.getConflictOperations(clientId);
    }

    @Post('offline/:clientId/sync')
    @ApiOperation({ summary: '同步離線操作' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async syncOperations(@Param('clientId') clientId: string) {
        return this.scalability.syncOfflineOperations(clientId);
    }

    @Post('offline/queue')
    @ApiOperation({ summary: '排隊離線操作' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    queueOperation(@Body() data: QueueOfflineOperationDto) {
        return this.scalability.queueOfflineOperation(data);
    }

    @Put('offline/:operationId/resolve')
    @ApiOperation({ summary: '解決衝突' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    resolveConflict(
        @Param('operationId') operationId: string,
        @Body() body: ResolveConflictDto
    ) {
        return { resolved: this.scalability.resolveConflict(operationId, body.resolution, body.mergedData) };
    }

    // === API Versioning ===

    @Get('api/versions')
    @ApiOperation({ summary: '取得 API 版本列表' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getApiVersions() {
        return this.scalability.getAllApiVersions();
    }

    @Get('api/versions/current')
    @ApiOperation({ summary: '取得當前 API 版本' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getCurrentApiVersion() {
        return { version: this.scalability.getCurrentApiVersion() };
    }

    @Get('api/versions/:version')
    @ApiOperation({ summary: '取得特定版本資訊' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getApiVersion(@Param('version') version: string) {
        return this.scalability.getApiVersion(version);
    }

    @Get('api/negotiate')
    @ApiOperation({ summary: '協商 API 版本' })
    @ApiQuery({ name: 'version', required: false })
    @ApiHeader({ name: 'Accept', required: false })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    negotiateVersion(
        @Query('version') version?: string,
        @Headers('accept') accept?: string
    ) {
        return this.scalability.negotiateApiVersion(version || '', accept);
    }

    // === SLA Monitor ===

    @Get('sla/targets')
    @ApiOperation({ summary: '取得 SLA 目標' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    getSlaTargets() {
        return this.scalability.getSlaTargets();
    }

    @Get('sla/metrics')
    @ApiOperation({ summary: '取得當前 SLA 指標' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    async getSlaMetrics() {
        return this.scalability.getSlaMetrics();
    }

    @Get('sla/report')
    @ApiOperation({ summary: '生成 SLA 報告' })
    @ApiQuery({ name: 'hours', required: false, description: '報告時間範圍（小時）' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    getSlaReport(@Query('hours') hours?: string) {
        return this.scalability.generateSlaReport(hours ? parseInt(hours) : undefined);
    }

    @Get('sla/compliant')
    @ApiOperation({ summary: '檢查 SLA 合規性' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    checkSlaCompliance() {
        return { compliant: this.scalability.isSlaCompliant() };
    }

    // === Circuit Breaker ===

    @Get('circuits')
    @ApiOperation({ summary: '取得所有熔斷器狀態' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    getAllCircuits() {
        return this.scalability.getAllCircuitStatus();
    }

    @Get('circuits/:name')
    @ApiOperation({ summary: '取得熔斷器狀態' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    getCircuit(@Param('name') name: string) {
        return this.scalability.getCircuitStatus(name);
    }

    @Post('circuits/:name/reset')
    @ApiOperation({ summary: '重置熔斷器' })
    @RequiredLevel(ROLE_LEVELS.CHAIRMAN)
    resetCircuit(@Param('name') name: string) {
        this.scalability.resetCircuit(name);
        return { reset: true };
    }

    // === Rate Limiter ===

    @Get('rate-limits')
    @ApiOperation({ summary: '取得限流配置' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    getRateLimitConfigs() {
        return this.scalability.getRateLimitConfigs();
    }

    @Get('rate-limits/:name/:key')
    @ApiOperation({ summary: '檢查限流狀態' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    checkRateLimit(@Param('name') name: string, @Param('key') key: string) {
        return this.scalability.checkRateLimit(name, key, 0); // 只檢查不消耗
    }

    @Put('rate-limits/:name')
    @ApiOperation({ summary: '更新限流配置' })
    @RequiredLevel(ROLE_LEVELS.CHAIRMAN)
    updateRateLimitConfig(@Param('name') name: string, @Body() updates: UpdateRateLimitConfigDto) {
        return { updated: this.scalability.updateRateLimitConfig(name, updates) };
    }

    @Post('rate-limits/:name/:key/reset')
    @ApiOperation({ summary: '重置限流計數' })
    @RequiredLevel(ROLE_LEVELS.CHAIRMAN)
    resetRateLimit(@Param('name') name: string, @Param('key') key: string) {
        this.scalability.resetRateLimit(name, key);
        return { reset: true };
    }
}
