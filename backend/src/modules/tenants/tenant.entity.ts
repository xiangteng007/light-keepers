/**
 * Tenant Entities —— 組織資料（Organization Profile）
 *
 * 【定位（2026-08-01, D9 / DA-2 單租戶降級後）】
 * 平台為單租戶。`tenants` 表在正式環境僅有**一筆**紀錄（協會自身），
 * `tenant_members` 為該組織的成員名冊。
 * 這些資料表**不**構成資料隔離邊界，詳見 docs/adr/ADR-001-multi-tenant-isolation.md（Superseded）。
 *
 * 表名／欄位名為歷史命名，刻意保留以避免 schema migration 與 API breaking change。
 */

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

// ===== 組織成員實體（歷史命名：租戶成員）=====
@Entity('tenant_members')
export class TenantMember {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /**
     * 所屬組織 ID。
     * 【單租戶模式（D9, 2026-08-01）】恆為唯一組織（協會自身）的 ID，
     * 即實務上為單一固定值。欄位保留不移除，供未來若回遷多租戶時使用。
     * @see docs/adr/ADR-001-multi-tenant-isolation.md（Superseded）
     */
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
