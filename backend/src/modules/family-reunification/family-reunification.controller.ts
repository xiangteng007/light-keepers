import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FamilyReunificationService } from './family-reunification.service';

@ApiTags('Family Reunification')
@ApiBearerAuth()
@Controller('reunification')
export class FamilyReunificationController {
    constructor(private readonly service: FamilyReunificationService) { }

    @Post('persons')
    @ApiOperation({ summary: '登記失蹤/尋人' })
    reportMissingPerson(@Body() dto: any) {
        return this.service.reportMissingPerson(dto);
    }

    @Get('persons/search')
    @ApiOperation({ summary: '搜尋' })
    searchPersons(
        @Query('name') name?: string,
        @Query('status') status?: string,
        @Query('disasterEventId') disasterEventId?: string,
        @Query('shelterId') shelterId?: string
    ) {
        return this.service.searchPersons({ name, status, disasterEventId, shelterId });
    }

    @Get('persons/:id')
    @ApiOperation({ summary: '取得人員資料' })
    getPerson(@Param('id') id: string) {
        return this.service.getPerson(id);
    }

    @Put('persons/:id')
    @ApiOperation({ summary: '更新人員資料' })
    updatePerson(@Param('id') id: string, @Body() dto: any) {
        return this.service.updatePerson(id, dto);
    }

    @Post('persons/:id/found')
    @ApiOperation({ summary: '標記為已找到' })
    markAsFound(@Param('id') id: string, @Body() dto: { location: string }) {
        return this.service.markAsFound(id, dto.location);
    }

    @Get('persons/:id/matches')
    @ApiOperation({ summary: '取得配對結果' })
    getMatches(@Param('id') id: string) {
        return this.service.getMatches(id);
    }

    @Post('matches/verify')
    @ApiOperation({ summary: '驗證配對' })
    verifyMatch(@Body() dto: { sourceId: string; matchedId: string; status: 'confirmed' | 'rejected'; userId: string }) {
        return this.service.verifyMatch(dto.sourceId, dto.matchedId, dto.status, dto.userId);
    }

    @Get('cases')
    @ApiOperation({ summary: '取得所有案例' })
    getAllCases(@Query('status') status?: string) {
        return this.service.getAllCases(status);
    }

    @Get('cases/:id')
    @ApiOperation({ summary: '取得案例' })
    getCase(@Param('id') id: string) {
        return this.service.getCase(id);
    }

    @Get('persons/:personId/cases')
    @ApiOperation({ summary: '人員相關案例' })
    getCasesByPerson(@Param('personId') personId: string) {
        return this.service.getCasesByPerson(personId);
    }

    @Post('cases/:id/confirm')
    @ApiOperation({ summary: '確認配對' })
    confirmMatch(@Param('id') id: string) {
        return this.service.confirmMatch(id);
    }

    @Post('cases/:id/start')
    @ApiOperation({ summary: '開始團聚' })
    startReunification(@Param('id') id: string, @Body() dto: { location: string }) {
        return this.service.startReunification(id, dto.location);
    }

    @Post('cases/:id/complete')
    @ApiOperation({ summary: '完成團聚' })
    completeReunification(@Param('id') id: string, @Body() dto?: { notes?: string }) {
        return this.service.completeReunification(id, dto?.notes);
    }

    @Post('cases/:id/notes')
    @ApiOperation({ summary: '新增備註' })
    addCaseNote(@Param('id') id: string, @Body() dto: { note: string }) {
        return this.service.addCaseNote(id, dto.note);
    }

    @Post('cases/:id/notify')
    @ApiOperation({ summary: '通知家屬' })
    notifyFamily(@Param('id') id: string, @Body() dto: { message: string }) {
        return this.service.notifyFamily(id, dto.message);
    }

    @Post('shelter-reports')
    @ApiOperation({ summary: '收容所通報' })
    reportFromShelter(@Body() dto: any) {
        return this.service.reportFromShelter(dto);
    }

    @Get('shelter-reports/:shelterId')
    @ApiOperation({ summary: '收容所人員列表' })
    getShelterReports(@Param('shelterId') shelterId: string) {
        return this.service.getShelterReports(shelterId);
    }

    @Get('stats')
    @ApiOperation({ summary: '統計' })
    getStats() {
        return this.service.getStats();
    }
}
