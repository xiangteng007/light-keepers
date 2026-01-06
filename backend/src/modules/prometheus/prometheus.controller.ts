import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrometheusService } from './prometheus.service';

@ApiTags('Metrics 監控指標')
@Controller('metrics')
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
