import { Controller, Get, Post, Param, Query, Body, UseGuards, ParseArrayPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { InternationalStandardsService } from './international-standards.service';
import { IcsFormType } from './services/ics-forms.service';
import { SphereStandard } from './services/sphere-standards.service';
import {
    Add3WRecordDto,
    Export3WHxlItemDto,
    ExportMissionHxlItemDto,
    ExportResourceHxlItemDto,
    GenerateIcs201Dto,
    GenerateIcs214Dto,
    Import3WItemDto,
    QuickSphereCheckDto,
} from './dto/international-standards.dto';

/**
 * 這些端點的 body 為裸陣列（非物件），全域 ValidationPipe 無法直接套用 DTO，
 * 需改用 ParseArrayPipe 並顯式帶入與全域一致的 whitelist 設定。
 */
const ARRAY_BODY_PIPE_OPTIONS = {
    whitelist: true,
    forbidNonWhitelisted: true,
} as const;

// 定級理由：ICS/HXL/OCHA-3W/Sphere 皆為對外（跨機構、國際組織）交換的作戰與資源資料，
// 匯出即等於把任務、資源分佈與受助對象統計送出組織邊界 → class 基準 L2（幹部）。
// 純標準定義查詢（表單範本、指標清單）不含營運資料 → 放寬 L1；
// `ocha/import` 為批次寫入共用 3W 資料集（可覆蓋整份跨機構協調資料）→ 收緊 L3。
@ApiTags('International Standards')
@Controller('standards')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OFFICER)
export class InternationalStandardsController {
    constructor(private readonly standards: InternationalStandardsService) {}

    // === ICS Forms ===

    @Get('ics/templates/:formType')
    @ApiOperation({ summary: '取得 ICS 表單範本' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getIcsTemplate(@Param('formType') formType: IcsFormType) {
        return this.standards.getIcsFormTemplate(formType);
    }

    @Post('ics/201')
    @ApiOperation({ summary: '生成 ICS-201 事件概述' })
    generateIcs201(@Body() data: GenerateIcs201Dto) {
        return this.standards.generateIcs201(data);
    }

    @Post('ics/214')
    @ApiOperation({ summary: '生成 ICS-214 活動日誌' })
    generateIcs214(@Body() data: GenerateIcs214Dto) {
        return this.standards.generateIcs214(data);
    }

    @Post('ics/validate/:formType')
    @ApiOperation({ summary: '驗證 ICS 表單' })
    // 刻意不建 DTO：本端點的用途就是驗證「任意/部分填寫」的 ICS 表單，
    // 套用白名單 DTO 會讓它無法接收待驗證的草稿資料。
    // IcsFormsService.validateForm() 自身即為防禦性讀取，只取 incidentName 等少數欄位。
    validateIcsForm(@Param('formType') formType: IcsFormType, @Body() data: Record<string, unknown>) {
        return this.standards.validateIcsForm(formType, data);
    }

    @Get('ics/forms')
    @ApiOperation({ summary: '列出所有 ICS 表單' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    listIcsForms() {
        return this.standards.listIcsForms();
    }

    // === HXL Export ===

    @Post('hxl/missions')
    @ApiOperation({ summary: '匯出任務資料為 HXL 格式' })
    exportMissionsHxl(
        @Body(new ParseArrayPipe({ items: ExportMissionHxlItemDto, ...ARRAY_BODY_PIPE_OPTIONS }))
        missions: ExportMissionHxlItemDto[],
    ) {
        const dataset = this.standards.exportMissionsToHxl(missions);
        return this.standards.hxlToJson(dataset);
    }

    @Post('hxl/resources')
    @ApiOperation({ summary: '匯出資源資料為 HXL 格式' })
    exportResourcesHxl(
        @Body(new ParseArrayPipe({ items: ExportResourceHxlItemDto, ...ARRAY_BODY_PIPE_OPTIONS }))
        resources: ExportResourceHxlItemDto[],
    ) {
        const dataset = this.standards.exportResourcesToHxl(resources);
        return this.standards.hxlToJson(dataset);
    }

    @Post('hxl/3w')
    @ApiOperation({ summary: '匯出 3W 資料為 HXL 格式' })
    export3WHxl(
        @Body(new ParseArrayPipe({ items: Export3WHxlItemDto, ...ARRAY_BODY_PIPE_OPTIONS }))
        activities: Export3WHxlItemDto[],
    ) {
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
    add3WRecord(@Body() data: Add3WRecordDto) {
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
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    import3WData(
        @Body(new ParseArrayPipe({ items: Import3WItemDto, ...ARRAY_BODY_PIPE_OPTIONS }))
        data: Import3WItemDto[],
    ) {
        return { imported: this.standards.import3WData(data) };
    }

    // === Sphere Standards ===

    @Get('sphere/indicators')
    @ApiOperation({ summary: '取得所有 Sphere 指標' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getSphereIndicators() {
        return this.standards.getSphereIndicators();
    }

    @Get('sphere/indicators/:standard')
    @ApiOperation({ summary: '依標準取得 Sphere 指標' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
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
    quickSphereCheck(@Body() data: QuickSphereCheckDto) {
        return this.standards.quickSphereCheck(data);
    }
}
