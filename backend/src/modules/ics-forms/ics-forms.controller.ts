import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    ParseUUIDPipe,
    UseGuards,
    Request,
    Logger,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiResponse,
    ApiParam,
} from '@nestjs/swagger';
import { IcsFormsService } from './ics-forms.service';
import { CreateIcsFormDto, UpdateIcsFormDto, ApproveIcsFormDto, QueryIcsFormsDto } from './dto/ics-form.dto';
import { IcsForm, IcsFormType } from './entities/ics-form.entity';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@ApiTags('ICS Forms')
@ApiBearerAuth()
@Controller('ics-forms')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
export class IcsFormsController {
    private readonly logger = new Logger(IcsFormsController.name);

    constructor(private readonly icsFormsService: IcsFormsService) {}

    /**
     * Get all ICS forms with optional filters
     */
    @Get()
    @ApiOperation({ summary: 'Get all ICS forms' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async findAll(@Query() query: QueryIcsFormsDto): Promise<{ data: IcsForm[]; total: number }> {
        return this.icsFormsService.findAll(query);
    }

    /**
     * Get available form types
     */
    @Get('types')
    @ApiOperation({ summary: 'Get available ICS form types' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getFormTypes(): Array<{ type: IcsFormType; description: string }> {
        return Object.values(IcsFormType).map((type) => ({
            type,
            description: this.icsFormsService.getFormTypeDescription(type),
        }));
    }

    /**
     * Get a single ICS form by ID
     */
    @Get(':id')
    @ApiOperation({ summary: 'Get ICS form by ID' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<IcsForm> {
        return this.icsFormsService.findOne(id);
    }

    /**
     * Export ICS form to JSON
     */
    @Get(':id/export')
    @ApiOperation({ summary: 'Export ICS form to JSON format' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async exportToJson(@Param('id', ParseUUIDPipe) id: string): Promise<object> {
        return this.icsFormsService.exportToJson(id);
    }

    /**
     * Create a new ICS form
     */
    @Post()
    @ApiOperation({ summary: 'Create a new ICS form' })
    @ApiResponse({ status: 201, description: 'Form created successfully' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async create(@Body() dto: CreateIcsFormDto, @Request() req: any): Promise<IcsForm> {
        const userId = req.user?.sub || req.user?.id;
        const userName = req.user?.name || req.user?.email || 'Unknown';
        return this.icsFormsService.create(dto, userId, userName);
    }

    /**
     * Update an ICS form
     */
    @Put(':id')
    @ApiOperation({ summary: 'Update an ICS form' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateIcsFormDto,
    ): Promise<IcsForm> {
        return this.icsFormsService.update(id, dto);
    }

    /**
     * Approve an ICS form
     */
    @Post(':id/approve')
    @ApiOperation({ summary: 'Approve an ICS form' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    async approve(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ApproveIcsFormDto,
        @Request() req: any,
    ): Promise<IcsForm> {
        const userId = req.user?.sub || req.user?.id;
        const userName = req.user?.name || req.user?.email || 'Unknown';
        return this.icsFormsService.approve(id, userId, userName, dto.comments);
    }

    /**
     * Create a new version of an ICS form
     */
    @Post(':id/new-version')
    @ApiOperation({ summary: 'Create a new version of an ICS form' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async createNewVersion(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: any,
    ): Promise<IcsForm> {
        const userId = req.user?.sub || req.user?.id;
        const userName = req.user?.name || req.user?.email || 'Unknown';
        return this.icsFormsService.createNewVersion(id, userId, userName);
    }

    /**
     * Delete a draft ICS form
     */
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a draft ICS form' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
        await this.icsFormsService.remove(id);
        return { message: 'Form deleted successfully' };
    }
}
