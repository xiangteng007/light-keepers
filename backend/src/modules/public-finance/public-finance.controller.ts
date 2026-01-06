import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PublicFinanceService } from './public-finance.service';

@ApiTags('Public Finance 公開財報')
@Controller('api/public/finance')
export class PublicFinanceController {
    constructor(private readonly financeService: PublicFinanceService) { }

    @Get('summary/:year')
    @ApiOperation({ summary: '年度財務摘要', description: '取得公開的年度財務摘要' })
    getSummary(@Param('year') year: number): any {
        return this.financeService.getPublicFinanceSummary(year);
    }

    @Get('expenditures/:year')
    @ApiOperation({ summary: '重大支出', description: '取得重大支出明細' })
    @ApiQuery({ name: 'minAmount', required: false, example: 100000 })
    getMajorExpenditures(@Param('year') year: number, @Query('minAmount') minAmount?: number): any {
        return this.financeService.getMajorExpenditures(year, minAmount);
    }

    @Get('project/:id')
    @ApiOperation({ summary: '專案財務報告', description: '取得特定專案的財務執行報告' })
    getProjectReport(@Param('id') id: string): any {
        return this.financeService.getProjectReport(id);
    }

    @Get('donor-acknowledgement')
    @ApiOperation({ summary: '捐款人感謝報告', description: '取得捐款人感謝與影響報告' })
    getDonorAcknowledgement(): any {
        const period = {
            from: new Date(new Date().getFullYear(), 0, 1),
            to: new Date(),
        };
        return this.financeService.getDonorAcknowledgement(period);
    }

    @Get('annual-report/:year')
    @ApiOperation({ summary: '年度報告資訊', description: '取得年度報告 PDF 下載資訊' })
    getAnnualReportInfo(@Param('year') year: number): any {
        return this.financeService.getAnnualReportInfo(year);
    }

    @Get('dashboard')
    @ApiOperation({ summary: '即時財務看板', description: '取得即時收支看板資料' })
    getDashboard(): any {
        return this.financeService.getLiveDashboardData();
    }
}
