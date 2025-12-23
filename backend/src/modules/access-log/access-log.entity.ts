import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export type AccessAction = 'VIEW' | 'LIST' | 'EXPORT' | 'CREATE' | 'UPDATE' | 'DELETE';

/**
 * 存取日誌 - 記錄對敏感資料的存取
 */
@Entity('access_logs')
export class AccessLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 操作者資訊
    @Column({ type: 'varchar', length: 100, nullable: true })
    @Index()
    userId?: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    userName?: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    userRole?: string;

    // 操作類型
    @Column({ type: 'varchar', length: 20 })
    @Index()
    action: AccessAction;

    // 目標資源
    @Column({ type: 'varchar', length: 100 })
    @Index()
    targetTable: string;

    @Column({ type: 'uuid', nullable: true })
    targetId?: string;

    // 存取的敏感欄位
    @Column({ type: 'simple-array', nullable: true })
    sensitiveFieldsAccessed?: string[];

    // 請求資訊
    @Column({ type: 'varchar', length: 50, nullable: true })
    ipAddress?: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    userAgent?: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    requestPath?: string;

    @Column({ type: 'varchar', length: 10, nullable: true })
    requestMethod?: string;

    // 結果
    @Column({ type: 'boolean', default: true })
    success: boolean;

    @Column({ type: 'text', nullable: true })
    errorMessage?: string;

    // 時間戳記
    @CreateDateColumn()
    @Index()
    createdAt: Date;
}
