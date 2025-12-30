import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export type LabelAction = 'generate' | 'print' | 'reprint' | 'revoke';
export type LabelTargetType = 'lot' | 'asset' | 'bin';

/**
 * QR/貼紙產碼列印稽核日誌（Append-only）
 * 記錄所有產碼、列印、重印、作廢操作
 */
@Entity('label_print_logs')
export class LabelPrintLog {
    @PrimaryGeneratedColumn('uuid')
    id: string; // printBatchId

    // 操作人 UID
    @Column({ type: 'uuid' })
    actorUid: string;

    // 操作人角色
    @Column({ type: 'varchar', length: 50 })
    actorRole: string;

    // 操作類型
    @Column({ type: 'varchar', length: 20 })
    action: LabelAction;

    // 目標類型
    @Column({ type: 'varchar', length: 20 })
    targetType: LabelTargetType;

    // 產碼/列印的目標 ID 列表（JSON 陣列）
    @Column({ type: 'json' })
    targetIds: string[];

    // 管控等級（controlled/medical/asset）
    @Column({ type: 'varchar', length: 20 })
    controlLevel: string;

    // 使用的貼紙模板 ID
    @Column({ type: 'uuid' })
    templateId: string;

    // 列印張數
    @Column({ type: 'int', default: 1 })
    labelCount: number;

    // 關聯的入庫交易 ID（若有）
    @Column({ type: 'uuid', nullable: true })
    relatedTxId?: string;

    // 作廢原因（action=revoke 時必填）
    @Column({ type: 'varchar', length: 500, nullable: true })
    revokeReason?: string;

    @CreateDateColumn()
    createdAt: Date;
}
