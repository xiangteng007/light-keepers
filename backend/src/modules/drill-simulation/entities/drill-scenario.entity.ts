/**
 * 演練腳本實體 (Drill Scenario Entity)
 * 模組 A: 數位孿生演練系統
 */

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum DrillStatus {
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE',
    RUNNING = 'RUNNING',
    COMPLETED = 'COMPLETED',
    ARCHIVED = 'ARCHIVED',
}

export interface DrillEvent {
    time: string;          // 'T+10' 格式
    offsetMinutes: number; // 相對開始時間的分鐘數
    type: 'SOS' | 'REPORT' | 'RESOURCE_REQUEST' | 'COMMUNICATION_FAILURE' | 'EVACUATION' | 'CUSTOM';
    location?: { lat: number; lng: number };
    payload: Record<string, any>;
    description: string;
}

export interface DrillResult {
    totalEvents: number;
    respondedEvents: number;
    averageResponseTime: number; // 秒
    resourceAllocationScore: number; // 0-100
    communicationScore: number;
    decisionQualityScore: number;
    aiRecommendations: string[];
}

@Entity('drill_scenarios')
export class DrillScenario {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({ nullable: true })
    description: string;

    @Column({ type: 'json' })
    events: DrillEvent[];

    @Column({
        type: 'enum',
        enum: DrillStatus,
        default: DrillStatus.DRAFT,
    })
    status: DrillStatus;

    @Column({ nullable: true })
    createdBy: string;

    @Column({ type: 'json', nullable: true })
    result: DrillResult;

    @Column({ nullable: true })
    startedAt: Date;

    @Column({ nullable: true })
    endedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
