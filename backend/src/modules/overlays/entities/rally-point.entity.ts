/**
 * 集結點實體 (Rally Point Entity)
 * COP 地圖重要點位：集結點、補給點、指揮所、醫療站、撤離點
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
import { MissionSession } from '../../mission-sessions/entities/mission-session.entity';

export enum RallyPointType {
    RALLY = 'rally',              // 集結點
    COMMAND = 'command',          // 指揮所
    SUPPLY = 'supply',            // 補給點
    MEDICAL = 'medical',          // 醫療站
    EVACUATION = 'evacuation',    // 撤離點
    SHELTER = 'shelter',          // 避難所
    HELICOPTER = 'helicopter',    // 直升機降落點
    STAGING = 'staging',          // 裝備集結區
}

export enum RallyPointStatus {
    OPEN = 'open',
    FULL = 'full',
    CLOSED = 'closed',
    PREPARING = 'preparing',
}

@Entity('rally_points')
@Index(['missionSessionId', 'pointType'])
@Index(['status'])
export class RallyPoint {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'mission_session_id', type: 'uuid' })
    missionSessionId: string;

    @ManyToOne(() => MissionSession, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'mission_session_id' })
    missionSession: MissionSession;

    // 識別碼 (RP-01, CMD-01, etc.)
    @Column({ type: 'varchar', length: 20 })
    code: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    // 類型
    @Column({
        name: 'point_type',
        type: 'enum',
        enum: RallyPointType,
        default: RallyPointType.RALLY,
    })
    pointType: RallyPointType;

    // GeoJSON Point
    @Column({ type: 'jsonb' })
    geometry: {
        type: 'Point';
        coordinates: [number, number]; // [lng, lat]
    };

    // 地址
    @Column({ type: 'text', nullable: true })
    address: string;

    // 容量
    @Column({ type: 'int', nullable: true })
    capacity: number;

    @Column({ name: 'current_count', type: 'int', default: 0 })
    currentCount: number;

    // 狀態
    @Column({
        type: 'enum',
        enum: RallyPointStatus,
        default: RallyPointStatus.OPEN,
    })
    status: RallyPointStatus;

    // 負責人
    @Column({ name: 'contact_name', type: 'varchar', nullable: true })
    contactName: string;

    @Column({ name: 'contact_phone', type: 'varchar', nullable: true })
    contactPhone: string;

    // 無線電頻道
    @Column({ name: 'radio_channel', type: 'varchar', nullable: true })
    radioChannel: string;

    // 附加屬性
    @Column({ type: 'jsonb', default: '{}' })
    props: {
        icon?: string;
        color?: string;
        resources?: string[];
        notes?: string;
    };

    // 審計
    @Column({ name: 'created_by', type: 'varchar' })
    createdBy: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
