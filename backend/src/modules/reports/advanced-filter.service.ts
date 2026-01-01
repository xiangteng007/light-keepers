import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, In, SelectQueryBuilder } from 'typeorm';
import { Report, ReportStatus, ReportType, ReportSeverity } from '../reports/reports.entity';

export interface AdvancedReportFilter {
    // 基本篩選
    status?: ReportStatus | ReportStatus[];
    type?: ReportType | ReportType[];
    severity?: ReportSeverity | ReportSeverity[];

    // 日期範圍
    startDate?: Date;
    endDate?: Date;

    // 關鍵字搜尋
    keyword?: string;

    // 地理篩選
    region?: string;
    adminCode?: string;
    bounds?: {
        north: number;
        south: number;
        east: number;
        west: number;
    };

    // 分頁
    page?: number;
    pageSize?: number;

    // 排序
    sortBy?: 'createdAt' | 'severity' | 'type' | 'status';
    sortOrder?: 'ASC' | 'DESC';

    // 聚合選項
    groupBy?: 'day' | 'week' | 'month' | 'type' | 'status' | 'region';
}

export interface FilteredReportResult {
    data: Report[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    filters: AdvancedReportFilter;
}

export interface AggregatedResult {
    key: string;
    count: number;
    avgSeverity?: number;
    latestAt?: Date;
}

@Injectable()
export class AdvancedFilterService {
    private readonly logger = new Logger(AdvancedFilterService.name);

    constructor(
        @InjectRepository(Report)
        private readonly reportRepo: Repository<Report>,
    ) { }

    // ===== 進階篩選查詢 =====

    async filterReports(filter: AdvancedReportFilter): Promise<FilteredReportResult> {
        const query = this.reportRepo.createQueryBuilder('r');

        // 套用篩選條件
        this.applyFilters(query, filter);

        // 排序
        const sortBy = filter.sortBy || 'createdAt';
        const sortOrder = filter.sortOrder || 'DESC';
        query.orderBy(`r.${sortBy}`, sortOrder);

        // 分頁
        const page = filter.page || 1;
        const pageSize = filter.pageSize || 20;
        const skip = (page - 1) * pageSize;

        // 取得總數和資料
        const [data, total] = await query
            .skip(skip)
            .take(pageSize)
            .getManyAndCount();

        return {
            data,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
            filters: filter,
        };
    }

    // ===== 聚合查詢 =====

    async aggregateReports(
        filter: AdvancedReportFilter,
        groupBy: 'day' | 'week' | 'month' | 'type' | 'status' | 'region',
    ): Promise<AggregatedResult[]> {
        const query = this.reportRepo.createQueryBuilder('r');

        // 套用篩選條件
        this.applyFilters(query, filter);

        // 根據分組方式設定
        let groupExpr: string;
        let selectExpr: string;

        switch (groupBy) {
            case 'day':
                groupExpr = "DATE_TRUNC('day', r.createdAt)";
                selectExpr = "TO_CHAR(DATE_TRUNC('day', r.createdAt), 'YYYY-MM-DD')";
                break;
            case 'week':
                groupExpr = "DATE_TRUNC('week', r.createdAt)";
                selectExpr = "TO_CHAR(DATE_TRUNC('week', r.createdAt), 'YYYY-MM-DD')";
                break;
            case 'month':
                groupExpr = "DATE_TRUNC('month', r.createdAt)";
                selectExpr = "TO_CHAR(DATE_TRUNC('month', r.createdAt), 'YYYY-MM')";
                break;
            case 'type':
                groupExpr = 'r.type';
                selectExpr = 'r.type';
                break;
            case 'status':
                groupExpr = 'r.status';
                selectExpr = 'r.status';
                break;
            case 'region':
                groupExpr = 'r.adminCode';
                selectExpr = 'r.adminCode';
                break;
            default:
                groupExpr = 'r.type';
                selectExpr = 'r.type';
        }

        const results = await query
            .select(selectExpr, 'key')
            .addSelect('COUNT(*)', 'count')
            .addSelect('AVG(r.severity)', 'avgSeverity')
            .addSelect('MAX(r.createdAt)', 'latestAt')
            .groupBy(groupExpr)
            .orderBy('count', 'DESC')
            .getRawMany();

        return results.map(r => ({
            key: r.key || 'unknown',
            count: parseInt(r.count, 10),
            avgSeverity: r.avgSeverity ? parseFloat(r.avgSeverity) : undefined,
            latestAt: r.latestAt ? new Date(r.latestAt) : undefined,
        }));
    }

    // ===== 時間序列分析 =====

    async getTimeSeries(
        filter: AdvancedReportFilter,
        interval: 'hour' | 'day' | 'week' | 'month' = 'day',
    ): Promise<{ timestamp: string; count: number }[]> {
        const query = this.reportRepo.createQueryBuilder('r');
        this.applyFilters(query, filter);

        let truncExpr: string;
        let formatExpr: string;

        switch (interval) {
            case 'hour':
                truncExpr = "DATE_TRUNC('hour', r.createdAt)";
                formatExpr = "TO_CHAR(DATE_TRUNC('hour', r.createdAt), 'YYYY-MM-DD HH24:00')";
                break;
            case 'week':
                truncExpr = "DATE_TRUNC('week', r.createdAt)";
                formatExpr = "TO_CHAR(DATE_TRUNC('week', r.createdAt), 'YYYY-MM-DD')";
                break;
            case 'month':
                truncExpr = "DATE_TRUNC('month', r.createdAt)";
                formatExpr = "TO_CHAR(DATE_TRUNC('month', r.createdAt), 'YYYY-MM')";
                break;
            case 'day':
            default:
                truncExpr = "DATE_TRUNC('day', r.createdAt)";
                formatExpr = "TO_CHAR(DATE_TRUNC('day', r.createdAt), 'YYYY-MM-DD')";
        }

        const results = await query
            .select(formatExpr, 'timestamp')
            .addSelect('COUNT(*)', 'count')
            .groupBy(truncExpr)
            .orderBy(truncExpr, 'ASC')
            .getRawMany();

        return results.map(r => ({
            timestamp: r.timestamp,
            count: parseInt(r.count, 10),
        }));
    }

    // ===== 交叉分析 =====

    async getCrossAnalysis(
        filter: AdvancedReportFilter,
        dimension1: 'type' | 'status' | 'severity',
        dimension2: 'type' | 'status' | 'severity',
    ): Promise<{ [key: string]: { [key: string]: number } }> {
        const query = this.reportRepo.createQueryBuilder('r');
        this.applyFilters(query, filter);

        const results = await query
            .select(`r.${dimension1}`, 'dim1')
            .addSelect(`r.${dimension2}`, 'dim2')
            .addSelect('COUNT(*)', 'count')
            .groupBy(`r.${dimension1}`)
            .addGroupBy(`r.${dimension2}`)
            .getRawMany();

        // 轉換為交叉表格式
        const crossTable: { [key: string]: { [key: string]: number } } = {};

        for (const r of results) {
            const key1 = r.dim1?.toString() || 'unknown';
            const key2 = r.dim2?.toString() || 'unknown';

            if (!crossTable[key1]) {
                crossTable[key1] = {};
            }
            crossTable[key1][key2] = parseInt(r.count, 10);
        }

        return crossTable;
    }

    // ===== 輔助方法：套用篩選條件 =====

    private applyFilters(query: SelectQueryBuilder<Report>, filter: AdvancedReportFilter): void {
        // 狀態篩選
        if (filter.status) {
            if (Array.isArray(filter.status)) {
                query.andWhere('r.status IN (:...statuses)', { statuses: filter.status });
            } else {
                query.andWhere('r.status = :status', { status: filter.status });
            }
        }

        // 類型篩選
        if (filter.type) {
            if (Array.isArray(filter.type)) {
                query.andWhere('r.type IN (:...types)', { types: filter.type });
            } else {
                query.andWhere('r.type = :type', { type: filter.type });
            }
        }

        // 嚴重程度篩選
        if (filter.severity) {
            if (Array.isArray(filter.severity)) {
                query.andWhere('r.severity IN (:...severities)', { severities: filter.severity });
            } else {
                query.andWhere('r.severity = :severity', { severity: filter.severity });
            }
        }

        // 日期範圍
        if (filter.startDate) {
            query.andWhere('r.createdAt >= :startDate', { startDate: filter.startDate });
        }
        if (filter.endDate) {
            query.andWhere('r.createdAt <= :endDate', { endDate: filter.endDate });
        }

        // 關鍵字搜尋
        if (filter.keyword) {
            query.andWhere(
                '(r.title ILIKE :keyword OR r.description ILIKE :keyword OR r.address ILIKE :keyword)',
                { keyword: `%${filter.keyword}%` },
            );
        }

        // 區域篩選
        if (filter.region) {
            query.andWhere('r.address ILIKE :region', { region: `%${filter.region}%` });
        }

        if (filter.adminCode) {
            query.andWhere('r.adminCode = :adminCode', { adminCode: filter.adminCode });
        }

        // 地理邊界篩選
        if (filter.bounds) {
            query.andWhere('r.latitude BETWEEN :south AND :north', {
                south: filter.bounds.south,
                north: filter.bounds.north,
            });
            query.andWhere('r.longitude BETWEEN :west AND :east', {
                west: filter.bounds.west,
                east: filter.bounds.east,
            });
        }
    }

    // ===== 取得可用的篩選選項 =====

    async getFilterOptions(): Promise<{
        types: { value: string; label: string; count: number }[];
        statuses: { value: string; label: string; count: number }[];
        severities: { value: number; label: string; count: number }[];
        regions: { value: string; count: number }[];
    }> {
        const [types, statuses, severities, regions] = await Promise.all([
            this.reportRepo
                .createQueryBuilder('r')
                .select('r.type', 'value')
                .addSelect('COUNT(*)', 'count')
                .groupBy('r.type')
                .orderBy('count', 'DESC')
                .getRawMany(),
            this.reportRepo
                .createQueryBuilder('r')
                .select('r.status', 'value')
                .addSelect('COUNT(*)', 'count')
                .groupBy('r.status')
                .orderBy('count', 'DESC')
                .getRawMany(),
            this.reportRepo
                .createQueryBuilder('r')
                .select('r.severity', 'value')
                .addSelect('COUNT(*)', 'count')
                .where('r.severity IS NOT NULL')
                .groupBy('r.severity')
                .orderBy('r.severity', 'ASC')
                .getRawMany(),
            this.reportRepo
                .createQueryBuilder('r')
                .select('r.adminCode', 'value')
                .addSelect('COUNT(*)', 'count')
                .where('r.adminCode IS NOT NULL')
                .groupBy('r.adminCode')
                .orderBy('count', 'DESC')
                .limit(20)
                .getRawMany(),
        ]);

        const typeLabels: Record<string, string> = {
            flood: '淹水',
            debris: '土石流',
            fire: '火災',
            accident: '事故',
            other: '其他',
        };

        const statusLabels: Record<string, string> = {
            pending: '待審核',
            confirmed: '已確認',
            rejected: '已拒絕',
            resolved: '已處理',
        };

        const severityLabels: Record<number, string> = {
            1: '輕微',
            2: '中等',
            3: '嚴重',
            4: '危急',
        };

        return {
            types: types.map(t => ({
                value: t.value,
                label: typeLabels[t.value] || t.value,
                count: parseInt(t.count, 10),
            })),
            statuses: statuses.map(s => ({
                value: s.value,
                label: statusLabels[s.value] || s.value,
                count: parseInt(s.count, 10),
            })),
            severities: severities.map(s => ({
                value: parseInt(s.value, 10),
                label: severityLabels[parseInt(s.value, 10)] || `等級 ${s.value}`,
                count: parseInt(s.count, 10),
            })),
            regions: regions.map(r => ({
                value: r.value,
                count: parseInt(r.count, 10),
            })),
        };
    }
}
