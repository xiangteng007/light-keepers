import { Injectable, Logger } from '@nestjs/common';

/**
 * OCHA 3W Matrix 資料結構
 */
export interface ThreeWRecord {
    id: string;
    who: {
        organization: string;
        organizationType: 'UN' | 'INGO' | 'NNGO' | 'Government' | 'Other';
        cluster: string;
        leadAgency?: string;
    };
    what: {
        activity: string;
        activityType: string;
        sector: string;
        subSector?: string;
        indicator?: string;
        targetValue?: number;
        achievedValue?: number;
    };
    where: {
        country: string;
        admin1: string;
        admin2?: string;
        admin3?: string;
        location?: string;
        pcode?: string;
        coordinates?: { lat: number; lng: number };
    };
    when: {
        startDate: Date;
        endDate?: Date;
        reportingPeriod: string;
    };
    beneficiaries?: {
        targeted: number;
        reached: number;
        categories?: Record<string, number>;
    };
    status: 'planned' | 'ongoing' | 'completed' | 'suspended';
    notes?: string;
}

export interface ClusterReport {
    cluster: string;
    organizations: string[];
    activities: number;
    beneficiariesReached: number;
    locations: string[];
    status: {
        planned: number;
        ongoing: number;
        completed: number;
    };
}

/**
 * OCHA Integration Service
 * 
 * 提供 OCHA 標準整合：
 * - 3W (Who-What-Where) Matrix
 * - Cluster 協調報告
 * - 人道主義需求評估
 */
@Injectable()
export class OchaIntegrationService {
    private readonly logger = new Logger(OchaIntegrationService.name);
    private records: Map<string, ThreeWRecord> = new Map();

    /**
     * 新增 3W 記錄
     */
    add3WRecord(data: Omit<ThreeWRecord, 'id'>): ThreeWRecord {
        const record: ThreeWRecord = {
            ...data,
            id: `3w-${Date.now()}`,
        };
        this.records.set(record.id, record);
        return record;
    }

    /**
     * 更新 3W 記錄
     */
    update3WRecord(id: string, updates: Partial<ThreeWRecord>): ThreeWRecord | null {
        const record = this.records.get(id);
        if (!record) return null;

        const updated = { ...record, ...updates };
        this.records.set(id, updated);
        return updated;
    }

    /**
     * 取得所有 3W 記錄
     */
    getAll3WRecords(): ThreeWRecord[] {
        return Array.from(this.records.values());
    }

    /**
     * 依 Cluster 取得記錄
     */
    getByCluster(cluster: string): ThreeWRecord[] {
        return this.getAll3WRecords().filter(r => r.who.cluster === cluster);
    }

    /**
     * 依區域取得記錄
     */
    getByLocation(admin1: string, admin2?: string): ThreeWRecord[] {
        return this.getAll3WRecords().filter(r => {
            if (r.where.admin1 !== admin1) return false;
            if (admin2 && r.where.admin2 !== admin2) return false;
            return true;
        });
    }

    /**
     * 生成 Cluster 報告
     */
    generateClusterReport(cluster: string): ClusterReport {
        const records = this.getByCluster(cluster);
        const organizations = new Set<string>();
        const locations = new Set<string>();
        let totalReached = 0;
        const status = { planned: 0, ongoing: 0, completed: 0 };

        for (const r of records) {
            organizations.add(r.who.organization);
            locations.add(r.where.admin1);
            if (r.where.admin2) locations.add(`${r.where.admin1}/${r.where.admin2}`);
            totalReached += r.beneficiaries?.reached || 0;
            
            if (r.status in status) {
                status[r.status as keyof typeof status]++;
            }
        }

        return {
            cluster,
            organizations: Array.from(organizations),
            activities: records.length,
            beneficiariesReached: totalReached,
            locations: Array.from(locations),
            status,
        };
    }

    /**
     * 生成 3W Matrix 摘要
     */
    generate3WMatrix(): any {
        const records = this.getAll3WRecords();
        const clusters = new Set<string>();
        const organizations = new Set<string>();
        const locations = new Set<string>();

        for (const r of records) {
            clusters.add(r.who.cluster);
            organizations.add(r.who.organization);
            locations.add(r.where.admin1);
        }

        return {
            summary: {
                totalRecords: records.length,
                clusters: clusters.size,
                organizations: organizations.size,
                locations: locations.size,
                totalBeneficiariesReached: records.reduce((sum, r) => sum + (r.beneficiaries?.reached || 0), 0),
            },
            byCluster: Array.from(clusters).map(c => this.generateClusterReport(c)),
            generatedAt: new Date(),
        };
    }

    /**
     * 匯入 OCHA 標準資料
     */
    importFromOcha(data: any[]): number {
        let imported = 0;
        for (const item of data) {
            try {
                this.add3WRecord({
                    who: {
                        organization: item.organization || item.org,
                        organizationType: item.org_type || 'Other',
                        cluster: item.cluster || item.sector,
                    },
                    what: {
                        activity: item.activity,
                        activityType: item.activity_type || 'general',
                        sector: item.sector,
                    },
                    where: {
                        country: item.country || 'Taiwan',
                        admin1: item.admin1 || item.county,
                        admin2: item.admin2 || item.district,
                        location: item.location,
                    },
                    when: {
                        startDate: new Date(item.start_date || Date.now()),
                        endDate: item.end_date ? new Date(item.end_date) : undefined,
                        reportingPeriod: item.reporting_period || 'monthly',
                    },
                    beneficiaries: {
                        targeted: item.targeted || 0,
                        reached: item.reached || 0,
                    },
                    status: item.status || 'ongoing',
                });
                imported++;
            } catch (error) {
                this.logger.warn(`Failed to import record: ${error}`);
            }
        }
        return imported;
    }
}
