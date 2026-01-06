/**
 * Missing Person Entity - 失蹤者資料
 * Phase 5.4: 災民協尋與平安回報 (Family Reunification)
 */

import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum MissingPersonStatus {
    MISSING = 'MISSING',           // 失蹤中
    FOUND_SAFE = 'FOUND_SAFE',     // 已尋獲 - 平安
    FOUND_INJURED = 'FOUND_INJURED', // 已尋獲 - 受傷
    FOUND_DECEASED = 'FOUND_DECEASED', // 已尋獲 - 罹難
    REUNITED = 'REUNITED',         // 已與家屬團聚
}

@Entity('missing_persons')
export class MissingPerson {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** 任務場次 ID */
    @Column()
    @Index()
    missionSessionId: string;

    // ============ 失蹤者資料 ============

    @Column({ length: 100 })
    name: string;

    @Column({ nullable: true })
    age?: number;

    @Column({ nullable: true, length: 10 })
    gender?: string;

    @Column({ type: 'text', nullable: true })
    description?: string; // 外觀特徵

    @Column({ type: 'text', nullable: true })
    lastKnownLocation?: string;

    @Column({ type: 'json', nullable: true })
    lastKnownCoordinates?: { lat: number; lng: number };

    @Column({ type: 'timestamp', nullable: true })
    lastSeenAt?: Date;

    @Column({ type: 'text', array: true, nullable: true, default: '{}' })
    photoUrls?: string[];

    @Column({ nullable: true, length: 50 })
    contactPhone?: string;

    // ============ 狀態追蹤 ============

    @Column({
        type: 'enum',
        enum: MissingPersonStatus,
        default: MissingPersonStatus.MISSING,
    })
    @Index()
    status: MissingPersonStatus;

    @Column({ type: 'text', nullable: true })
    foundLocation?: string;

    @Column({ type: 'json', nullable: true })
    foundCoordinates?: { lat: number; lng: number };

    @Column({ type: 'timestamp', nullable: true })
    foundAt?: Date;

    @Column({ nullable: true })
    foundByVolunteerId?: string;

    @Column({ nullable: true, length: 100 })
    foundByVolunteerName?: string;

    // ============ 報案者資料 ============

    @Column({ nullable: true, length: 100 })
    reporterName?: string;

    @Column({ nullable: true, length: 50 })
    reporterPhone?: string;

    @Column({ nullable: true, length: 100 })
    reporterRelation?: string; // 關係

    // ============ 隱私控制 ============

    /** 查詢碼 (供家屬查詢) */
    @Column({ unique: true, length: 20 })
    @Index()
    queryCode: string;

    /** 是否公開顯示 */
    @Column({ default: true })
    isPublic: boolean;

    // ============ 時間戳 ============

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
