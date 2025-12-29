import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportStatus, ReportType, ReportSeverity, ReportSource } from './reports.entity';
import { Task } from '../tasks/entities';

export interface CreateReportDto {
    type: ReportType;
    severity?: ReportSeverity;
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    address?: string;
    photos?: string[];
    contactName?: string;
    contactPhone?: string;
    // 來源追蹤
    source?: ReportSource;
    reporterLineUserId?: string;
    reporterLineDisplayName?: string;
}

export interface ReviewReportDto {
    status: 'confirmed' | 'rejected';
    reviewedBy: string;
    reviewNote?: string;
}

export interface ReportFilter {
    status?: ReportStatus;
    type?: ReportType;
    severity?: ReportSeverity;
    limit?: number;
    offset?: number;
}

@Injectable()
export class ReportsService {
    private readonly logger = new Logger(ReportsService.name);

    constructor(
        @InjectRepository(Report)
        private reportsRepository: Repository<Report>,
        @InjectRepository(Task)
        private taskRepository: Repository<Task>,
    ) { }

    // 建立新回報
    async create(dto: CreateReportDto): Promise<Report> {
        const report = this.reportsRepository.create({
            ...dto,
            status: 'pending',
            severity: dto.severity || 'medium',
            source: dto.source || 'web',
        });

        const saved = await this.reportsRepository.save(report);
        this.logger.log(`New report created: ${saved.id} - ${saved.title} [source: ${saved.source}]`);
        return saved;
    }

    // 取得所有回報
    async findAll(filter: ReportFilter = {}): Promise<Report[]> {
        const query = this.reportsRepository.createQueryBuilder('report');

        if (filter.status) {
            query.andWhere('report.status = :status', { status: filter.status });
        }

        if (filter.type) {
            query.andWhere('report.type = :type', { type: filter.type });
        }

        if (filter.severity) {
            query.andWhere('report.severity = :severity', { severity: filter.severity });
        }

        query.orderBy('report.createdAt', 'DESC');

        if (filter.limit) {
            query.take(filter.limit);
        }

        if (filter.offset) {
            query.skip(filter.offset);
        }

        return query.getMany();
    }

    // 取得單一回報
    async findOne(id: string): Promise<Report> {
        const report = await this.reportsRepository.findOne({ where: { id } });
        if (!report) {
            throw new NotFoundException(`Report ${id} not found`);
        }
        return report;
    }

    // 取得地圖用回報 (confirmed + pending)
    async findForMap(): Promise<Report[]> {
        return this.reportsRepository.find({
            where: [
                { status: 'confirmed' },
                { status: 'pending' },
            ],
            order: { createdAt: 'DESC' },
            take: 100,
        });
    }

    // 審核回報
    async review(id: string, dto: ReviewReportDto): Promise<Report> {
        const report = await this.findOne(id);

        report.status = dto.status;
        report.reviewedBy = dto.reviewedBy;
        report.reviewedAt = new Date();
        report.reviewNote = dto.reviewNote;

        const updated = await this.reportsRepository.save(report);
        this.logger.log(`Report ${id} reviewed: ${dto.status} by ${dto.reviewedBy}`);
        return updated;
    }

    // 取得統計
    async getStats(): Promise<{
        total: number;
        pending: number;
        confirmed: number;
        rejected: number;
        byType: Record<string, number>;
    }> {
        const reports = await this.reportsRepository.find();

        const byType: Record<string, number> = {};
        let pending = 0, confirmed = 0, rejected = 0;

        for (const report of reports) {
            byType[report.type] = (byType[report.type] || 0) + 1;
            if (report.status === 'pending') pending++;
            else if (report.status === 'confirmed') confirmed++;
            else if (report.status === 'rejected') rejected++;
        }

        return {
            total: reports.length,
            pending,
            confirmed,
            rejected,
            byType,
        };
    }

    // 刪除回報及關聯任務
    async delete(id: string): Promise<void> {
        // 先刪除關聯的任務 (以 eventId 關聯)
        const deletedTasks = await this.taskRepository.delete({ eventId: id });
        if (deletedTasks.affected && deletedTasks.affected > 0) {
            this.logger.log(`Deleted ${deletedTasks.affected} orphaned tasks for report ${id}`);
        }

        // 然後刪除回報本身
        const result = await this.reportsRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Report ${id} not found`);
        }
        this.logger.log(`Report ${id} deleted`);
    }
}
