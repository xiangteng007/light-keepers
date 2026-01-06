/**
 * Medical Log Entity - 醫療處置記錄
 * Phase 5.1: E-Triage 系統
 */

import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Victim } from './victim.entity';

/**
 * 處置類型
 */
export enum TreatmentType {
    TRIAGE_ASSESSMENT = 'TRIAGE_ASSESSMENT',   // 檢傷評估
    TRIAGE_UPGRADE = 'TRIAGE_UPGRADE',         // 等級提升
    TRIAGE_DOWNGRADE = 'TRIAGE_DOWNGRADE',     // 等級降低
    FIRST_AID = 'FIRST_AID',                   // 初步急救
    MEDICATION = 'MEDICATION',                  // 給藥
    TRANSPORT_START = 'TRANSPORT_START',        // 開始運送
    TRANSPORT_ARRIVED = 'TRANSPORT_ARRIVED',    // 到達醫院
    STATUS_UPDATE = 'STATUS_UPDATE',            // 狀態更新
    NOTE = 'NOTE',                              // 備註
}

@Entity('medical_logs')
export class MedicalLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** 傷患 ID */
    @Column()
    victimId: string;

    /** 處置類型 */
    @Column({
        type: 'enum',
        enum: TreatmentType,
    })
    type: TreatmentType;

    /** 處置內容 */
    @Column({ type: 'text' })
    content: string;

    /** 處置者 ID */
    @Column({ nullable: true })
    performerId?: string;

    /** 處置者姓名 */
    @Column({ nullable: true, length: 100 })
    performerName?: string;

    /** 額外資料 (如藥物名稱、劑量等) */
    @Column({ type: 'json', nullable: true })
    metadata?: Record<string, any>;

    /** GPS 位置 */
    @Column({ type: 'json', nullable: true })
    location?: { lat: number; lng: number };

    @CreateDateColumn()
    timestamp: Date;

    // ============ 關聯 ============

    @ManyToOne(() => Victim, (victim) => victim.medicalLogs, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'victimId' })
    victim: Victim;
}
