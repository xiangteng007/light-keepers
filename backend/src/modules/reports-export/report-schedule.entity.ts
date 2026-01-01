import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Account } from '../accounts/entities/account.entity';

export type ReportType = 'volunteer_hours' | 'disaster' | 'inventory' | 'inventory_transaction' | 'activity_attendance';
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';
export type DeliveryMethod = 'email' | 'download' | 'storage';

// ===== 報表排程配置 =====
@Entity('report_schedules')
export class ReportSchedule {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // ===== 基本資訊 =====

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'varchar', length: 30 })
    reportType: ReportType;

    // ===== 排程設定 =====

    @Column({ type: 'varchar', length: 20 })
    frequency: ScheduleFrequency;

    // 執行時間（24小時制，e.g., "08:00"）
    @Column({ type: 'varchar', length: 5, default: '00:00' })
    executeAt: string;

    // 週執行日（0-6，0=Sunday）
    @Column({ type: 'int', nullable: true })
    dayOfWeek?: number;

    // 月執行日（1-31）
    @Column({ type: 'int', nullable: true })
    dayOfMonth?: number;

    // 是否啟用
    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    // ===== 報表參數 =====

    // 報表期間（自動計算）：last_day, last_week, last_month
    @Column({ type: 'varchar', length: 20, default: 'last_day' })
    periodType: string;

    // 額外參數（JSON）
    @Column({ type: 'text', nullable: true })
    parameters?: string;

    // ===== 發送設定 =====

    @Column({ type: 'varchar', length: 20, default: 'storage' })
    deliveryMethod: DeliveryMethod;

    // 收件者 Email（多個以逗號分隔）
    @Column({ type: 'text', nullable: true })
    recipients?: string;

    // 輸出格式
    @Column({ type: 'varchar', length: 10, default: 'csv' })
    outputFormat: 'csv' | 'json' | 'pdf';

    // ===== 建立者 =====

    @Column({ type: 'uuid' })
    createdBy: string;

    @ManyToOne(() => Account, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'createdBy' })
    creator: Account;

    // ===== 執行記錄 =====

    @Column({ type: 'timestamp', nullable: true })
    lastExecutedAt?: Date;

    @Column({ type: 'timestamp', nullable: true })
    nextExecuteAt?: Date;

    @Column({ type: 'int', default: 0 })
    executionCount: number;

    @Column({ type: 'int', default: 0 })
    failureCount: number;

    @Column({ type: 'text', nullable: true })
    lastError?: string;

    // ===== 時間戳記 =====

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

// ===== 報表執行記錄 =====
@Entity('report_executions')
export class ReportExecution {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    scheduleId: string;

    @ManyToOne(() => ReportSchedule, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'scheduleId' })
    schedule: ReportSchedule;

    // 執行狀態
    @Column({ type: 'varchar', length: 20 })
    status: 'pending' | 'running' | 'completed' | 'failed';

    // 報表期間
    @Column({ type: 'timestamp' })
    periodStart: Date;

    @Column({ type: 'timestamp' })
    periodEnd: Date;

    // 執行時間
    @Column({ type: 'timestamp', nullable: true })
    startedAt?: Date;

    @Column({ type: 'timestamp', nullable: true })
    completedAt?: Date;

    // 執行時長（毫秒）
    @Column({ type: 'int', nullable: true })
    durationMs?: number;

    // 輸出檔案路徑
    @Column({ type: 'varchar', length: 500, nullable: true })
    outputPath?: string;

    // 檔案大小（bytes）
    @Column({ type: 'int', nullable: true })
    fileSize?: number;

    // 錯誤訊息
    @Column({ type: 'text', nullable: true })
    errorMessage?: string;

    // ===== 時間戳記 =====

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
