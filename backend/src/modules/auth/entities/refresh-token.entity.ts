/**
 * Refresh Token Entity
 * 
 * Stores refresh tokens for secure token rotation.
 * Each token is associated with a device/browser session.
 */

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Account } from '../../accounts/entities/account.entity';

@Entity('refresh_tokens')
export class RefreshToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /**
     * Hashed refresh token (SHA-256)
     * The actual token is sent to client, we store the hash
     */
    @Column({ length: 64 })
    @Index()
    tokenHash: string;

    /**
     * Account that owns this token
     */
    @Column({ name: 'account_id' })
    @Index()
    accountId: string;

    @ManyToOne(() => Account, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'account_id' })
    account: Account;

    /**
     * User agent of the device/browser
     */
    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent: string;

    /**
     * IP address at token creation
     */
    @Column({ name: 'ip_address', length: 45, nullable: true })
    ipAddress: string;

    /**
     * Token expiration date
     */
    @Column({ name: 'expires_at', type: 'timestamp' })
    expiresAt: Date;

    /**
     * Whether token has been revoked (logout, security)
     */
    @Column({ name: 'is_revoked', default: false })
    isRevoked: boolean;

    /**
     * Last used timestamp
     */
    @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
    lastUsedAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
