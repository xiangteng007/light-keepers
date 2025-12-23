import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ResourcesService, CreateResourceDto } from './resources.service';
import { ResourceCategory } from './resources.entity';

@Controller('resources')
export class ResourcesController {
    constructor(private readonly resourcesService: ResourcesService) { }

    @Post()
    async create(@Body() dto: CreateResourceDto) {
        const resource = await this.resourcesService.create(dto);
        return { success: true, data: resource };
    }

    @Get()
    async findAll(@Query('category') category?: ResourceCategory) {
        const resources = await this.resourcesService.findAll(category);
        return { success: true, data: resources, count: resources.length };
    }

    @Get('stats')
    async getStats() {
        const stats = await this.resourcesService.getStats();
        return { success: true, data: stats };
    }

    @Get('low-stock')
    async getLowStock() {
        const resources = await this.resourcesService.getLowStock();
        return { success: true, data: resources, count: resources.length };
    }

    @Get('expiring')
    async getExpiring(@Query('days') days?: string) {
        const resources = await this.resourcesService.getExpiringSoon(Number(days) || 30);
        return { success: true, data: resources, count: resources.length };
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const resource = await this.resourcesService.findOne(id);
        return { success: true, data: resource };
    }

    @Patch(':id/add')
    async addStock(@Param('id') id: string, @Body('amount') amount: number) {
        const resource = await this.resourcesService.addStock(id, amount);
        return { success: true, message: `已入庫 ${amount} ${resource.unit}`, data: resource };
    }

    @Patch(':id/deduct')
    async deductStock(@Param('id') id: string, @Body('amount') amount: number) {
        const resource = await this.resourcesService.deductStock(id, amount);
        return { success: true, message: `已出庫 ${amount} ${resource.unit}`, data: resource };
    }
}
