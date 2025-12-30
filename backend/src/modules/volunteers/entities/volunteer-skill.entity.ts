import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Volunteer } from '../volunteers.entity';
import { Skill } from './skill.entity';

// 技能等級
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'instructor';

@Entity('volunteer_skills')
export class VolunteerSkill {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 志工
    @Column({ name: 'volunteer_id', type: 'uuid' })
    volunteerId: string;

    @ManyToOne(() => Volunteer, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'volunteer_id' })
    volunteer: Volunteer;

    // 專長
    @Column({ name: 'skill_id', type: 'uuid' })
    skillId: string;

    @ManyToOne(() => Skill, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'skill_id' })
    skill: Skill;

    // 技能等級
    @Column({ type: 'varchar', length: 20, default: 'beginner' })
    level: SkillLevel;

    // 認證日期
    @Column({ name: 'certified_at', type: 'date', nullable: true })
    certifiedAt?: Date;

    // 到期日期
    @Column({ name: 'expires_at', type: 'date', nullable: true })
    expiresAt?: Date;

    // 證照檔案 URL
    @Column({ name: 'certificate_url', type: 'varchar', length: 500, nullable: true })
    certificateUrl?: string;

    // 備註
    @Column({ type: 'text', nullable: true })
    notes?: string;

    // 已驗證
    @Column({ type: 'boolean', default: false })
    verified: boolean;

    // 驗證人
    @Column({ name: 'verified_by', type: 'uuid', nullable: true })
    verifiedBy?: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
