import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StructuralAssessment, SafetyLevel } from './entities/structural-assessment.entity';
import { CreateStructuralAssessmentDto, UpdateAssessmentDto } from './dto/structural-assessment.dto';

@Injectable()
export class StructuralAssessmentService {
    constructor(
        @InjectRepository(StructuralAssessment)
        private assessmentRepo: Repository<StructuralAssessment>,
    ) {}

    async create(dto: CreateStructuralAssessmentDto, userId: string): Promise<StructuralAssessment> {
        const assessment = new StructuralAssessment();
        Object.assign(assessment, {
            ...dto,
            accessPoints: dto.accessPoints ? JSON.stringify(dto.accessPoints) : undefined,
            hazards: dto.hazards ? JSON.stringify(dto.hazards) : undefined,
            assessedBy: userId,
        });
        return this.assessmentRepo.save(assessment);
    }

    async findAll(missionSessionId?: string): Promise<StructuralAssessment[]> {
        const where: any = {};
        if (missionSessionId) {
            where.missionSessionId = missionSessionId;
        }
        return this.assessmentRepo.find({
            where,
            order: { assessedAt: 'DESC' },
        });
    }

    async findById(id: string): Promise<StructuralAssessment> {
        const assessment = await this.assessmentRepo.findOne({ where: { id } });
        if (!assessment) {
            throw new NotFoundException(`Assessment ${id} not found`);
        }
        return assessment;
    }

    async findBySafetyLevel(safetyLevel: SafetyLevel): Promise<StructuralAssessment[]> {
        return this.assessmentRepo.find({
            where: { safetyLevel },
            order: { assessedAt: 'DESC' },
        });
    }

    async update(id: string, dto: UpdateAssessmentDto, userId: string): Promise<StructuralAssessment> {
        const assessment = await this.findById(id);
        Object.assign(assessment, dto);
        return this.assessmentRepo.save(assessment);
    }

    async updateRescueCount(id: string, rescued: number): Promise<StructuralAssessment> {
        const assessment = await this.findById(id);
        assessment.rescued = rescued;
        return this.assessmentRepo.save(assessment);
    }

    async getStatistics(missionSessionId?: string): Promise<{
        total: number;
        bySafetyLevel: Record<string, number>;
        totalTrapped: number;
        totalRescued: number;
    }> {
        const where: any = {};
        if (missionSessionId) {
            where.missionSessionId = missionSessionId;
        }

        const assessments = await this.assessmentRepo.find({ where });

        const bySafetyLevel: Record<string, number> = {
            [SafetyLevel.GREEN]: 0,
            [SafetyLevel.YELLOW]: 0,
            [SafetyLevel.RED]: 0,
            [SafetyLevel.UNKNOWN]: 0,
        };

        let totalTrapped = 0;
        let totalRescued = 0;

        for (const a of assessments) {
            bySafetyLevel[a.safetyLevel]++;
            totalTrapped += a.confirmedTrapped || a.estimatedTrapped;
            totalRescued += a.rescued;
        }

        return {
            total: assessments.length,
            bySafetyLevel,
            totalTrapped,
            totalRescued,
        };
    }
}
