import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    ParseUUIDPipe,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IntakeService } from './intake.service';
import { CreateIntakeDto, IntakeResponseDto } from './dto/intake.dto';
import { IntakeReport, IntakeReportStatus, IntakeReportType } from './entities/intake-report.entity';
import { Public, CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

// 定級理由：通報內容含通報人姓名電話、精確位置與受災描述，屬受災者個資。
// 建立通報維持 `@Public()`（設計上允許匿名通報，且已列入 public-surface.policy.json，本次不動）；
// 查詢類端點原本連 Guard 都沒有，原始碼註解卻寫「需要 L2+ 權限」——本次讓實作對齊註解，
// 全部查詢端點定為 L2（幹部），修正「任何登入者可列出全部災情通報個資」的缺口。
// 注意：Guard 只能掛在 handler 而不能掛 class——CoreJwtGuard 不認 `@Public()`（見 core-jwt.guard.ts），
// 一旦掛在 class 上會連匿名通報一起擋掉。
@ApiTags('Intake (統一通報入口)')
@Controller('intake')
export class IntakeController {
    constructor(private readonly intakeService: IntakeService) { }

    /**
     * 建立通報（統一入口）
     * 公開 API - 允許匿名通報
     */
    @Public()
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @Post()
    @ApiOperation({ summary: '建立通報（統一入口）' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: '通報建立成功',
        type: IntakeResponseDto,
    })
    async create(@Body() dto: CreateIntakeDto): Promise<IntakeResponseDto> {
        return this.intakeService.createIntake(dto);
    }

    /**
     * 取得所有通報
     * 需要 L2+ 權限
     */
    @Get()
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiOperation({ summary: '取得所有通報' })
    @ApiQuery({ name: 'status', required: false, enum: IntakeReportStatus })
    @ApiQuery({ name: 'sourceType', required: false, enum: IntakeReportType })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'offset', required: false, type: Number })
    async findAll(
        @Query('status') status?: IntakeReportStatus,
        @Query('sourceType') sourceType?: IntakeReportType,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
    ): Promise<IntakeReport[]> {
        return this.intakeService.findAll({ status, sourceType, limit, offset });
    }

    /**
     * 取得單一通報
     */
    @Get(':id')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiOperation({ summary: '取得單一通報' })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<IntakeReport> {
        return this.intakeService.findOne(id);
    }

    /**
     * 取得 Incident 關聯的所有通報
     */
    @Get('incident/:incidentId')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiOperation({ summary: '取得 Incident 關聯的所有通報' })
    async findByIncident(
        @Param('incidentId', ParseUUIDPipe) incidentId: string,
    ): Promise<IntakeReport[]> {
        return this.intakeService.findByIncident(incidentId);
    }
}
