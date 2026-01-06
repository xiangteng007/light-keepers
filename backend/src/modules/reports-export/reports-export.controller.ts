import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ReportsExportService } from './reports-export.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@Controller('reports-export')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OFFICER)
export class ReportsExportController {
    constructor(private readonly exportService: ReportsExportService) { }

    // 志工時數報表
    @Get('volunteer-hours')
    async getVolunteerHours(
        @Query('start') start: string,
        @Query('end') end: string,
    ) {
        const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = end ? new Date(end) : new Date();

        const report = await this.exportService.getVolunteerHoursReport(startDate, endDate);
        return { success: true, data: report };
    }

    // 志工時數報表 CSV 下載
    @Get('volunteer-hours/csv')
    async downloadVolunteerHoursCSV(
        @Query('start') start: string,
        @Query('end') end: string,
        @Res() res: Response,
    ) {
        const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = end ? new Date(end) : new Date();

        const report = await this.exportService.getVolunteerHoursReport(startDate, endDate);
        const csv = this.exportService.generateCSV(report);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=volunteer-hours.csv');
        res.send('\uFEFF' + csv); // BOM for Excel
    }

    // 災情統計報表
    @Get('disaster-stats')
    async getDisasterStats(
        @Query('start') start: string,
        @Query('end') end: string,
    ) {
        const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = end ? new Date(end) : new Date();

        const report = await this.exportService.getDisasterReport(startDate, endDate);
        return { success: true, data: report };
    }

    // 災情統計報表 JSON 下載
    @Get('disaster-stats/json')
    async downloadDisasterJSON(
        @Query('start') start: string,
        @Query('end') end: string,
        @Res() res: Response,
    ) {
        const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = end ? new Date(end) : new Date();

        const report = await this.exportService.getDisasterReport(startDate, endDate);
        const json = this.exportService.generateJSON(report);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=disaster-stats.json');
        res.send(json);
    }

    // ==================== 庫存報表 ====================

    // 庫存報表 (當前庫存快照)
    @Get('inventory')
    async getInventory() {
        const report = await this.exportService.getInventoryReport();
        return { success: true, data: report };
    }

    // 庫存報表 CSV 下載
    @Get('inventory/csv')
    async downloadInventoryCSV(@Res() res: Response) {
        const report = await this.exportService.getInventoryReport();
        const csv = this.exportService.generateCSV(report);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=inventory.csv');
        res.send('\uFEFF' + csv); // BOM for Excel
    }

    // 庫存報表 JSON 下載
    @Get('inventory/json')
    async downloadInventoryJSON(@Res() res: Response) {
        const report = await this.exportService.getInventoryReport();
        const json = this.exportService.generateJSON(report);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=inventory.json');
        res.send(json);
    }

    // 庫存異動報表
    @Get('inventory-transactions')
    async getInventoryTransactions(
        @Query('start') start: string,
        @Query('end') end: string,
    ) {
        const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = end ? new Date(end) : new Date();

        const report = await this.exportService.getInventoryTransactionReport(startDate, endDate);
        return { success: true, data: report };
    }

    // 庫存異動報表 CSV 下載
    @Get('inventory-transactions/csv')
    async downloadInventoryTransactionsCSV(
        @Query('start') start: string,
        @Query('end') end: string,
        @Res() res: Response,
    ) {
        const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = end ? new Date(end) : new Date();

        const report = await this.exportService.getInventoryTransactionReport(startDate, endDate);
        const csv = this.exportService.generateCSV(report);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=inventory-transactions.csv');
        res.send('\uFEFF' + csv);
    }

    // ==================== 現場回報 (Emergency Response) ====================

    // 現場回報報表
    @Get('field-reports')
    async getFieldReports(
        @Query('missionSessionId') missionSessionId: string,
        @Query('start') start?: string,
        @Query('end') end?: string,
    ) {
        const startDate = start ? new Date(start) : undefined;
        const endDate = end ? new Date(end) : undefined;
        const report = await this.exportService.getFieldReportsExport(missionSessionId, startDate, endDate);
        return { success: true, data: report };
    }

    // 現場回報 CSV 下載
    @Get('field-reports/csv')
    async downloadFieldReportsCSV(
        @Query('missionSessionId') missionSessionId: string,
        @Query('start') start: string,
        @Query('end') end: string,
        @Res() res: Response,
    ) {
        const startDate = start ? new Date(start) : undefined;
        const endDate = end ? new Date(end) : undefined;
        const report = await this.exportService.getFieldReportsExport(missionSessionId, startDate, endDate);
        const csv = this.exportService.generateCSV(report);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=field-reports.csv');
        res.send('\uFEFF' + csv);
    }

    // SOS 信號報表
    @Get('sos-signals')
    async getSosSignals(
        @Query('missionSessionId') missionSessionId: string,
        @Query('start') start?: string,
        @Query('end') end?: string,
    ) {
        const startDate = start ? new Date(start) : undefined;
        const endDate = end ? new Date(end) : undefined;
        const report = await this.exportService.getSosExport(missionSessionId, startDate, endDate);
        return { success: true, data: report };
    }

    // SOS 信號 CSV 下載
    @Get('sos-signals/csv')
    async downloadSosCSV(
        @Query('missionSessionId') missionSessionId: string,
        @Query('start') start: string,
        @Query('end') end: string,
        @Res() res: Response,
    ) {
        const startDate = start ? new Date(start) : undefined;
        const endDate = end ? new Date(end) : undefined;
        const report = await this.exportService.getSosExport(missionSessionId, startDate, endDate);
        const csv = this.exportService.generateCSV(report);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=sos-signals.csv');
        res.send('\uFEFF' + csv);
    }

    // 任務統計摘要
    @Get('mission-summary')
    async getMissionSummary(@Query('missionSessionId') missionSessionId: string) {
        const report = await this.exportService.getMissionSummary(missionSessionId);
        return { success: true, data: report };
    }

    // 任務統計摘要 JSON 下載
    @Get('mission-summary/json')
    async downloadMissionSummaryJSON(
        @Query('missionSessionId') missionSessionId: string,
        @Res() res: Response,
    ) {
        const report = await this.exportService.getMissionSummary(missionSessionId);
        const json = this.exportService.generateJSON(report);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=mission-summary.json');
        res.send(json);
    }
}
