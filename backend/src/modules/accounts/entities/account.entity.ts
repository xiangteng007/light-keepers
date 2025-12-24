import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { Role } from './role.entity';

@Entity('accounts')
export class Account {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true, nullable: true, length: 255 })
    email: string;

    @Column({ unique: true, nullable: true, length: 20 })
    phone: string;

    @Column({ name: 'password_hash', length: 255 })
    passwordHash: string;

    @Column({ name: 'display_name', nullable: true, length: 100 })
    displayName: string;

    @Column({ name: 'avatar_url', type: 'text', nullable: true })
    avatarUrl: string;

    // LINE Login 綁定欄位
    @Column({ name: 'line_user_id', unique: true, nullable: true, length: 50 })
    lineUserId: string;

    @Column({ name: 'line_display_name', nullable: true, length: 100 })
    lineDisplayName: string;

    // Google Login 綁定欄位
    @Column({ name: 'google_id', unique: true, nullable: true, length: 50 })
    googleId: string;

    @Column({ name: 'google_email', nullable: true, length: 255 })
    googleEmail: string;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
    lastLoginAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @ManyToMany(() => Role)
    @JoinTable({
        name: 'account_roles',
        joinColumn: { name: 'account_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
    })
    roles: Role[];
}
