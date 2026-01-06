import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EventAiService } from './event-ai.service';

@ApiTags('Event AI Analysis API')
@ApiBearerAuth()
@Controller('event-ai')
export class EventAiController {
    constructor(private readonly service: EventAiService) { }

    @Get('patterns')
    @ApiOperation({ summary: '取得已識別的事件模式' })
    getPatterns() {
        return this.service.getPatterns();
    }

    @Post('patterns/analyze')
    @ApiOperation({ summary: '分析歷史事件找出模式' })
    analyzePatterns(@Body('events') events: any[]) {
        return this.service.analyzeHistoricalPatterns(events);
    }

    @Get('predictions')
    @ApiOperation({ summary: '取得所有區域風險預測' })
    getPredictions() {
        return this.service.getAreaPredictions();
    }

    @Post('predictions/:areaId')
    @ApiOperation({ summary: '預測特定區域風險' })
    predictRisk(
        @Param('areaId') areaId: string,
        @Body('areaName') areaName: string
    ) {
        return this.service.predictRisk(areaId, areaName || areaId);
    }

    @Post('estimate-resources')
    @ApiOperation({ summary: '預估事件所需資源' })
    estimateResources(
        @Body() data: { eventType: string; severity: string; affectedPopulation: number }
    ) {
        return this.service.estimateResources(data.eventType, data.severity, data.affectedPopulation);
    }

    @Post('recommendations/:eventId')
    @ApiOperation({ summary: '產生事件處理建議' })
    generateRecommendations(
        @Param('eventId') eventId: string,
        @Body() eventData: any
    ) {
        return this.service.generateRecommendations(eventId, eventData);
    }

    @Post('summary')
    @ApiOperation({ summary: '產生 AI 事件摘要' })
    generateSummary(@Body() eventData: any) {
        return { summary: this.service.generateEventSummary(eventData) };
    }
}
