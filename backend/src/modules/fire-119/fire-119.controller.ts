/**
 * fire-119.controller.ts
 * 
 * REST API Controller for Fire 119 Integration
 * Provides endpoints for fire department dispatch system integration
 */
import {
    Controller,
    Get,
    Post,
    Query,
    Param,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Fire119Service } from './fire-119.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@ApiTags('Fire 119 Integration')
@ApiBearerAuth()
@Controller('fire-119')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
export class Fire119Controller {
    constructor(private readonly fire119Service: Fire119Service) {}

    /**
     * 取得最新消防案件
     */
    @Get('incidents')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiOperation({ summary: '取得最新消防案件', description: '查詢指定時間範圍內的消防案件' })
    @ApiQuery({ name: 'region', required: false, description: '區域代碼' })
    @ApiQuery({ name: 'hours', required: false, type: Number, description: '查詢時間範圍（小時）' })
    async getRecentIncidents(
        @Query('region') region?: string,
        @Query('hours') hours?: number,
    ) {
        return this.fire119Service.getRecentIncidents(region, hours || 24);
    }

    /**
     * 取得案件詳情
     */
    @Get('incidents/:id')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiOperation({ summary: '取得案件詳情', description: '根據案件 ID 取得詳細資訊' })
    async getIncidentDetails(@Param('id') id: string) {
        const details = await this.fire119Service.getIncidentDetails(id);
        if (!details) {
            return { success: false, error: 'NOT_FOUND', message: '案件不存在' };
        }
        return { success: true, data: details };
    }

    /**
     * 取得消防車位置
     */
    @Get('units/locations')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiOperation({ summary: '取得消防車位置', description: '即時取得消防車 AVL 位置' })
    @ApiQuery({ name: 'region', required: true, description: '區域代碼' })
    async getFireUnitLocations(@Query('region') region: string) {
        const locations = await this.fire119Service.getFireUnitLocations(region);
        return { success: true, data: locations };
    }

    /**
     * 取得案件統計
     */
    @Get('statistics')
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    @ApiOperation({ summary: '取得案件統計', description: '取得指定區域的案件統計數據' })
    @ApiQuery({ name: 'region', required: true, description: '區域代碼' })
    @ApiQuery({ name: 'period', required: false, description: '統計週期 (day/week/month)' })
    async getIncidentStats(
        @Query('region') region: string,
        @Query('period') period?: string,
    ) {
        const stats = await this.fire119Service.getIncidentStats(region, period || 'day');
        return { success: true, data: stats };
    }

    /**
     * 訂閱即時案件推送
     */
    @Post('subscribe')
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    @ApiOperation({ summary: '訂閱即時案件推送', description: '設定 Webhook 接收即時案件通知' })
    async subscribeToIncidents(
        @Body() dto: { callbackUrl: string; types: string[] },
    ) {
        return this.fire119Service.subscribeToIncidents(dto.callbackUrl, dto.types);
    }
}
