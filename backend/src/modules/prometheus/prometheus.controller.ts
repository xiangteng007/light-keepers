import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrometheusService } from './prometheus.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@ApiTags('Metrics 監控指標')
@Controller('metrics')
// 定級理由：Prometheus 指標會揭露基礎設施拓樸與流量特徵，主要防線為網路層（VPC/內網）不對外曝露，應用層再以 L4 兜底。
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.CHAIRMAN)
export class PrometheusController {
    constructor(private readonly prometheusService: PrometheusService) { }

    @Get()
    @Header('Content-Type', 'text/plain')
    @ApiOperation({ summary: 'Prometheus 指標', description: '取得 Prometheus 格式監控指標' })
    async getMetrics(): Promise<string> {
        return this.prometheusService.getMetrics();
    }

    @Get('json')
    @ApiOperation({ summary: 'JSON 指標', description: '取得 JSON 格式監控指標' })
    async getMetricsJson(): Promise<any> {
        return this.prometheusService.getMetricsJson();
    }
}
