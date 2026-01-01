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
import { TenantService, CreateTenantDto, TenantConfig } from './tenant.service';

@Controller('admin/tenants')
export class TenantController {
    constructor(private readonly tenantService: TenantService) { }

    // 取得所有租戶
    @Get()
    async getTenants() {
        const tenants = await this.tenantService.getTenants();
        return {
            success: true,
            data: tenants,
            count: tenants.length,
        };
    }

    // 取得單一租戶
    @Get(':id')
    async getTenant(@Param('id') id: string) {
        const tenant = await this.tenantService.getTenant(id);
        return {
            success: true,
            data: tenant,
        };
    }

    // 建立租戶
    @Post()
    async createTenant(@Body() dto: CreateTenantDto) {
        const tenant = await this.tenantService.createTenant(dto);
        return {
            success: true,
            message: '租戶建立成功',
            data: tenant,
        };
    }

    // 更新租戶
    @Patch(':id')
    async updateTenant(
        @Param('id') id: string,
        @Body() dto: Partial<CreateTenantDto>,
    ) {
        const tenant = await this.tenantService.updateTenant(id, dto);
        return {
            success: true,
            message: '租戶更新成功',
            data: tenant,
        };
    }

    // 更新租戶配置
    @Patch(':id/config')
    async updateConfig(
        @Param('id') id: string,
        @Body() config: Partial<TenantConfig>,
    ) {
        const tenant = await this.tenantService.updateTenantConfig(id, config);
        return {
            success: true,
            message: '配置更新成功',
            data: tenant,
        };
    }

    // 暫停租戶
    @Patch(':id/suspend')
    async suspendTenant(@Param('id') id: string) {
        const tenant = await this.tenantService.suspendTenant(id);
        return {
            success: true,
            message: '租戶已暫停',
            data: tenant,
        };
    }

    // 啟用租戶
    @Patch(':id/activate')
    async activateTenant(@Param('id') id: string) {
        const tenant = await this.tenantService.activateTenant(id);
        return {
            success: true,
            message: '租戶已啟用',
            data: tenant,
        };
    }

    // 取得租戶成員
    @Get(':id/members')
    async getMembers(@Param('id') id: string) {
        const members = await this.tenantService.getMembers(id);
        return {
            success: true,
            data: members,
            count: members.length,
        };
    }

    // 新增成員
    @Post(':id/members')
    async addMember(
        @Param('id') id: string,
        @Body() dto: { accountId: string; role?: 'owner' | 'admin' | 'member' | 'viewer' },
    ) {
        const member = await this.tenantService.addMember(id, dto.accountId, dto.role);
        return {
            success: true,
            message: '成員已新增',
            data: member,
        };
    }

    // 移除成員
    @Delete(':id/members/:accountId')
    async removeMember(
        @Param('id') id: string,
        @Param('accountId') accountId: string,
    ) {
        await this.tenantService.removeMember(id, accountId);
        return {
            success: true,
            message: '成員已移除',
        };
    }

    // 檢查配額
    @Get(':id/quota/:resource')
    async checkQuota(
        @Param('id') id: string,
        @Param('resource') resource: 'users' | 'reports' | 'volunteers',
    ) {
        const quota = await this.tenantService.checkQuota(id, resource);
        return {
            success: true,
            data: quota,
        };
    }

    // 統計
    @Get('stats/summary')
    async getStats() {
        const stats = await this.tenantService.getStats();
        return {
            success: true,
            data: stats,
        };
    }
}
