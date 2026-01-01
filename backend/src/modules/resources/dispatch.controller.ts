import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DispatchService, CreateDispatchDto } from './dispatch.service';
import { DispatchOrder, DispatchStatus } from './dispatch-order.entity';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@Controller('dispatch')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OFFICER)
export class DispatchController {
    constructor(private readonly dispatchService: DispatchService) { }

    @Post()
    async create(@Body() dto: CreateDispatchDto): Promise<{ data: DispatchOrder }> {
        const order = await this.dispatchService.create(dto);
        return { data: order };
    }

    @Get()
    async findAll(@Query('status') status?: DispatchStatus): Promise<{ data: DispatchOrder[]; total: number }> {
        const orders = await this.dispatchService.findAll(status);
        return { data: orders, total: orders.length };
    }

    @Get('stats')
    async getStats(): Promise<{ data: { pending: number; inProgress: number; completed: number } }> {
        const stats = await this.dispatchService.getStats();
        return { data: stats };
    }

    @Get(':id')
    async findById(@Param('id') id: string): Promise<{ data: DispatchOrder }> {
        const order = await this.dispatchService.findById(id);
        return { data: order };
    }

    @Patch(':id/approve')
    async approve(
        @Param('id') id: string,
        @Body() body: { approverName: string; approverId?: string },
    ): Promise<{ data: DispatchOrder }> {
        const order = await this.dispatchService.approve(id, body.approverName, body.approverId);
        return { data: order };
    }

    @Patch(':id/reject')
    async reject(
        @Param('id') id: string,
        @Body() body: { reason: string; approverName: string },
    ): Promise<{ data: DispatchOrder }> {
        const order = await this.dispatchService.reject(id, body.reason, body.approverName);
        return { data: order };
    }

    @Patch(':id/start-picking')
    async startPicking(
        @Param('id') id: string,
        @Body() body: { pickerName: string; pickerId?: string },
    ): Promise<{ data: DispatchOrder }> {
        const order = await this.dispatchService.startPicking(id, body.pickerName, body.pickerId);
        return { data: order };
    }

    @Patch(':id/complete-picking')
    async completePicking(
        @Param('id') id: string,
        @Body() body: { pickedItems: any[]; operatorName: string },
    ): Promise<{ data: DispatchOrder }> {
        const order = await this.dispatchService.completePicking(id, body.pickedItems, body.operatorName);
        return { data: order };
    }

    @Patch(':id/complete')
    async complete(@Param('id') id: string): Promise<{ data: DispatchOrder }> {
        const order = await this.dispatchService.complete(id);
        return { data: order };
    }

    @Patch(':id/cancel')
    async cancel(
        @Param('id') id: string,
        @Body() body: { reason: string },
    ): Promise<{ data: DispatchOrder }> {
        const order = await this.dispatchService.cancel(id, body.reason);
        return { data: order };
    }
}
