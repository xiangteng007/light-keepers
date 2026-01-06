import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TrendPredictionService } from './trend-prediction.service';

@ApiTags('Trend Prediction 趨勢預測')
@Controller('api/trends')
export class TrendPredictionController {
    constructor(private readonly trendService: TrendPredictionService) { }

    @Get('predict/:region/:type')
    @ApiOperation({ summary: '預測災害機率', description: '預測特定區域和災害類型的發生機率' })
    @ApiQuery({ name: 'days', required: false, description: '預測天數', example: 7 })
    async predictProbability(
        @Param('region') region: string,
        @Param('type') type: string,
        @Query('days') days?: number,
    ): Promise<any> {
        return this.trendService.predictDisasterProbability(region, type, days || 7);
    }

    @Get('risk/:region')
    @ApiOperation({ summary: '區域風險概覽', description: '取得特定區域所有災害類型的風險評估' })
    async getRegionRisk(@Param('region') region: string): Promise<any> {
        return this.trendService.getRegionRiskOverview(region);
    }

    @Get('seasonal/:region')
    @ApiOperation({ summary: '季節性趨勢', description: '取得區域全年災害季節性趨勢' })
    getSeasonalTrends(@Param('region') region: string): any {
        return this.trendService.getSeasonalTrends(region);
    }

    @Get('resource-demand/:region/:scenario')
    @ApiOperation({ summary: '資源需求預測', description: '預測特定災害情境的資源需求' })
    async predictResourceDemand(
        @Param('region') region: string,
        @Param('scenario') scenario: string,
    ): Promise<any> {
        return this.trendService.predictResourceDemand(region, scenario);
    }
}
