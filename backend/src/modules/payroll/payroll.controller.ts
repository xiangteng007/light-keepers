import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PayrollService } from './payroll.service';

@ApiTags('薪資補助')
@Controller('payroll')
export class PayrollController {
    constructor(private readonly service: PayrollService) { }

    @Post('calculate-shift')
    @ApiOperation({ summary: '計算單次出勤補助' })
    @ApiResponse({ status: 200, description: '補助計算結果' })
    @ApiBearerAuth()
    calculateShiftPay(@Body() body: { date: string; startTime: string; endTime: string; hours: number; hazardous?: boolean }) {
        return this.service.calculateShiftPay({
            date: new Date(body.date),
            startTime: body.startTime,
            endTime: body.endTime,
            hours: body.hours,
            hazardous: body.hazardous,
        });
    }

    @Post('calculate-monthly/:volunteerId')
    @ApiOperation({ summary: '計算月度薪資' })
    @ApiResponse({ status: 200, description: '月度薪資明細' })
    @ApiBearerAuth()
    calculateMonthlyPayroll(
        @Param('volunteerId') volunteerId: string,
        @Body() body: { shifts: any[] }
    ) {
        return this.service.calculateMonthlyPayroll(volunteerId, body.shifts);
    }

    @Get('records/:volunteerId')
    @ApiOperation({ summary: '取得薪資記錄' })
    @ApiResponse({ status: 200, description: '薪資記錄列表' })
    @ApiBearerAuth()
    getPayrollRecords(@Param('volunteerId') volunteerId: string) {
        return this.service.getPayrollRecords(volunteerId);
    }

    @Put('status/:recordId')
    @ApiOperation({ summary: '更新薪資狀態' })
    @ApiResponse({ status: 200, description: '狀態已更新' })
    @ApiBearerAuth()
    updatePayrollStatus(
        @Param('recordId') recordId: string,
        @Body() body: { status: 'approved' | 'paid' | 'rejected'; note?: string }
    ) {
        return { success: this.service.updatePayrollStatus(recordId, body.status, body.note) };
    }

    @Get('rates')
    @ApiOperation({ summary: '取得費率' })
    @ApiResponse({ status: 200, description: '費率設定' })
    getRates() {
        return this.service.getRates();
    }

    @Put('rates')
    @ApiOperation({ summary: '更新費率' })
    @ApiResponse({ status: 200, description: '費率已更新' })
    @ApiBearerAuth()
    updateRates(@Body() body: any) {
        this.service.updateRates(body);
        return { success: true };
    }

    @Get('report')
    @ApiOperation({ summary: '產生薪資報表' })
    @ApiResponse({ status: 200, description: '薪資報表' })
    @ApiBearerAuth()
    generateReport(@Query('month') month: number, @Query('year') year: number) {
        return this.service.generateReport(+month, +year);
    }
}
