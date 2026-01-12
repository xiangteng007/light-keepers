import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    ParseUUIDPipe,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { IntakeService } from './intake.service';
import { CreateIntakeDto, IntakeResponseDto } from './dto/intake.dto';
import { IntakeReport, IntakeReportStatus, IntakeReportType } from './entities/intake-report.entity';
import { Public } from '../shared/guards';

@ApiTags('Intake (統一通報入口)')
@Controller('intake')
export class IntakeController {
    constructor(private readonly intakeService: IntakeService) { }

    /**
     * 建立通報（統一入口）
     * 公開 API - 允許匿名通報
     */
    @Post()
    @Public()
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
    @ApiOperation({ summary: '取得單一通報' })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<IntakeReport> {
        return this.intakeService.findOne(id);
    }

    /**
     * 取得 Incident 關聯的所有通報
     */
    @Get('incident/:incidentId')
    @ApiOperation({ summary: '取得 Incident 關聯的所有通報' })
    async findByIncident(
        @Param('incidentId', ParseUUIDPipe) incidentId: string,
    ): Promise<IntakeReport[]> {
        return this.intakeService.findByIncident(incidentId);
    }
}
