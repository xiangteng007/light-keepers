import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Headers, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { RoleLevel } from '../accounts/entities/role.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FieldReportsService } from './field-reports.service';
import { CreateFieldReportDto, UpdateFieldReportDto, FieldReportQueryDto } from './dto';
import { JwtPayload } from '../shared/guards/core-jwt.guard';

@ApiTags('Field Reports')
@ApiBearerAuth()
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@Controller('mission-sessions/:missionSessionId/reports')
export class FieldReportsController {
    constructor(private readonly service: FieldReportsService) { }

    @Post()
    @RequiredLevel(RoleLevel.VOLUNTEER)
    @ApiOperation({ summary: 'Create a new field report' })
    async create(
        @Param('missionSessionId') missionSessionId: string,
        @Body() dto: CreateFieldReportDto,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.service.create(missionSessionId, dto, user);
    }

    @Get()
    @RequiredLevel(RoleLevel.VOLUNTEER)
    @ApiOperation({ summary: 'List field reports with filters' })
    async findAll(
        @Param('missionSessionId') missionSessionId: string,
        @Query() query: FieldReportQueryDto,
    ) {
        return this.service.findBySession(missionSessionId, query);
    }

    @Patch(':reportId')
    @RequiredLevel(RoleLevel.OFFICER)
    @ApiOperation({ summary: 'Update a field report (triage/status)' })
    @ApiHeader({ name: 'If-Match', description: 'Version for optimistic locking' })
    async update(
        @Param('reportId') reportId: string,
        @Body() dto: UpdateFieldReportDto,
        @Headers('If-Match') ifMatch: string,
        @CurrentUser() user: JwtPayload,
    ) {
        const version = parseInt(ifMatch?.replace(/"/g, '') || '0', 10);
        return this.service.update(reportId, dto, version, user);
    }

    @Delete(':reportId')
    @RequiredLevel(RoleLevel.DIRECTOR)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Soft delete a field report' })
    async delete(
        @Param('reportId') reportId: string,
        @CurrentUser() user: JwtPayload,
    ) {
        await this.service.softDelete(reportId, user);
    }
}
