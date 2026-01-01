import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantMember, TenantStatus, TenantPlan } from './tenant.entity';

export interface CreateTenantDto {
    code: string;
    name: string;
    organizationType?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    plan?: TenantPlan;
}

export interface TenantConfig {
    features?: {
        enableReports?: boolean;
        enableVolunteers?: boolean;
        enableResources?: boolean;
        enableEvents?: boolean;
        enableCommunity?: boolean;
    };
    branding?: {
        logoUrl?: string;
        primaryColor?: string;
        appName?: string;
    };
    notifications?: {
        emailEnabled?: boolean;
        lineEnabled?: boolean;
    };
}

@Injectable()
export class TenantService {
    private readonly logger = new Logger(TenantService.name);

    constructor(
        @InjectRepository(Tenant)
        private readonly tenantRepo: Repository<Tenant>,
        @InjectRepository(TenantMember)
        private readonly memberRepo: Repository<TenantMember>,
    ) { }

    // ===== 租戶 CRUD =====

    async createTenant(dto: CreateTenantDto): Promise<Tenant> {
        // 檢查 code 是否已存在
        const existing = await this.tenantRepo.findOne({ where: { code: dto.code } });
        if (existing) {
            throw new BadRequestException(`Tenant code '${dto.code}' already exists`);
        }

        const tenant = this.tenantRepo.create({
            ...dto,
            status: 'active',
            config: this.getDefaultConfig(dto.plan || 'free'),
        });

        const saved = await this.tenantRepo.save(tenant);
        this.logger.log(`Tenant created: ${saved.code} (${saved.name})`);
        return saved;
    }

    async getTenants(): Promise<Tenant[]> {
        return this.tenantRepo.find({
            order: { createdAt: 'DESC' },
        });
    }

    async getTenant(id: string): Promise<Tenant> {
        const tenant = await this.tenantRepo.findOne({ where: { id } });
        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }
        return tenant;
    }

    async getTenantByCode(code: string): Promise<Tenant | null> {
        return this.tenantRepo.findOne({ where: { code } });
    }

    async updateTenant(id: string, dto: Partial<CreateTenantDto>): Promise<Tenant> {
        const tenant = await this.getTenant(id);
        Object.assign(tenant, dto);
        return this.tenantRepo.save(tenant);
    }

    async updateTenantConfig(id: string, config: Partial<TenantConfig>): Promise<Tenant> {
        const tenant = await this.getTenant(id);
        tenant.config = { ...tenant.config, ...config };
        return this.tenantRepo.save(tenant);
    }

    async suspendTenant(id: string): Promise<Tenant> {
        const tenant = await this.getTenant(id);
        tenant.status = 'suspended';
        return this.tenantRepo.save(tenant);
    }

    async activateTenant(id: string): Promise<Tenant> {
        const tenant = await this.getTenant(id);
        tenant.status = 'active';
        return this.tenantRepo.save(tenant);
    }

    // ===== 成員管理 =====

    async addMember(tenantId: string, accountId: string, role: 'owner' | 'admin' | 'member' | 'viewer' = 'member'): Promise<TenantMember> {
        // 檢查是否已是成員
        const existing = await this.memberRepo.findOne({
            where: { tenantId, accountId },
        });

        if (existing) {
            // 更新角色
            existing.role = role;
            existing.isActive = true;
            return this.memberRepo.save(existing);
        }

        const member = this.memberRepo.create({
            tenantId,
            accountId,
            role,
            isActive: true,
        });

        return this.memberRepo.save(member);
    }

    async removeMember(tenantId: string, accountId: string): Promise<void> {
        const member = await this.memberRepo.findOne({
            where: { tenantId, accountId },
        });

        if (member) {
            member.isActive = false;
            await this.memberRepo.save(member);
        }
    }

    async getMembers(tenantId: string): Promise<TenantMember[]> {
        return this.memberRepo.find({
            where: { tenantId, isActive: true },
            order: { joinedAt: 'ASC' },
        });
    }

    async getUserTenants(accountId: string): Promise<TenantMember[]> {
        return this.memberRepo.find({
            where: { accountId, isActive: true },
        });
    }

    // ===== 配額檢查 =====

    async checkQuota(tenantId: string, resource: 'users' | 'reports' | 'volunteers'): Promise<{
        current: number;
        max: number;
        available: boolean;
    }> {
        const tenant = await this.getTenant(tenantId);

        // 這裡簡化實作，實際應該查詢各資源的實際數量
        let current = 0;
        let max = 0;

        switch (resource) {
            case 'users':
                current = await this.memberRepo.count({ where: { tenantId, isActive: true } });
                max = tenant.maxUsers;
                break;
            case 'reports':
                max = tenant.maxReports;
                break;
            case 'volunteers':
                max = tenant.maxVolunteers;
                break;
        }

        return {
            current,
            max,
            available: current < max,
        };
    }

    // ===== 統計 =====

    async getStats(): Promise<{
        total: number;
        active: number;
        suspended: number;
        byPlan: Record<string, number>;
    }> {
        const [total, active, suspended] = await Promise.all([
            this.tenantRepo.count(),
            this.tenantRepo.count({ where: { status: 'active' } }),
            this.tenantRepo.count({ where: { status: 'suspended' } }),
        ]);

        const byPlanRaw = await this.tenantRepo
            .createQueryBuilder('t')
            .select('t.plan', 'plan')
            .addSelect('COUNT(*)', 'count')
            .groupBy('t.plan')
            .getRawMany();

        const byPlan: Record<string, number> = {};
        for (const r of byPlanRaw) {
            byPlan[r.plan] = parseInt(r.count, 10);
        }

        return { total, active, suspended, byPlan };
    }

    // ===== 輔助方法 =====

    private getDefaultConfig(plan: TenantPlan): TenantConfig {
        const baseConfig: TenantConfig = {
            features: {
                enableReports: true,
                enableVolunteers: true,
                enableResources: true,
                enableEvents: true,
                enableCommunity: true,
            },
            notifications: {
                emailEnabled: true,
                lineEnabled: false,
            },
        };

        switch (plan) {
            case 'enterprise':
                baseConfig.notifications!.lineEnabled = true;
                break;
            case 'pro':
                baseConfig.notifications!.lineEnabled = true;
                break;
            case 'basic':
                break;
            case 'free':
            default:
                baseConfig.features!.enableCommunity = false;
                break;
        }

        return baseConfig;
    }
}
