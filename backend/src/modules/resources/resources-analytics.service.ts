import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Resource, ResourceCategory } from './resources.entity';
import { ResourceTransaction } from './resource-transaction.entity';

export interface TrendDataPoint {
    date: string;
    inbound: number;
    outbound: number;
    netChange: number;
}

export interface CategoryDistribution {
    category: string;
    count: number;
    totalQuantity: number;
    lowStockCount: number;
}

export interface LowStockAlert {
    id: string;
    name: string;
    category: ResourceCategory;
    quantity: number;
    minQuantity: number;
    status: string;
    percentRemaining: number;
}

@Injectable()
export class ResourcesAnalyticsService {
    private readonly logger = new Logger(ResourcesAnalyticsService.name);

    constructor(
        @InjectRepository(Resource)
        private readonly resourceRepo: Repository<Resource>,
        @InjectRepository(ResourceTransaction)
        private readonly transactionRepo: Repository<ResourceTransaction>,
    ) { }

    /**
     * 取得庫存趨勢數據 (過去 N 天的進出庫統計)
     */
    async getInventoryTrend(days: number = 30): Promise<{
        trend: TrendDataPoint[];
        summary: {
            totalInbound: number;
            totalOutbound: number;
            netChange: number;
        };
    }> {
        const since = new Date();
        since.setDate(since.getDate() - days);
        since.setHours(0, 0, 0, 0);

        const transactions = await this.transactionRepo
            .createQueryBuilder('tx')
            .where('tx.createdAt >= :since', { since })
            .orderBy('tx.createdAt', 'ASC')
            .getMany();

        // 按日期聚合
        const dailyMap = new Map<string, { inbound: number; outbound: number }>();

        // 初始化所有日期
        for (let i = 0; i < days; i++) {
            const date = new Date(since);
            date.setDate(since.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            dailyMap.set(dateStr, { inbound: 0, outbound: 0 });
        }

        // 統計交易
        for (const tx of transactions) {
            const dateStr = tx.createdAt.toISOString().split('T')[0];
            const day = dailyMap.get(dateStr);
            if (day) {
                if (tx.type === 'in' || tx.type === 'donate') {
                    day.inbound += tx.quantity;
                } else if (tx.type === 'out' || tx.type === 'expired') {
                    day.outbound += tx.quantity;
                }
            }
        }

        // 轉換為陣列
        const trend: TrendDataPoint[] = [];
        let totalInbound = 0;
        let totalOutbound = 0;

        for (const [date, data] of dailyMap.entries()) {
            totalInbound += data.inbound;
            totalOutbound += data.outbound;
            trend.push({
                date,
                inbound: data.inbound,
                outbound: data.outbound,
                netChange: data.inbound - data.outbound,
            });
        }

        return {
            trend,
            summary: {
                totalInbound,
                totalOutbound,
                netChange: totalInbound - totalOutbound,
            },
        };
    }

    /**
     * 取得各類別庫存分佈
     */
    async getCategoryDistribution(): Promise<CategoryDistribution[]> {
        const resources = await this.resourceRepo.find();

        const categoryMap = new Map<string, {
            count: number;
            totalQuantity: number;
            lowStockCount: number;
        }>();

        for (const r of resources) {
            const existing = categoryMap.get(r.category) || {
                count: 0,
                totalQuantity: 0,
                lowStockCount: 0,
            };
            existing.count++;
            existing.totalQuantity += r.quantity;
            if (r.status === 'low' || r.status === 'depleted') {
                existing.lowStockCount++;
            }
            categoryMap.set(r.category, existing);
        }

        return Array.from(categoryMap.entries()).map(([category, data]) => ({
            category,
            ...data,
        }));
    }

    /**
     * 取得低庫存預警清單
     */
    async getLowStockAlerts(): Promise<LowStockAlert[]> {
        const resources = await this.resourceRepo.find({
            where: [{ status: 'low' }, { status: 'depleted' }],
            order: { quantity: 'ASC' },
        });

        return resources.map(r => ({
            id: r.id,
            name: r.name,
            category: r.category,
            quantity: r.quantity,
            minQuantity: r.minQuantity,
            status: r.status,
            percentRemaining: r.minQuantity > 0
                ? Math.round((r.quantity / r.minQuantity) * 100)
                : r.quantity > 0 ? 100 : 0,
        }));
    }

    /**
     * 取得即將過期物資清單
     */
    async getExpiringItems(days: number = 30): Promise<{
        items: Array<{
            id: string;
            name: string;
            category: string;
            quantity: number;
            expiresAt: Date;
            daysUntilExpiry: number;
        }>;
        count: number;
    }> {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        const resources = await this.resourceRepo.find({
            where: {
                expiresAt: LessThanOrEqual(futureDate),
            },
            order: { expiresAt: 'ASC' },
        });

        const now = new Date();
        const items = resources.map(r => ({
            id: r.id,
            name: r.name,
            category: r.category,
            quantity: r.quantity,
            expiresAt: r.expiresAt!,
            daysUntilExpiry: Math.ceil((r.expiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        }));

        return {
            items,
            count: items.length,
        };
    }

    /**
     * 取得完整分析摘要
     */
    async getAnalyticsSummary(days: number = 30): Promise<{
        trend: TrendDataPoint[];
        trendSummary: { totalInbound: number; totalOutbound: number; netChange: number };
        categories: CategoryDistribution[];
        lowStockAlerts: LowStockAlert[];
        expiring: { count: number; items: any[] };
        generatedAt: Date;
    }> {
        const [trendData, categories, lowStockAlerts, expiring] = await Promise.all([
            this.getInventoryTrend(days),
            this.getCategoryDistribution(),
            this.getLowStockAlerts(),
            this.getExpiringItems(days),
        ]);

        return {
            trend: trendData.trend,
            trendSummary: trendData.summary,
            categories,
            lowStockAlerts,
            expiring,
            generatedAt: new Date(),
        };
    }
}
