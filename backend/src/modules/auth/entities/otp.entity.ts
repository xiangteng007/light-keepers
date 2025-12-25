import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * OTP 驗證碼實體
 * 用於手機號碼和 Email 驗證
 */
@Entity('otp_codes')
export class OtpCode {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 50 })
    target: string; // phone or email

    @Column({ name: 'target_type', type: 'varchar', length: 10 })
    targetType: 'phone' | 'email';

    @Column({ length: 6 })
    code: string;

    @Column({ name: 'expires_at', type: 'timestamp' })
    expiresAt: Date;

    @Column({ default: false })
    used: boolean;

    @Column({ name: 'attempts', default: 0 })
    attempts: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
