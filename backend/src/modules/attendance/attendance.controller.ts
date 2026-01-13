import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CoreJwtGuard } from '../shared/guards/core-jwt.guard';
import { UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards/unified-roles.guard';

@ApiTags('出勤管理')
@Controller('attendance')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@ApiBearerAuth()
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) { }

    @Post('check-in/gps')
    @ApiOperation({ summary: 'GPS 簽到' })
    @ApiResponse({ status: 201, description: '簽到成功' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    checkInWithGps(
        @Body() body: { volunteerId: string; lat: number; lng: number; accuracy?: number }
    ) {
        return this.attendanceService.checkInWithGps(body.volunteerId, {
            lat: body.lat,
            lng: body.lng,
            accuracy: body.accuracy,
        });
    }

    @Post('check-in/qr')
    @ApiOperation({ summary: 'QR Code 簽到' })
    @ApiResponse({ status: 201, description: '簽到成功' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    checkInWithQr(@Body() body: { volunteerId: string; qrCode: string }) {
        return this.attendanceService.checkInWithQr(body.volunteerId, body.qrCode);
    }

    @Put('check-out/:recordId')
    @ApiOperation({ summary: '簽退' })
    @ApiResponse({ status: 200, description: '簽退成功' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    checkOut(
        @Param('recordId') recordId: string,
        @Body() body?: { lat?: number; lng?: number }
    ) {
        const location = body?.lat && body?.lng ? { lat: body.lat, lng: body.lng } : undefined;
        return this.attendanceService.checkOut(recordId, location);
    }

    @Get('volunteer/:volunteerId')
    @ApiOperation({ summary: '取得志工出勤記錄' })
    @ApiResponse({ status: 200, description: '出勤記錄列表' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getVolunteerRecords(
        @Param('volunteerId') volunteerId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;
        return this.attendanceService.getVolunteerRecords(volunteerId, start, end);
    }

    @Get('daily-summary')
    @ApiOperation({ summary: '取得每日統計' })
    @ApiResponse({ status: 200, description: '每日統計資料' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    getDailySummary(@Query('date') date: string) {
        return this.attendanceService.getDailySummary(new Date(date));
    }

    @Get('monthly-report/:volunteerId')
    @ApiOperation({ summary: '取得月度報表' })
    @ApiResponse({ status: 200, description: '月度報表資料' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    getMonthlyReport(
        @Param('volunteerId') volunteerId: string,
        @Query('month') month: number,
        @Query('year') year: number
    ) {
        return this.attendanceService.getMonthlyReport(volunteerId, +month, +year);
    }

    @Get('generate-qr')
    @ApiOperation({ summary: '產生 QR Code' })
    @ApiResponse({ status: 200, description: 'QR Code 資訊' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    generateQrCode(@Query('locationId') locationId: string, @Query('locationName') locationName: string) {
        return this.attendanceService.generateQrCode(locationId, locationName);
    }
}
