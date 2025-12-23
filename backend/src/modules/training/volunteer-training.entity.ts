import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Volunteer } from '../volunteers/volunteers.entity';
import { TrainingCourse } from './training-courses.entity';

export type TrainingStatus = 'not_started' | 'in_progress' | 'completed';

@Entity('volunteer_training')
export class VolunteerTraining {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 志工關聯
    @Column({ type: 'uuid' })
    volunteerId: string;

    @ManyToOne(() => Volunteer, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'volunteerId' })
    volunteer: Volunteer;

    // 課程關聯
    @Column({ type: 'uuid' })
    courseId: string;

    @ManyToOne(() => TrainingCourse, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'courseId' })
    course: TrainingCourse;

    // 完成狀態
    @Column({ type: 'varchar', length: 20, default: 'not_started' })
    status: TrainingStatus;

    // 學習進度 (0-100%)
    @Column({ type: 'int', default: 0 })
    progress: number;

    // 開始學習時間
    @Column({ type: 'timestamp', nullable: true })
    startedAt?: Date;

    // 完成時間
    @Column({ type: 'timestamp', nullable: true })
    completedAt?: Date;

    // 測驗分數 (如果有的話)
    @Column({ type: 'int', nullable: true })
    quizScore?: number;

    // 證書編號
    @Column({ type: 'varchar', length: 50, nullable: true })
    certificateNumber?: string;

    // 時間戳記
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
