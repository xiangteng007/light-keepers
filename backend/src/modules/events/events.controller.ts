import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto, EventQueryDto } from './dto/event.dto';

@ApiTags('事件管理')
@Controller('events')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@ApiBearerAuth()
export class EventsController {
    constructor(private readonly eventsService: EventsService) { }

    @Post()
    @ApiOperation({ summary: '創建事件' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    create(@Body() dto: CreateEventDto) {
        return this.eventsService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: '獲取事件列表' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    findAll(@Query() query: EventQueryDto) {
        return this.eventsService.findAll(query);
    }

    @Get('stats')
    @ApiOperation({ summary: '獲取統計資料' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    getStats() {
        return this.eventsService.getStats();
    }

    @Get(':id')
    @ApiOperation({ summary: '獲取單一事件' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    findOne(@Param('id') id: string) {
        return this.eventsService.findOne(id);
    }

    @Put(':id')
    @ApiOperation({ summary: '更新事件' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
        return this.eventsService.update(id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: '刪除事件' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    remove(@Param('id') id: string) {
        return this.eventsService.remove(id);
    }
}
