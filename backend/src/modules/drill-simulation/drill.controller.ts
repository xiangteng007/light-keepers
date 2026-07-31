/**
 * 演練控制器 (Drill Controller)
 * 模組 A: 演練管理 API
 */

import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DrillSimulationService } from './drill.service';
import { DrillScenario, DrillEvent } from './entities/drill-scenario.entity';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@ApiTags('drill')
@Controller('api/drill')
// 定級理由：演練狀態／腳本／範本查詢為參演志工的唯讀需求（L1）；腳本增修為 L2；啟停演練會切換全系統演練模式（影響真實災況判讀），提升至 L3。
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.VOLUNTEER)
export class DrillController {
    constructor(private readonly drillService: DrillSimulationService) { }

    // ==================== 狀態查詢 ====================

    @Get('status')
    @ApiOperation({ summary: '取得全域演練狀態' })
    async getStatus() {
        const state = this.drillService.getGlobalState();
        return {
            success: true,
            data: {
                ...state,
                message: state.isDrillMode ? '🔴 演練進行中' : '🟢 正常模式',
            },
        };
    }

    // ==================== 腳本管理 ====================

    @Get('scenarios')
    @ApiOperation({ summary: '取得所有演練腳本' })
    async getAllScenarios() {
        const scenarios = await this.drillService.getAllScenarios();
        return {
            success: true,
            data: scenarios,
        };
    }

    @Get('scenarios/:id')
    @ApiOperation({ summary: '取得腳本詳情' })
    async getScenario(@Param('id') id: string) {
        const scenario = await this.drillService.getScenario(id);
        return {
            success: !!scenario,
            data: scenario,
        };
    }

    @Post('scenarios')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 寫入：建立演練腳本
    @ApiOperation({ summary: '建立演練腳本' })
    async createScenario(
        @Body() body: {
            title: string;
            description?: string;
            events: DrillEvent[];
        }
    ) {
        const scenario = await this.drillService.createScenario({
            ...body,
            createdBy: 'system', // TODO: 從 JWT 取得
        });
        return {
            success: true,
            data: scenario,
            message: '演練腳本已建立',
        };
    }

    @Put('scenarios/:id')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 寫入：更新演練腳本
    @ApiOperation({ summary: '更新演練腳本' })
    async updateScenario(
        @Param('id') id: string,
        @Body() body: Partial<DrillScenario>
    ) {
        const scenario = await this.drillService.updateScenario(id, body);
        return {
            success: true,
            data: scenario,
        };
    }

    // ==================== 演練執行 ====================

    @Post('start/:scenarioId')
    @RequiredLevel(ROLE_LEVELS.DIRECTOR) // 全域狀態：切換全系統為演練模式
    @ApiOperation({ summary: '啟動演練' })
    async startDrill(@Param('scenarioId') scenarioId: string) {
        const result = await this.drillService.startDrill(scenarioId);
        return {
            success: result.success,
            message: result.message,
        };
    }

    @Post('stop')
    @RequiredLevel(ROLE_LEVELS.DIRECTOR) // 全域狀態：結束演練模式
    @ApiOperation({ summary: '停止演練' })
    async stopDrill() {
        const result = await this.drillService.stopDrill();
        return {
            success: result.success,
            data: result.result,
            message: '演練已結束',
        };
    }

    @Post('respond/:eventIndex')
    @ApiOperation({ summary: '記錄事件回應' })
    async recordResponse(
        @Param('eventIndex') eventIndex: string,
        @Body() body: { responseTimeMs: number }
    ) {
        this.drillService.recordEventResponse(
            parseInt(eventIndex),
            body.responseTimeMs
        );
        return {
            success: true,
            message: '回應已記錄',
        };
    }

    // ==================== 腳本範本 ====================

    @Get('templates')
    @ApiOperation({ summary: '取得預設演練範本' })
    async getTemplates() {
        const templates = [
            {
                id: 'earthquake-basic',
                title: '地震應變演練 (基礎)',
                description: '模擬規模 6.0 地震，測試基本應變流程',
                events: [
                    { time: 'T+0', offsetMinutes: 0, type: 'CUSTOM', description: '地震發生', payload: { magnitude: 6.0 } },
                    { time: 'T+2', offsetMinutes: 2, type: 'SOS', description: '收到首批 SOS', payload: { count: 10 }, location: { lat: 25.033, lng: 121.565 } },
                    { time: 'T+5', offsetMinutes: 5, type: 'REPORT', description: '建物倒塌回報', payload: { severity: 'high', reportType: 'structure_damage' } },
                    { time: 'T+10', offsetMinutes: 10, type: 'RESOURCE_REQUEST', description: '物資需求', payload: { resourceType: 'medical', quantity: 50 } },
                    { time: 'T+20', offsetMinutes: 20, type: 'EVACUATION', description: '疏散命令', payload: { zone: 'A區', population: 500 } },
                ],
            },
            {
                id: 'flood-advanced',
                title: '水患應變演練 (進階)',
                description: '模擬豪雨成災，含通訊中斷情境',
                events: [
                    { time: 'T+0', offsetMinutes: 0, type: 'CUSTOM', description: '豪雨警報發布', payload: { rainfall: 350 } },
                    { time: 'T+10', offsetMinutes: 10, type: 'SOS', description: '低窪區求救', payload: { count: 25 }, location: { lat: 25.01, lng: 121.52 } },
                    { time: 'T+15', offsetMinutes: 15, type: 'COMMUNICATION_FAILURE', description: '基地台斷訊', payload: { areas: ['信義區', '松山區'], duration: 30 } },
                    { time: 'T+25', offsetMinutes: 25, type: 'RESOURCE_REQUEST', description: '橡皮艇需求', payload: { resourceType: 'boat', quantity: 10 } },
                    { time: 'T+40', offsetMinutes: 40, type: 'EVACUATION', description: '全區撤離', payload: { zone: '全區', population: 2000 } },
                ],
            },
            {
                id: 'complex-disaster',
                title: '複合型災害演練',
                description: '地震引發火災與化學洩漏',
                events: [
                    { time: 'T+0', offsetMinutes: 0, type: 'CUSTOM', description: '地震發生', payload: { magnitude: 6.5 } },
                    { time: 'T+3', offsetMinutes: 3, type: 'REPORT', description: '工廠起火', payload: { severity: 'critical', reportType: 'fire' } },
                    { time: 'T+5', offsetMinutes: 5, type: 'REPORT', description: '化學品外洩', payload: { severity: 'critical', reportType: 'hazmat' } },
                    { time: 'T+8', offsetMinutes: 8, type: 'SOS', description: '大量傷患', payload: { count: 50 } },
                    { time: 'T+12', offsetMinutes: 12, type: 'EVACUATION', description: '半徑 2km 撤離', payload: { zone: '化災區', population: 5000 } },
                    { time: 'T+20', offsetMinutes: 20, type: 'RESOURCE_REQUEST', description: '防護裝備需求', payload: { resourceType: 'hazmat_suit', quantity: 30 } },
                ],
            },
        ];

        return {
            success: true,
            data: templates,
        };
    }
}
