/**
 * Humanitarian Standards Controller
 * 
 * REST API for international humanitarian data standards
 */
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HxlExportService, HxlExportOptions } from './services/hxl-export.service';
import { IatiReportingService } from './services/iati-reporting.service';
import { ThreeWMatrixService } from './services/three-w-matrix.service';
import { SphereStandardsService, SphereStandardCategory } from './services/sphere-standards.service';

@ApiTags('Humanitarian Standards')
@Controller('api/v1/humanitarian-standards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HumanitarianStandardsController {
    constructor(
        private readonly hxlExport: HxlExportService,
        private readonly iatiReporting: IatiReportingService,
        private readonly threeWMatrix: ThreeWMatrixService,
        private readonly sphereStandards: SphereStandardsService,
    ) { }

    // ========== HXL Endpoints ==========

    @Get('hxl/tags')
    @ApiOperation({ summary: 'Get available HXL tags' })
    getHxlTags() {
        return this.hxlExport.getHxlTags();
    }

    @Post('hxl/export/reports')
    @ApiOperation({ summary: 'Export reports in HXL format' })
    async exportReportsHxl(
        @Body() data: { reports: any[]; options?: HxlExportOptions }
    ) {
        const result = await this.hxlExport.exportDisasterReports(
            data.reports,
            data.options
        );
        return { data: result, format: data.options?.format || 'csv' };
    }

    @Post('hxl/export/resources')
    @ApiOperation({ summary: 'Export resource distribution in HXL format' })
    async exportResourcesHxl(
        @Body() data: { distributions: any[]; options?: HxlExportOptions }
    ) {
        const result = await this.hxlExport.exportResourceDistribution(
            data.distributions,
            data.options
        );
        return { data: result, format: data.options?.format || 'csv' };
    }

    // ========== IATI Endpoints ==========

    @Post('iati/generate')
    @ApiOperation({ summary: 'Generate IATI XML for a mission' })
    async generateIatiXml(@Body() mission: any) {
        const xml = await this.iatiReporting.generateIatiXml(mission);
        return { xml, version: '2.03' };
    }

    // ========== 3W Matrix Endpoints ==========

    @Post('3w/generate')
    @ApiOperation({ summary: 'Generate 3W Matrix from missions' })
    async generateThreeWMatrix(
        @Body() data: { 
            missions: any[]; 
            period: { start: string; end: string } 
        }
    ) {
        const matrix = await this.threeWMatrix.generateMatrix(
            data.missions,
            { start: new Date(data.period.start), end: new Date(data.period.end) }
        );
        return matrix;
    }

    @Post('3w/export/csv')
    @ApiOperation({ summary: 'Export 3W Matrix as CSV' })
    async exportThreeWCsv(
        @Body() data: { 
            missions: any[]; 
            period: { start: string; end: string } 
        }
    ) {
        const matrix = await this.threeWMatrix.generateMatrix(
            data.missions,
            { start: new Date(data.period.start), end: new Date(data.period.end) }
        );
        const csv = this.threeWMatrix.exportToCsv(matrix);
        return { data: csv, format: 'csv' };
    }

    // ========== Sphere Standards Endpoints ==========

    @Get('sphere/standards')
    @ApiOperation({ summary: 'Get Sphere standards reference' })
    getSphereStandards() {
        return this.sphereStandards.getStandardsReference();
    }

    @Post('sphere/assess')
    @ApiOperation({ summary: 'Assess Sphere compliance for a facility' })
    async assessSphereCompliance(
        @Body() data: { 
            facilityData: any; 
            category: SphereStandardCategory;
        }
    ) {
        const assessments = await this.sphereStandards.assessCompliance(
            data.facilityData,
            data.category
        );
        return { category: data.category, assessments };
    }

    @Post('sphere/report')
    @ApiOperation({ summary: 'Generate full Sphere compliance report' })
    async generateSphereReport(
        @Body() data: { facilityData: any; assessor: string }
    ) {
        return this.sphereStandards.generateReport(
            data.facilityData,
            data.assessor
        );
    }
}
