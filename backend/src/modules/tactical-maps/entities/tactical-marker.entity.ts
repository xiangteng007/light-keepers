/**
 * Tactical Marker Entity
 * Phase 6.1: 戰術標記實體
 */

import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum MarkerCategory {
    FRIENDLY = 'FRIENDLY',     // 友軍
    HOSTILE = 'HOSTILE',       // 敵方/危險
    NEUTRAL = 'NEUTRAL',       // 中立
    UNKNOWN = 'UNKNOWN',       // 未知
    INFRASTRUCTURE = 'INFRASTRUCTURE', // 基礎設施
    OBJECTIVE = 'OBJECTIVE',   // 目標
    HAZARD = 'HAZARD',         // 危害
}

export enum MarkerType {
    UNIT = 'UNIT',               // 單位
    VEHICLE = 'VEHICLE',         // 車輛
    AIRCRAFT = 'AIRCRAFT',       // 飛行器
    WAYPOINT = 'WAYPOINT',       // 航點
    RALLY_POINT = 'RALLY_POINT', // 集結點
    COMMAND_POST = 'COMMAND_POST', // 指揮所
    MEDICAL = 'MEDICAL',         // 醫療
    SUPPLY = 'SUPPLY',           // 物資
    BOUNDARY = 'BOUNDARY',       // 邊界
    ROUTE = 'ROUTE',             // 路線
    AREA = 'AREA',               // 區域
    LINE = 'LINE',               // 線
    POINT = 'POINT',             // 點
}

@Entity('tactical_markers')
export class TacticalMarker {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    missionSessionId: string;

    @Column({ length: 100 })
    name: string;

    @Column({
        type: 'enum',
        enum: MarkerCategory,
        default: MarkerCategory.FRIENDLY,
    })
    category: MarkerCategory;

    @Column({
        type: 'enum',
        enum: MarkerType,
        default: MarkerType.POINT,
    })
    type: MarkerType;

    // ============ 位置資料 ============

    /** 經度 */
    @Column({ type: 'float' })
    longitude: number;

    /** 緯度 */
    @Column({ type: 'float' })
    latitude: number;

    /** 高度 (公尺) */
    @Column({ type: 'float', nullable: true })
    altitude?: number;

    /** 多邊形/線條座標 (GeoJSON) */
    @Column({ type: 'json', nullable: true })
    geometry?: {
        type: 'Polygon' | 'LineString' | 'MultiPoint';
        coordinates: number[][] | number[][][];
    };

    // ============ 3D 屬性 ============

    /** 高程/建築高度 */
    @Column({ type: 'float', nullable: true })
    height?: number;

    /** 3D 模型 URL */
    @Column({ nullable: true, length: 255 })
    model3dUrl?: string;

    /** 視域分析參數 */
    @Column({ type: 'json', nullable: true })
    viewshedParams?: {
        observerHeight: number;
        targetHeight: number;
        maxDistance: number;
        horizontalAngle: number;
        verticalAngleUp: number;
        verticalAngleDown: number;
    };

    // ============ 顯示屬性 ============

    @Column({ length: 20, default: '#3b82f6' })
    color: string;

    @Column({ nullable: true, length: 100 })
    iconUrl?: string;

    @Column({ type: 'float', default: 1.0 })
    opacity: number;

    @Column({ default: true })
    isVisible: boolean;

    /** MIL-STD-2525 符號代碼 */
    @Column({ nullable: true, length: 30 })
    sidc?: string;

    // ============ 備註 ============

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'json', nullable: true })
    metadata?: Record<string, any>;

    // ============ 時間戳 ============

    @Column({ nullable: true })
    createdBy?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
