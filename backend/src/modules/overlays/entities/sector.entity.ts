/**
 * 責任區實體 (Sector Entity)
 * COP 地圖區域管理：責任區、危險區、撤離區、管制區
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

export enum SectorType {
    AREA_OF_OPERATION = 'area_of_operation',  // 作戰責任區 (AO)
    DANGER_ZONE = 'danger_zone',              // 危險區
    EVACUATION_ZONE = 'evacuation_zone',      // 撤離區
    TRAFFIC_CONTROL = 'traffic_control',      // 交通管制區
    STAGING_AREA = 'staging_area',            // 集結區
    SEARCH_AREA = 'search_area',              // 搜索區
    RESTRICTED = 'restricted',                // 限制區
}

export enum SectorStatus {
    ACTIVE = 'active',
    CLEARED = 'cleared',
    RESTRICTED = 'restricted',
    PENDING = 'pending',
}

@Entity('sectors')
@Index(['missionSessionId', 'status'])
@Index(['sectorType'])
export class Sector {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'mission_session_id', type: 'uuid' })
    missionSessionId: string;

    @ManyToOne(() => MissionSession, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'mission_session_id' })
    missionSession: MissionSession;

    // 識別碼 (A-1, B-2, etc.)
    @Column({ name: 'sector_code', type: 'varchar', length: 20 })
    sectorCode: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    // 類型
    @Column({
        name: 'sector_type',
        type: 'enum',
        enum: SectorType,
        default: SectorType.AREA_OF_OPERATION,
    })
    sectorType: SectorType;

    // GeoJSON Polygon
    @Column({ type: 'jsonb' })
    geometry: {
        type: 'Polygon';
        coordinates: number[][][];
    };

    // 責任小隊
    @Column({ name: 'assigned_team_id', type: 'uuid', nullable: true })
    assignedTeamId: string;

    @Column({ name: 'assigned_team_name', type: 'varchar', nullable: true })
    assignedTeamName: string;

    // 狀態
    @Column({
        type: 'enum',
        enum: SectorStatus,
        default: SectorStatus.ACTIVE,
    })
    status: SectorStatus;

    // 嚴重度 (for danger zones)
    @Column({ type: 'smallint', nullable: true })
    severity: number;

    // 附加屬性
    @Column({ type: 'jsonb', default: '{}' })
    props: {
        color?: string;
        description?: string;
        estimatedPopulation?: number;
        evacuationComplete?: boolean;
        restrictions?: string[];
    };

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
