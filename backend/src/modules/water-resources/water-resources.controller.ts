import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WaterResourcesService } from './water-resources.service';

@ApiTags('Water Resources 水利署')
@Controller('api/water')
export class WaterResourcesController {
    constructor(private readonly waterService: WaterResourcesService) { }

    @Get('river-levels')
    @ApiOperation({ summary: '河川水位', description: '取得河川水位資料' })
    getRiverLevels(): any {
        return this.waterService.getRiverLevels();
    }

    @Get('reservoirs')
    @ApiOperation({ summary: '水庫水情', description: '取得水庫狀態' })
    getReservoirStatus(): any {
        return this.waterService.getReservoirStatus();
    }

    @Get('flood-zones/:region')
    @ApiOperation({ summary: '淹水潛勢區', description: '取得淹水潛勢區域' })
    getFloodZones(@Param('region') region: string): any {
        return this.waterService.getFloodPotentialAreas(region);
    }

    @Get('alerts')
    @ApiOperation({ summary: '水情警報', description: '取得進行中的水情警報' })
    getAlerts(): any {
        return this.waterService.getActiveAlerts();
    }

    @Post('subscribe')
    @ApiOperation({ summary: '訂閱警報', description: '訂閱特定區域的水情警報' })
    subscribeAlerts(@Body() body: { regions: string[]; callbackUrl: string }): any {
        return this.waterService.subscribeToAlerts(body.regions, body.callbackUrl);
    }
}
