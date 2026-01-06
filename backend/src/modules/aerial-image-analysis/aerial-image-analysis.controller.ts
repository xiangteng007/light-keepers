import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AerialImageAnalysisService } from './aerial-image-analysis.service';

@ApiTags('Aerial Image Analysis')
@ApiBearerAuth()
@Controller('aerial-analysis')
export class AerialImageAnalysisController {
    constructor(private readonly service: AerialImageAnalysisService) { }

    @Post('images')
    @ApiOperation({ summary: '上傳航拍影像' })
    uploadImage(@Body() dto: any) {
        return this.service.uploadImage(dto);
    }

    @Get('images/:id')
    @ApiOperation({ summary: '取得影像' })
    getImage(@Param('id') id: string) {
        return this.service.getImage(id);
    }

    @Get('images/mission/:missionId')
    @ApiOperation({ summary: '依任務取得影像' })
    getImagesByMission(@Param('missionId') missionId: string) {
        return this.service.getImagesByMission(missionId);
    }

    @Get('images/pending')
    @ApiOperation({ summary: '待分析影像' })
    getPendingImages() {
        return this.service.getPendingImages();
    }

    @Post('images/:id/analyze')
    @ApiOperation({ summary: '分析單張影像' })
    async analyzeImage(@Param('id') id: string) {
        return this.service.analyzeImage(id);
    }

    @Post('images/batch-analyze')
    @ApiOperation({ summary: '批次分析' })
    async batchAnalyze(@Body() dto: { imageIds: string[] }) {
        return this.service.batchAnalyze(dto.imageIds);
    }

    @Post('assessments')
    @ApiOperation({ summary: '生成損害評估' })
    generateDamageAssessment(@Body() dto: { areaId: string; areaName: string; imageIds: string[] }) {
        return this.service.generateDamageAssessment(dto.areaId, dto.areaName, dto.imageIds);
    }

    @Get('assessments')
    @ApiOperation({ summary: '取得所有評估' })
    getAllAssessments() {
        return this.service.getAllAssessments();
    }

    @Get('assessments/:id')
    @ApiOperation({ summary: '取得評估' })
    getDamageAssessment(@Param('id') id: string) {
        return this.service.getDamageAssessment(id);
    }

    @Post('compare')
    @ApiOperation({ summary: '前後比對' })
    compareBeforeAfter(@Body() dto: { beforeImageId: string; afterImageId: string }) {
        return this.service.compareBeforeAfter(dto.beforeImageId, dto.afterImageId);
    }

    @Get('detections/persons')
    @ApiOperation({ summary: '人員偵測統計' })
    getPersonDetections(@Query('missionId') missionId?: string) {
        return this.service.getPersonDetections(missionId);
    }
}
