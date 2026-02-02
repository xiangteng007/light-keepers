import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StructuralAssessmentService } from './structural-assessment.service';
import { CreateStructuralAssessmentDto, UpdateAssessmentDto } from './dto/structural-assessment.dto';
import { SafetyLevel } from './entities/structural-assessment.entity';

@ApiTags('Structural Assessment')
@ApiBearerAuth()
@Controller('structural-assessment')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
export class StructuralAssessmentController {
    constructor(private service: StructuralAssessmentService) {}

    @Post()
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiOperation({ summary: 'Create structural assessment' })
    async create(
        @Body() dto: CreateStructuralAssessmentDto,
        @CurrentUser() user: any,
    ) {
        return this.service.create(dto, user.id);
    }

    @Get()
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    @ApiOperation({ summary: 'List all assessments' })
    @ApiQuery({ name: 'missionSessionId', required: false })
    async findAll(@Query('missionSessionId') missionSessionId?: string) {
        return this.service.findAll(missionSessionId);
    }

    @Get('statistics')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    @ApiOperation({ summary: 'Get assessment statistics' })
    @ApiQuery({ name: 'missionSessionId', required: false })
    async getStatistics(@Query('missionSessionId') missionSessionId?: string) {
        return this.service.getStatistics(missionSessionId);
    }

    @Get('by-safety/:level')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    @ApiOperation({ summary: 'Get assessments by safety level' })
    @ApiParam({ name: 'level', enum: SafetyLevel })
    async findBySafetyLevel(@Param('level') level: SafetyLevel) {
        return this.service.findBySafetyLevel(level);
    }

    @Get(':id')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    @ApiOperation({ summary: 'Get assessment by ID' })
    @ApiParam({ name: 'id', type: 'string' })
    async findById(@Param('id', ParseUUIDPipe) id: string) {
        return this.service.findById(id);
    }

    @Patch(':id')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiOperation({ summary: 'Update assessment' })
    @ApiParam({ name: 'id', type: 'string' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateAssessmentDto,
        @CurrentUser() user: any,
    ) {
        return this.service.update(id, dto, user.id);
    }

    @Patch(':id/rescued')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiOperation({ summary: 'Update rescued count' })
    @ApiParam({ name: 'id', type: 'string' })
    async updateRescued(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('rescued') rescued: number,
    ) {
        return this.service.updateRescueCount(id, rescued);
    }
}
