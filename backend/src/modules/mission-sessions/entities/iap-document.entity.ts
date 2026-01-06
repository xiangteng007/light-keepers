/**
 * IAP 文件實體 (Incident Action Plan Document Entity)
 * ICS 標準表單集合：目標、任務分解、通訊計畫、醫療計畫、資源清單、風險評估、地圖附錄
 */

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { OperationalPeriod } from './operational-period.entity';

export enum IAPDocumentType {
    OBJECTIVES = 'objectives',        // ICS 202 - 事件目標
    ORGANIZATION = 'organization',    // ICS 203 - 組織分配
    ASSIGNMENTS = 'assignments',      // ICS 204 - 分區/小隊任務分配
    COMMUNICATIONS = 'communications', // ICS 205 - 通訊計畫
    MEDICAL = 'medical',              // ICS 206 - 醫療計畫
    TRAFFIC = 'traffic',              // 交通/道路計畫
    RESOURCES = 'resources',          // ICS 207/208 - 資源清單
    SAFETY = 'safety',                // ICS 208 - 安全訊息
    MAP_ATTACHMENTS = 'map_attachments', // 地圖附錄
}

export enum IAPDocumentStatus {
    DRAFT = 'draft',
    PENDING_REVIEW = 'pending_review',
    APPROVED = 'approved',
    SUPERSEDED = 'superseded',
}

@Entity('iap_documents')
@Index(['operationalPeriodId', 'documentType'])
export class IAPDocument {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'operational_period_id', type: 'uuid' })
    operationalPeriodId: string;

    @ManyToOne(() => OperationalPeriod, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'operational_period_id' })
    operationalPeriod: OperationalPeriod;

    @Column({
        name: 'document_type',
        type: 'enum',
        enum: IAPDocumentType,
    })
    documentType: IAPDocumentType;

    @Column({ type: 'varchar', length: 255, nullable: true })
    title: string;

    // 表單內容 (依 documentType 有不同結構)
    @Column({ type: 'jsonb', default: '{}' })
    content: Record<string, any>;

    // 附件清單
    @Column({ type: 'jsonb', default: '[]' })
    attachments: { id: string; name: string; url: string; type: string }[];

    // 狀態與版本
    @Column({
        type: 'enum',
        enum: IAPDocumentStatus,
        default: IAPDocumentStatus.DRAFT,
    })
    status: IAPDocumentStatus;

    @Column({ type: 'int', default: 1 })
    version: number;

    // 審核
    @Column({ name: 'approved_by', type: 'varchar', nullable: true })
    approvedBy: string;

    @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
    approvedAt: Date;

    // 審計
    @Column({ name: 'created_by', type: 'varchar' })
    createdBy: string;

    @Column({ name: 'updated_by', type: 'varchar', nullable: true })
    updatedBy: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
