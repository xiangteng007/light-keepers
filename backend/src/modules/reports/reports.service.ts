import { Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportStatus, ReportType, ReportSeverity, ReportSource } from './reports.entity';
import { Task } from '../tasks/entities';
import { ReportDispatcherService } from './report-dispatcher.service';

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
        @Inject(forwardRef(() => ReportDispatcherService))
        private reportDispatcher: ReportDispatcherService,
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

        // Phase 5.1: 當回報被確認時，自動觸發調度
        if (dto.status === 'confirmed') {
            try {
                const task = await this.reportDispatcher.autoDispatch(id);
                if (task) {
                    this.logger.log(`Auto-dispatched task ${task.id} for confirmed report ${id}`);
                }
            } catch (error) {
                this.logger.warn(`Failed to auto-dispatch for report ${id}: ${error.message}`);
            }
        }

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

    // 災情熱點分析 - 使用網格聚合
    async getHotspots(options: {
        gridSizeKm?: number;  // 網格大小（公里）
        minCount?: number;    // 最小回報數
        days?: number;        // 最近天數
    } = {}): Promise<{
        hotspots: Array<{
            gridId: string;
            centerLat: number;
            centerLng: number;
            count: number;
            severity: 'low' | 'medium' | 'high' | 'critical';
            types: Record<string, number>;
            recentReports: Array<{ id: string; title: string; type: string; createdAt: Date }>;
        }>;
        totalReports: number;
        generatedAt: Date;
    }> {
        const gridSizeKm = options.gridSizeKm || 2; // 預設 2km 網格
        const minCount = options.minCount || 2;     // 最少 2 筆回報
        const days = options.days || 7;             // 最近 7 天

        const since = new Date();
        since.setDate(since.getDate() - days);

        // 獲取指定時間範圍內的回報
        const reports = await this.reportsRepository
            .createQueryBuilder('report')
            .where('report.createdAt >= :since', { since })
            .andWhere('report.latitude IS NOT NULL')
            .andWhere('report.longitude IS NOT NULL')
            .orderBy('report.createdAt', 'DESC')
            .getMany();

        // 網格聚合
        // 1 度約 111 km，所以 gridSizeKm / 111 = 網格大小（度）
        const gridSizeDeg = gridSizeKm / 111;

        const grids: Map<string, {
            reports: Report[];
            minLat: number;
            maxLat: number;
            minLng: number;
            maxLng: number;
        }> = new Map();

        for (const report of reports) {
            const lat = Number(report.latitude);
            const lng = Number(report.longitude);

            // 計算網格 ID
            const gridX = Math.floor(lng / gridSizeDeg);
            const gridY = Math.floor(lat / gridSizeDeg);
            const gridId = `${gridX}_${gridY}`;

            if (!grids.has(gridId)) {
                grids.set(gridId, {
                    reports: [],
                    minLat: gridY * gridSizeDeg,
                    maxLat: (gridY + 1) * gridSizeDeg,
                    minLng: gridX * gridSizeDeg,
                    maxLng: (gridX + 1) * gridSizeDeg,
                });
            }

            grids.get(gridId)!.reports.push(report);
        }

        // 過濾並轉換為熱點
        const hotspots = Array.from(grids.entries())
            .filter(([, data]) => data.reports.length >= minCount)
            .map(([gridId, data]) => {
                const count = data.reports.length;

                // 計算中心點
                const centerLat = (data.minLat + data.maxLat) / 2;
                const centerLng = (data.minLng + data.maxLng) / 2;

                // 統計類型
                const types: Record<string, number> = {};
                for (const r of data.reports) {
                    types[r.type] = (types[r.type] || 0) + 1;
                }

                // 計算嚴重程度
                let severity: 'low' | 'medium' | 'high' | 'critical';
                const hasCritical = data.reports.some(r => r.severity === 'critical');
                const hasHigh = data.reports.some(r => r.severity === 'high');

                if (hasCritical || count >= 10) {
                    severity = 'critical';
                } else if (hasHigh || count >= 5) {
                    severity = 'high';
                } else if (count >= 3) {
                    severity = 'medium';
                } else {
                    severity = 'low';
                }

                // 最近回報
                const recentReports = data.reports.slice(0, 5).map(r => ({
                    id: r.id,
                    title: r.title,
                    type: r.type,
                    createdAt: r.createdAt,
                }));

                return {
                    gridId,
                    centerLat,
                    centerLng,
                    count,
                    severity,
                    types,
                    recentReports,
                };
            })
            .sort((a, b) => b.count - a.count); // 按數量排序

        return {
            hotspots,
            totalReports: reports.length,
            generatedAt: new Date(),
        };
    }

    // 回報趨勢數據（按天統計）
    async getTrendData(days: number = 7): Promise<{
        labels: string[];
        datasets: { label: string; data: number[] }[];
    }> {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const reports = await this.reportsRepository
            .createQueryBuilder('report')
            .where('report.createdAt >= :since', { since })
            .orderBy('report.createdAt', 'ASC')
            .getMany();

        // 生成日期標籤
        const labels: string[] = [];
        const dateMap = new Map<string, { total: number; byType: Record<string, number> }>();

        for (let i = 0; i < days; i++) {
            const date = new Date(since);
            date.setDate(since.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            labels.push(dateStr.slice(5)); // MM-DD
            dateMap.set(dateStr, { total: 0, byType: {} });
        }

        // 統計每日回報
        for (const report of reports) {
            const dateStr = report.createdAt.toISOString().split('T')[0];
            const entry = dateMap.get(dateStr);
            if (entry) {
                entry.total++;
                entry.byType[report.type] = (entry.byType[report.type] || 0) + 1;
            }
        }

        // 組合數據集
        const totals = Array.from(dateMap.values()).map(e => e.total);

        return {
            labels,
            datasets: [
                { label: '回報數量', data: totals },
            ],
        };
    }

    // 區域分佈統計
    async getRegionStats(days: number = 30): Promise<{
        regions: string[];
        values: number[];
    }> {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const results = await this.reportsRepository
            .createQueryBuilder('report')
            .select('report.address', 'region')
            .addSelect('COUNT(*)', 'count')
            .where('report.createdAt >= :since', { since })
            .andWhere('report.address IS NOT NULL')
            .groupBy('report.address')
            .orderBy('count', 'DESC')
            .limit(10)
            .getRawMany();

        // 簡化區域名稱（取縣市）
        const regionMap = new Map<string, number>();
        for (const r of results) {
            // 提取縣市名稱
            const match = r.region?.match(/(.*?[市縣])/);
            const region = match ? match[1] : r.region?.substring(0, 6) || '未知';
            regionMap.set(region, (regionMap.get(region) || 0) + parseInt(r.count, 10));
        }

        const sorted = Array.from(regionMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        return {
            regions: sorted.map(([r]) => r),
            values: sorted.map(([, v]) => v),
        };
    }

    // 時段分佈統計
    async getHourlyStats(days: number = 7): Promise<{
        hours: number[];
        values: number[];
    }> {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const reports = await this.reportsRepository
            .createQueryBuilder('report')
            .where('report.createdAt >= :since', { since })
            .getMany();

        // 統計每小時回報數
        const hourCounts = new Array(24).fill(0);
        for (const report of reports) {
            const hour = new Date(report.createdAt).getHours();
            hourCounts[hour]++;
        }

        return {
            hours: Array.from({ length: 24 }, (_, i) => i),
            values: hourCounts,
        };
    }
}

