import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export type TenantStatus = 'active' | 'suspended' | 'pending';
export type TenantPlan = 'free' | 'basic' | 'pro' | 'enterprise';

// ===== 租戶實體 =====
@Entity('tenants')
export class Tenant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 租戶識別碼（唯一）
    @Column({ type: 'varchar', length: 50, unique: true })
    @Index()
    code: string;

    // 租戶名稱
    @Column({ type: 'varchar', length: 200 })
    name: string;

    // 組織類型
    @Column({ type: 'varchar', length: 50, nullable: true })
    organizationType?: string;

    // 聯絡人
    @Column({ type: 'varchar', length: 100, nullable: true })
    contactName?: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    contactEmail?: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    contactPhone?: string;

    // 狀態
    @Column({ type: 'varchar', length: 20, default: 'active' })
    status: TenantStatus;

    // 訂閱方案
    @Column({ type: 'varchar', length: 20, default: 'free' })
    plan: TenantPlan;

    // 配額限制
    @Column({ type: 'int', default: 10 })
    maxUsers: number;

    @Column({ type: 'int', default: 1000 })
    maxReports: number;

    @Column({ type: 'int', default: 100 })
    maxVolunteers: number;

    // 配置 JSON
    @Column({ type: 'jsonb', default: {} })
    config: Record<string, any>;

    // 自訂 Logo URL
    @Column({ type: 'varchar', length: 500, nullable: true })
    logoUrl?: string;

    // 主題色彩
    @Column({ type: 'varchar', length: 7, default: '#3b82f6' })
    primaryColor: string;

    // 過期日期
    @Column({ type: 'timestamp', nullable: true })
    expiresAt?: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

// ===== 租戶成員實體 =====
@Entity('tenant_members')
export class TenantMember {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    @Index()
    tenantId: string;

    @Column({ type: 'uuid' })
    @Index()
    accountId: string;

    // 在租戶內的角色
    @Column({ type: 'varchar', length: 50, default: 'member' })
    role: 'owner' | 'admin' | 'member' | 'viewer';

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'joined_at' })
    joinedAt: Date;
}
