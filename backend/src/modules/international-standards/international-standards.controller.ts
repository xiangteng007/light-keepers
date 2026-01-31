import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { InternationalStandardsService } from './international-standards.service';
import { IcsFormType } from './services/ics-forms.service';
import { SphereStandard } from './services/sphere-standards.service';

@ApiTags('International Standards')
@Controller('standards')
export class InternationalStandardsController {
    constructor(private readonly standards: InternationalStandardsService) {}

    // === ICS Forms ===

    @Get('ics/templates/:formType')
    @ApiOperation({ summary: '取得 ICS 表單範本' })
    getIcsTemplate(@Param('formType') formType: IcsFormType) {
        return this.standards.getIcsFormTemplate(formType);
    }

    @Post('ics/201')
    @ApiOperation({ summary: '生成 ICS-201 事件概述' })
    generateIcs201(@Body() data: any) {
        return this.standards.generateIcs201(data);
    }

    @Post('ics/214')
    @ApiOperation({ summary: '生成 ICS-214 活動日誌' })
    generateIcs214(@Body() data: any) {
        return this.standards.generateIcs214(data);
    }

    @Post('ics/validate/:formType')
    @ApiOperation({ summary: '驗證 ICS 表單' })
    validateIcsForm(@Param('formType') formType: IcsFormType, @Body() data: any) {
        return this.standards.validateIcsForm(formType, data);
    }

    @Get('ics/forms')
    @ApiOperation({ summary: '列出所有 ICS 表單' })
    listIcsForms() {
        return this.standards.listIcsForms();
    }

    // === HXL Export ===

    @Post('hxl/missions')
    @ApiOperation({ summary: '匯出任務資料為 HXL 格式' })
    exportMissionsHxl(@Body() missions: any[]) {
        const dataset = this.standards.exportMissionsToHxl(missions);
        return this.standards.hxlToJson(dataset);
    }

    @Post('hxl/resources')
    @ApiOperation({ summary: '匯出資源資料為 HXL 格式' })
    exportResourcesHxl(@Body() resources: any[]) {
        const dataset = this.standards.exportResourcesToHxl(resources);
        return this.standards.hxlToJson(dataset);
    }

    @Post('hxl/3w')
    @ApiOperation({ summary: '匯出 3W 資料為 HXL 格式' })
    export3WHxl(@Body() activities: any[]) {
        const dataset = this.standards.export3WToHxl(activities);
        return this.standards.hxlToJson(dataset);
    }

    // === OCHA 3W ===

    @Get('ocha/3w')
    @ApiOperation({ summary: '取得所有 3W 記錄' })
    getAll3WRecords() {
        return this.standards.getAll3WRecords();
    }

    @Get('ocha/3w/cluster/:cluster')
    @ApiOperation({ summary: '依 Cluster 取得 3W 記錄' })
    get3WByCluster(@Param('cluster') cluster: string) {
        return this.standards.get3WByCluster(cluster);
    }

    @Get('ocha/3w/location')
    @ApiOperation({ summary: '依位置取得 3W 記錄' })
    @ApiQuery({ name: 'admin1', required: true })
    @ApiQuery({ name: 'admin2', required: false })
    get3WByLocation(@Query('admin1') admin1: string, @Query('admin2') admin2?: string) {
        return this.standards.get3WByLocation(admin1, admin2);
    }

    @Post('ocha/3w')
    @ApiOperation({ summary: '新增 3W 記錄' })
    add3WRecord(@Body() data: any) {
        return this.standards.add3WRecord(data);
    }

    @Get('ocha/matrix')
    @ApiOperation({ summary: '生成 3W Matrix 摘要' })
    generate3WMatrix() {
        return this.standards.generate3WMatrix();
    }

    @Get('ocha/cluster/:cluster/report')
    @ApiOperation({ summary: '生成 Cluster 報告' })
    generateClusterReport(@Param('cluster') cluster: string) {
        return this.standards.generateClusterReport(cluster);
    }

    @Post('ocha/import')
    @ApiOperation({ summary: '匯入 OCHA 資料' })
    import3WData(@Body() data: any[]) {
        return { imported: this.standards.import3WData(data) };
    }

    // === Sphere Standards ===

    @Get('sphere/indicators')
    @ApiOperation({ summary: '取得所有 Sphere 指標' })
    getSphereIndicators() {
        return this.standards.getSphereIndicators();
    }

    @Get('sphere/indicators/:standard')
    @ApiOperation({ summary: '依標準取得 Sphere 指標' })
    getSphereIndicatorsByStandard(@Param('standard') standard: SphereStandard) {
        return this.standards.getSphereIndicatorsByStandard(standard);
    }

    @Post('sphere/check/:missionId')
    @ApiOperation({ summary: '執行 Sphere 合規檢核' })
    checkSphereCompliance(
        @Param('missionId') missionId: string,
        @Body() body: { missionName: string; data: Record<string, number> }
    ) {
        return this.standards.checkSphereCompliance(missionId, body.missionName, body.data);
    }

    @Post('sphere/quick-check')
    @ApiOperation({ summary: '快速 Sphere 檢核' })
    quickSphereCheck(@Body() data: any) {
        return this.standards.quickSphereCheck(data);
    }
}
