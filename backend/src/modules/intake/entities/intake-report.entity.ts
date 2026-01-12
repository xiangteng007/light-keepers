import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { MissionSession } from '../../mission-sessions/entities/mission-session.entity';

/**
 * v2.1 SSOT: 通報記錄
 * 統一通報入口產生的記錄，關聯到 Incident (MissionSession)
 */

export enum IntakeReportType {
    DAMAGE = 'damage',       // 災情通報
    EVENT = 'event',         // 事件通報
    ALERT = 'alert',         // 警報響應
    CITIZEN = 'citizen',     // 民眾通報
    PATROL = 'patrol',       // 巡邏發現
}

export enum IntakeReportStatus {
    RECEIVED = 'received',   // 已收到
    TRIAGED = 'triaged',     // 已分流
    ASSIGNED = 'assigned',   // 已指派
    RESOLVED = 'resolved',   // 已解決
    REJECTED = 'rejected',   // 已駁回
}

@Entity('intake_reports')
export class IntakeReport {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 通報類型
    @Column({
        type: 'enum',
        enum: IntakeReportType,
        default: IntakeReportType.EVENT,
    })
    sourceType: IntakeReportType;

    // 通報狀態
    @Column({
        type: 'enum',
        enum: IntakeReportStatus,
        default: IntakeReportStatus.RECEIVED,
    })
    status: IntakeReportStatus;

    // 標題/摘要
    @Column({ type: 'varchar', length: 255 })
    title: string;

    // 詳細內容
    @Column({ type: 'text', nullable: true })
    description: string;

    // 通報內容 (原始 payload)
    @Column({ type: 'jsonb', nullable: true, comment: 'Original intake payload' })
    payload: Record<string, any>;

    // 附件媒體 (圖片/影片 URLs)
    @Column({ type: 'simple-array', nullable: true })
    media: string[];

    // 地理位置
    @Column({ type: 'jsonb', nullable: true, comment: 'Geolocation {lat, lng, address}' })
    geo: { lat?: number; lng?: number; address?: string };

    // 行政區代碼
    @Column({ name: 'admin_code', type: 'varchar', length: 20, nullable: true })
    adminCode: string;

    // 關聯的 Incident ID (MissionSession)
    @Column({ name: 'incident_id', type: 'uuid', nullable: true })
    incidentId: string;

    // 通報人 ID (如有登入)
    @Column({ name: 'reporter_id', type: 'uuid', nullable: true })
    reporterId: string;

    // 通報人名稱 (匿名也可填)
    @Column({ name: 'reporter_name', type: 'varchar', length: 100, nullable: true })
    reporterName: string;

    // 通報人電話
    @Column({ name: 'reporter_phone', type: 'varchar', length: 30, nullable: true })
    reporterPhone: string;

    // 備註
    @Column({ type: 'text', nullable: true })
    notes: string;

    // 元數據
    @Column({ type: 'jsonb', nullable: true, comment: 'Additional metadata' })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    // Relations
    @ManyToOne(() => MissionSession, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'incident_id' })
    incident: MissionSession;
}
