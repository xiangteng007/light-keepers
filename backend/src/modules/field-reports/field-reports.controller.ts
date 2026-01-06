import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Headers, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MinLevel } from '../auth/guards/roles.guard';
import { RoleLevel } from '../accounts/entities/role.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FieldReportsService } from './field-reports.service';
import { CreateFieldReportDto, UpdateFieldReportDto, FieldReportQueryDto } from './dto';

@ApiTags('Field Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mission-sessions/:missionSessionId/reports')
export class FieldReportsController {
    constructor(private readonly service: FieldReportsService) { }

    @Post()
    @MinLevel(RoleLevel.VOLUNTEER)
    @ApiOperation({ summary: 'Create a new field report' })
    async create(
        @Param('missionSessionId') missionSessionId: string,
        @Body() dto: CreateFieldReportDto,
        @CurrentUser() user: any,
    ) {
        return this.service.create(missionSessionId, dto, user);
    }

    @Get()
    @MinLevel(RoleLevel.VOLUNTEER)
    @ApiOperation({ summary: 'List field reports with filters' })
    async findAll(
        @Param('missionSessionId') missionSessionId: string,
        @Query() query: FieldReportQueryDto,
    ) {
        return this.service.findBySession(missionSessionId, query);
    }

    @Patch(':reportId')
    @MinLevel(RoleLevel.OFFICER)
    @ApiOperation({ summary: 'Update a field report (triage/status)' })
    @ApiHeader({ name: 'If-Match', description: 'Version for optimistic locking' })
    async update(
        @Param('reportId') reportId: string,
        @Body() dto: UpdateFieldReportDto,
        @Headers('If-Match') ifMatch: string,
        @CurrentUser() user: any,
    ) {
        const version = parseInt(ifMatch?.replace(/"/g, '') || '0', 10);
        return this.service.update(reportId, dto, version, user);
    }

    @Delete(':reportId')
    @MinLevel(RoleLevel.DIRECTOR)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Soft delete a field report' })
    async delete(
        @Param('reportId') reportId: string,
        @CurrentUser() user: any,
    ) {
        await this.service.softDelete(reportId, user);
    }
}
