import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export type AuditTargetType = 'transaction' | 'asset_transaction' | 'donor' | 'other';
export type AuditResult = 'success' | 'denied';

/**
 * 敏感資料讀取稽核日誌（Append-only）
 * 記錄誰在何時讀取了哪些敏感資料
 */
@Entity('sensitive_read_logs')
export class SensitiveReadLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 操作人 UID
    @Column({ type: 'uuid' })
    actorUid: string;

    // 操作人角色
    @Column({ type: 'varchar', length: 50 })
    actorRole: string;

    // 目標資料類型
    @Column({ type: 'varchar', length: 50 })
    targetType: AuditTargetType;

    // 目標資料 ID
    @Column({ type: 'uuid' })
    targetId: string;

    // 被讀取的敏感欄位（JSON 陣列）
    @Column({ type: 'json' })
    fieldsAccessed: string[];

    // 讀取原因代碼（可選）
    @Column({ type: 'varchar', length: 50, nullable: true })
    reasonCode?: string;

    // 讀取原因文字（可選）
    @Column({ type: 'varchar', length: 500, nullable: true })
    reasonText?: string;

    // UI 觸發位置
    @Column({ type: 'varchar', length: 200 })
    uiContext: string;

    // 裝置資訊（可選，JSON）
    @Column({ type: 'json', nullable: true })
    deviceInfo?: Record<string, any>;

    // IP 位址（可選）
    @Column({ type: 'varchar', length: 45, nullable: true })
    ip?: string;

    // 讀取結果
    @Column({ type: 'varchar', length: 20 })
    result: AuditResult;

    @CreateDateColumn()
    createdAt: Date;
}
