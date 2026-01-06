import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TccipClimateService } from './tccip-climate.service';

@ApiTags('TCCIP Climate 氣候資料')
@Controller('api/climate')
export class TccipClimateController {
    constructor(private readonly climateService: TccipClimateService) { }

    @Get('trends/:region')
    @ApiOperation({ summary: '氣候趨勢', description: '取得區域氣候變遷趨勢' })
    async getClimateTrends(@Param('region') region: string): Promise<any> {
        return this.climateService.getClimateTrends(region);
    }

    @Get('extreme-weather/:region')
    @ApiOperation({ summary: '極端天氣預測', description: '取得極端天氣事件預測' })
    async getExtremeWeather(@Param('region') region: string): Promise<any> {
        return this.climateService.getExtremeWeatherForecast(region);
    }

    @Get('vulnerability/:region')
    @ApiOperation({ summary: '脆弱度評估', description: '取得區域氣候脆弱度評估' })
    async getVulnerability(@Param('region') region: string): Promise<any> {
        return this.climateService.getVulnerabilityAssessment(region);
    }

    @Get('disaster-stats/:region')
    @ApiOperation({ summary: '歷史災害統計', description: '取得歷史災害統計' })
    async getDisasterStats(@Param('region') region: string, @Query('years') years?: number): Promise<any> {
        return this.climateService.getHistoricalDisasterStats(region, years);
    }

    @Get('adaptation')
    @ApiOperation({ summary: '調適策略', description: '取得氣候調適策略建議' })
    getAdaptation(@Query('risks') risks: string): any {
        return this.climateService.getAdaptationStrategies(risks.split(','));
    }
}
