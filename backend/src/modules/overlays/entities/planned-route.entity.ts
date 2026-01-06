/**
 * 規劃路徑實體 (Planned Route Entity)
 * COP 地圖路徑規劃：撤離路線、補給路線、巡邏路線
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

export enum RouteType {
    EVACUATION = 'evacuation',    // 撤離路線
    SUPPLY = 'supply',            // 補給路線
    PATROL = 'patrol',            // 巡邏路線
    ACCESS = 'access',            // 進入路線
    ALTERNATE = 'alternate',      // 備用路線
}

export enum RouteStatus {
    OPEN = 'open',
    BLOCKED = 'blocked',
    RESTRICTED = 'restricted',
    UNKNOWN = 'unknown',
}

export interface Waypoint {
    id: string;
    name: string;
    coordinates: [number, number]; // [lng, lat]
    order: number;
    estimatedTime?: number; // minutes from previous
    notes?: string;
}

@Entity('planned_routes')
@Index(['missionSessionId', 'routeType'])
@Index(['status'])
export class PlannedRoute {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'mission_session_id', type: 'uuid' })
    missionSessionId: string;

    @ManyToOne(() => MissionSession, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'mission_session_id' })
    missionSession: MissionSession;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    // 類型
    @Column({
        name: 'route_type',
        type: 'enum',
        enum: RouteType,
        default: RouteType.ACCESS,
    })
    routeType: RouteType;

    // GeoJSON LineString
    @Column({ type: 'jsonb' })
    geometry: {
        type: 'LineString';
        coordinates: number[][];
    };

    // 途經點
    @Column({ type: 'jsonb', default: '[]' })
    waypoints: Waypoint[];

    // 預估時間 (分鐘)
    @Column({ name: 'estimated_time', type: 'int', nullable: true })
    estimatedTime: number;

    // 預估距離 (公尺)
    @Column({ name: 'estimated_distance', type: 'int', nullable: true })
    estimatedDistance: number;

    // 狀態
    @Column({
        type: 'enum',
        enum: RouteStatus,
        default: RouteStatus.OPEN,
    })
    status: RouteStatus;

    // 起點/終點連結
    @Column({ name: 'start_point_id', type: 'uuid', nullable: true })
    startPointId: string;

    @Column({ name: 'end_point_id', type: 'uuid', nullable: true })
    endPointId: string;

    // 附加屬性
    @Column({ type: 'jsonb', default: '{}' })
    props: {
        color?: string;
        width?: number;
        roadCondition?: string;
        restrictions?: string[];
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
