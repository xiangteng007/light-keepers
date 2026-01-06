/**
 * Victim Entity - 傷患資料實體
 * Phase 5.1: 數位檢傷分類系統 (E-Triage)
 * 
 * 基於 START (Simple Triage and Rapid Treatment) 檢傷法
 */

import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    OneToMany,
} from 'typeorm';
import { MedicalLog } from './medical-log.entity';

/**
 * START 檢傷分類等級
 */
export enum TriageLevel {
    BLACK = 'BLACK',     // 死亡或無法存活
    RED = 'RED',         // 危急 - 需立即處理
    YELLOW = 'YELLOW',   // 延遲 - 可等待
    GREEN = 'GREEN',     // 輕傷 - 可自行行動
}

/**
 * 運送狀態
 */
export enum TransportStatus {
    PENDING = 'PENDING',         // 待運送
    IN_TRANSIT = 'IN_TRANSIT',   // 運送中
    ARRIVED = 'ARRIVED',         // 已到達醫院
}

@Entity('victims')
export class Victim {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** 手環 ID (NFC/QR) */
    @Column({ nullable: true, unique: true, length: 50 })
    @Index()
    braceletId?: string;

    /** 任務場次 ID */
    @Column()
    @Index()
    missionSessionId: string;

    /** 檢傷等級 */
    @Column({
        type: 'enum',
        enum: TriageLevel,
        default: TriageLevel.GREEN,
    })
    @Index()
    triageLevel: TriageLevel;

    // ============ START 評估欄位 ============

    /** 是否能行走 (Can Walk?) */
    @Column({ default: false })
    canWalk: boolean;

    /** 是否有呼吸 (Breathing?) */
    @Column({ default: true })
    breathing: boolean;

    /** 呼吸頻率 (每分鐘) */
    @Column({ type: 'int', nullable: true })
    respiratoryRate?: number;

    /** 橈動脈是否可觸及 (Radial Pulse?) */
    @Column({ default: true })
    hasRadialPulse: boolean;

    /** 微血管回填時間 (秒) */
    @Column({ type: 'float', nullable: true })
    capillaryRefillTime?: number;

    /** 能否遵從簡單指令 (Can Follow Commands?) */
    @Column({ default: true })
    canFollowCommands: boolean;

    // ============ 傷患資訊 ============

    /** 傷患描述 (年齡/性別/特徵) */
    @Column({ type: 'text', nullable: true })
    description?: string;

    /** 發現位置 */
    @Column({ type: 'json', nullable: true })
    discoveryLocation?: { lat: number; lng: number };

    /** 發現位置描述 */
    @Column({ nullable: true, length: 255 })
    locationDescription?: string;

    /** 傷勢描述 */
    @Column({ type: 'text', nullable: true })
    injuries?: string;

    /** 照片 URLs */
    @Column({ type: 'text', array: true, nullable: true, default: '{}' })
    photoUrls?: string[];

    // ============ 運送追蹤 ============

    /** 運送狀態 */
    @Column({
        type: 'enum',
        enum: TransportStatus,
        default: TransportStatus.PENDING,
    })
    transportStatus: TransportStatus;

    /** 目的地醫院 ID */
    @Column({ nullable: true })
    hospitalId?: string;

    /** 目的地醫院名稱 */
    @Column({ nullable: true, length: 100 })
    hospitalName?: string;

    /** 救護車 ID */
    @Column({ nullable: true, length: 50 })
    ambulanceId?: string;

    /** 預計到達時間 */
    @Column({ type: 'timestamp', nullable: true })
    estimatedArrival?: Date;

    /** 實際到達時間 */
    @Column({ type: 'timestamp', nullable: true })
    actualArrival?: Date;

    // ============ 評估者資訊 ============

    /** 評估者 ID */
    @Column({ nullable: true })
    assessorId?: string;

    /** 評估者姓名 */
    @Column({ nullable: true, length: 100 })
    assessorName?: string;

    // ============ 時間戳 ============

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // ============ 關聯 ============

    @OneToMany(() => MedicalLog, (log) => log.victim)
    medicalLogs: MedicalLog[];
}
