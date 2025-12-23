import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrainingCourse, CourseCategory, CourseLevel } from './training-courses.entity';
import { VolunteerTraining, TrainingStatus } from './volunteer-training.entity';

export interface CreateCourseDto {
    title: string;
    description: string;
    category: CourseCategory;
    level?: CourseLevel;
    durationMinutes: number;
    content: string;
    coverImage?: string;
    isRequired?: boolean;
    sortOrder?: number;
}

@Injectable()
export class TrainingService {
    private readonly logger = new Logger(TrainingService.name);

    constructor(
        @InjectRepository(TrainingCourse)
        private coursesRepository: Repository<TrainingCourse>,
        @InjectRepository(VolunteerTraining)
        private trainingRepository: Repository<VolunteerTraining>,
    ) { }

    // 課程管理
    async createCourse(dto: CreateCourseDto): Promise<TrainingCourse> {
        const course = this.coursesRepository.create(dto);
        const saved = await this.coursesRepository.save(course);
        this.logger.log(`Course created: ${saved.id} - ${saved.title}`);
        return saved;
    }

    async getAllCourses(): Promise<TrainingCourse[]> {
        return this.coursesRepository.find({
            where: { isActive: true },
            order: { sortOrder: 'ASC', createdAt: 'DESC' },
        });
    }

    async getCourseById(id: string): Promise<TrainingCourse> {
        const course = await this.coursesRepository.findOne({ where: { id } });
        if (!course) {
            throw new NotFoundException(`Course ${id} not found`);
        }
        return course;
    }

    async getRequiredCourses(): Promise<TrainingCourse[]> {
        return this.coursesRepository.find({
            where: { isRequired: true, isActive: true },
            order: { sortOrder: 'ASC' },
        });
    }

    // 志工培訓進度
    async enrollVolunteer(volunteerId: string, courseId: string): Promise<VolunteerTraining> {
        // 檢查是否已註冊
        const existing = await this.trainingRepository.findOne({
            where: { volunteerId, courseId },
        });
        if (existing) {
            return existing;
        }

        const training = this.trainingRepository.create({
            volunteerId,
            courseId,
            status: 'not_started',
            progress: 0,
        });
        return this.trainingRepository.save(training);
    }

    async startCourse(volunteerId: string, courseId: string): Promise<VolunteerTraining> {
        let training = await this.trainingRepository.findOne({
            where: { volunteerId, courseId },
        });

        if (!training) {
            training = await this.enrollVolunteer(volunteerId, courseId);
        }

        training.status = 'in_progress';
        training.startedAt = new Date();
        return this.trainingRepository.save(training);
    }

    async updateProgress(volunteerId: string, courseId: string, progress: number): Promise<VolunteerTraining> {
        const training = await this.trainingRepository.findOne({
            where: { volunteerId, courseId },
        });

        if (!training) {
            throw new NotFoundException('Training record not found');
        }

        training.progress = Math.min(100, Math.max(0, progress));

        if (training.progress >= 100) {
            training.status = 'completed';
            training.completedAt = new Date();
            training.certificateNumber = `CERT-${Date.now()}-${volunteerId.slice(0, 4)}`;
        }

        return this.trainingRepository.save(training);
    }

    async getVolunteerTraining(volunteerId: string): Promise<VolunteerTraining[]> {
        return this.trainingRepository.find({
            where: { volunteerId },
            relations: ['course'],
            order: { createdAt: 'DESC' },
        });
    }

    async getVolunteerStats(volunteerId: string): Promise<{
        totalCourses: number;
        completed: number;
        inProgress: number;
        requiredCompleted: number;
        requiredTotal: number;
    }> {
        const trainings = await this.trainingRepository.find({
            where: { volunteerId },
            relations: ['course'],
        });

        const requiredCourses = await this.getRequiredCourses();
        const completedRequired = trainings.filter(
            t => t.status === 'completed' && t.course?.isRequired
        ).length;

        return {
            totalCourses: trainings.length,
            completed: trainings.filter(t => t.status === 'completed').length,
            inProgress: trainings.filter(t => t.status === 'in_progress').length,
            requiredCompleted: completedRequired,
            requiredTotal: requiredCourses.length,
        };
    }

    // 課程統計
    async getCourseStats(): Promise<{
        totalCourses: number;
        totalEnrollments: number;
        totalCompletions: number;
    }> {
        const courses = await this.coursesRepository.find({ where: { isActive: true } });
        const trainings = await this.trainingRepository.find();

        return {
            totalCourses: courses.length,
            totalEnrollments: trainings.length,
            totalCompletions: trainings.filter(t => t.status === 'completed').length,
        };
    }
}
