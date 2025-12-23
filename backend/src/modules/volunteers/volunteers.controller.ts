import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
} from '@nestjs/common';
import { VolunteersService, CreateVolunteerDto, UpdateVolunteerDto, VolunteerFilter } from './volunteers.service';
import { VolunteerStatus } from './volunteers.entity';

@Controller('volunteers')
export class VolunteersController {
    constructor(private readonly volunteersService: VolunteersService) { }

    // 志工註冊
    @Post()
    async create(@Body() dto: CreateVolunteerDto) {
        const volunteer = await this.volunteersService.create(dto);
        return {
            success: true,
            message: '志工註冊成功',
            data: volunteer,
        };
    }

    // 取得所有志工
    @Get()
    async findAll(
        @Query('status') status?: VolunteerStatus,
        @Query('region') region?: string,
        @Query('skill') skill?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const filter: VolunteerFilter = {
            status,
            region,
            skill,
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        };

        const volunteers = await this.volunteersService.findAll(filter);
        return {
            success: true,
            data: volunteers,
            count: volunteers.length,
        };
    }

    // 取得可用志工
    @Get('available')
    async findAvailable(
        @Query('region') region?: string,
        @Query('skill') skill?: string,
    ) {
        const volunteers = await this.volunteersService.findAvailable(region, skill);
        return {
            success: true,
            data: volunteers,
            count: volunteers.length,
        };
    }

    // 取得統計
    @Get('stats')
    async getStats() {
        const stats = await this.volunteersService.getStats();
        return {
            success: true,
            data: stats,
        };
    }

    // 取得單一志工
    @Get(':id')
    async findOne(@Param('id') id: string) {
        const volunteer = await this.volunteersService.findOne(id);
        return {
            success: true,
            data: volunteer,
        };
    }

    // 更新志工資料
    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateVolunteerDto,
    ) {
        const volunteer = await this.volunteersService.update(id, dto);
        return {
            success: true,
            message: '更新成功',
            data: volunteer,
        };
    }

    // 更新可用狀態
    @Patch(':id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body('status') status: VolunteerStatus,
    ) {
        const volunteer = await this.volunteersService.updateStatus(id, status);
        return {
            success: true,
            message: `狀態已更新為 ${status}`,
            data: volunteer,
        };
    }

    // 刪除志工
    @Delete(':id')
    async delete(@Param('id') id: string) {
        await this.volunteersService.delete(id);
        return {
            success: true,
            message: '志工已刪除',
        };
    }
}
