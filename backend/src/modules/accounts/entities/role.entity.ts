import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * 角色等級定義：
 * 0 = public (一般民眾)
 * 1 = volunteer (登記志工)
 * 2 = officer (幹部)
 * 3 = director (常務理事)
 * 4 = chairman (理事長)
 * 5 = owner (系統擁有者)
 */
export enum RoleLevel {
    PUBLIC = 0,
    VOLUNTEER = 1,
    OFFICER = 2,
    DIRECTOR = 3,
    CHAIRMAN = 4,
    OWNER = 5,
}

@Entity('roles')
export class Role {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true, length: 50 })
    name: string;

    @Column({ name: 'display_name', length: 100, nullable: true, default: '登記志工' })
    displayName: string;

    @Column({ type: 'int', default: 1 })
    level: number;

    @Column({ type: 'text', nullable: true })
    description: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

