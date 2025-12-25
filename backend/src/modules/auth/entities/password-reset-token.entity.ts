import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * 密碼重設 Token 實體
 * 用於忘記密碼流程
 */
@Entity('password_reset_tokens')
export class PasswordResetToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'account_id' })
    accountId: string;

    @Column({ length: 64, unique: true })
    token: string;

    @Column({ name: 'expires_at', type: 'timestamp' })
    expiresAt: Date;

    @Column({ default: false })
    used: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
