/**
 * Donor Reporting Service
 * 
 * Grant management and donor reporting for NGO transparency
 */
import { Injectable, Logger } from '@nestjs/common';

export enum GrantStatus {
    SUBMITTED = 'submitted',
    APPROVED = 'approved',
    ACTIVE = 'active',
    REPORTING = 'reporting',
    COMPLETED = 'completed',
    CLOSED = 'closed',
}

export enum FundingType {
    GOVERNMENT = 'government',
    FOUNDATION = 'foundation',
    CORPORATE = 'corporate',
    INDIVIDUAL = 'individual',
    MULTILATERAL = 'multilateral',
    BILATERAL = 'bilateral',
}

export interface Grant {
    id: string;
    donorName: string;
    donorType: FundingType;
    grantCode: string;
    title: string;
    description: string;
    amount: number;
    currency: string;
    status: GrantStatus;
    startDate: Date;
    endDate: Date;
    reportingFrequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
    nextReportDue?: Date;
    contactPerson: string;
    projectIds: string[];
}

export interface Expenditure {
    id: string;
    grantId: string;
    date: Date;
    category: string;
    description: string;
    amount: number;
    currency: string;
    receipt?: string;
    approvedBy?: string;
}

export interface ImpactMetric {
    id: string;
    grantId: string;
    metricName: string;
    targetValue: number;
    actualValue: number;
    unit: string;
    reportingPeriod: { start: Date; end: Date };
    notes?: string;
}

export interface DonorReport {
    id: string;
    grantId: string;
    reportType: 'narrative' | 'financial' | 'combined';
    period: { start: Date; end: Date };
    generatedAt: Date;
    status: 'draft' | 'review' | 'submitted' | 'accepted';
    sections: {
        executive_summary?: string;
        activities?: string;
        outcomes?: string;
        challenges?: string;
        financial_summary?: { category: string; budgeted: number; spent: number }[];
        impact_metrics?: ImpactMetric[];
    };
}

@Injectable()
export class DonorReportingService {
    private readonly logger = new Logger(DonorReportingService.name);

    // In-memory storage (production: use database)
    private readonly grants = new Map<string, Grant>();
    private readonly expenditures: Expenditure[] = [];
    private readonly metrics: ImpactMetric[] = [];
    private readonly reports = new Map<string, DonorReport>();

    /**
     * Register a new grant
     */
    async createGrant(grantData: Omit<Grant, 'id'>): Promise<Grant> {
        const grant: Grant = {
            id: `grant-${Date.now()}`,
            ...grantData,
        };

        this.grants.set(grant.id, grant);
        this.logger.log(`Grant created: ${grant.grantCode} - ${grant.title}`);
        return grant;
    }

    /**
     * Get grant by ID
     */
    async getGrant(grantId: string): Promise<Grant | null> {
        return this.grants.get(grantId) || null;
    }

    /**
     * Get all active grants
     */
    async getActiveGrants(): Promise<Grant[]> {
        return Array.from(this.grants.values())
            .filter(g => g.status === GrantStatus.ACTIVE || g.status === GrantStatus.REPORTING);
    }

    /**
     * Record expenditure against a grant
     */
    async recordExpenditure(
        grantId: string,
        category: string,
        description: string,
        amount: number,
        currency: string,
        approvedBy?: string
    ): Promise<Expenditure> {
        const expenditure: Expenditure = {
            id: `exp-${Date.now()}`,
            grantId,
            date: new Date(),
            category,
            description,
            amount,
            currency,
            approvedBy,
        };

        this.expenditures.push(expenditure);
        this.logger.log(`Expenditure recorded: ${amount} ${currency} for grant ${grantId}`);
        return expenditure;
    }

    /**
     * Get expenditures for a grant
     */
    async getGrantExpenditures(grantId: string): Promise<Expenditure[]> {
        return this.expenditures.filter(e => e.grantId === grantId);
    }

    /**
     * Get budget utilization for a grant
     */
    async getBudgetUtilization(grantId: string): Promise<{
        grant: Grant | null;
        totalBudget: number;
        totalSpent: number;
        utilizationPercent: number;
        byCategory: { category: string; spent: number }[];
    }> {
        const grant = await this.getGrant(grantId);
        if (!grant) return { grant: null, totalBudget: 0, totalSpent: 0, utilizationPercent: 0, byCategory: [] };

        const expenditures = await this.getGrantExpenditures(grantId);
        const totalSpent = expenditures.reduce((sum, e) => sum + e.amount, 0);

        const byCategory = new Map<string, number>();
        for (const exp of expenditures) {
            byCategory.set(exp.category, (byCategory.get(exp.category) || 0) + exp.amount);
        }

        return {
            grant,
            totalBudget: grant.amount,
            totalSpent,
            utilizationPercent: Math.round((totalSpent / grant.amount) * 100),
            byCategory: Array.from(byCategory.entries()).map(([category, spent]) => ({
                category,
                spent,
            })),
        };
    }

    /**
     * Record impact metric
     */
    async recordImpactMetric(
        grantId: string,
        metricName: string,
        targetValue: number,
        actualValue: number,
        unit: string,
        periodStart: Date,
        periodEnd: Date,
        notes?: string
    ): Promise<ImpactMetric> {
        const metric: ImpactMetric = {
            id: `metric-${Date.now()}`,
            grantId,
            metricName,
            targetValue,
            actualValue,
            unit,
            reportingPeriod: { start: periodStart, end: periodEnd },
            notes,
        };

        this.metrics.push(metric);
        return metric;
    }

    /**
     * Get impact metrics for a grant
     */
    async getGrantMetrics(grantId: string): Promise<ImpactMetric[]> {
        return this.metrics.filter(m => m.grantId === grantId);
    }

    /**
     * Generate donor report
     */
    async generateReport(
        grantId: string,
        reportType: 'narrative' | 'financial' | 'combined',
        periodStart: Date,
        periodEnd: Date,
        executiveSummary?: string
    ): Promise<DonorReport> {
        const grant = await this.getGrant(grantId);
        const expenditures = await this.getGrantExpenditures(grantId);
        const metrics = await this.getGrantMetrics(grantId);

        // Filter expenditures by period
        const periodExpenditures = expenditures.filter(
            e => e.date >= periodStart && e.date <= periodEnd
        );

        // Calculate financial summary by category
        const financialSummary = new Map<string, number>();
        for (const exp of periodExpenditures) {
            financialSummary.set(
                exp.category,
                (financialSummary.get(exp.category) || 0) + exp.amount
            );
        }

        const report: DonorReport = {
            id: `report-${Date.now()}`,
            grantId,
            reportType,
            period: { start: periodStart, end: periodEnd },
            generatedAt: new Date(),
            status: 'draft',
            sections: {
                executive_summary: executiveSummary,
                financial_summary: Array.from(financialSummary.entries()).map(([category, spent]) => ({
                    category,
                    budgeted: 0, // Would come from budget allocation
                    spent,
                })),
                impact_metrics: metrics.filter(
                    m => m.reportingPeriod.start >= periodStart && m.reportingPeriod.end <= periodEnd
                ),
            },
        };

        this.reports.set(report.id, report);
        this.logger.log(`Generated ${reportType} report for grant ${grantId}`);
        return report;
    }

    /**
     * Get upcoming report deadlines
     */
    async getUpcomingReportDeadlines(days: number = 30): Promise<{
        grant: Grant;
        dueDate: Date;
        daysRemaining: number;
    }[]> {
        const now = new Date();
        const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        return Array.from(this.grants.values())
            .filter(g => g.nextReportDue && g.nextReportDue <= cutoff)
            .map(g => ({
                grant: g,
                dueDate: g.nextReportDue!,
                daysRemaining: Math.ceil((g.nextReportDue!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
            }))
            .sort((a, b) => a.daysRemaining - b.daysRemaining);
    }

    /**
     * Get funding overview dashboard
     */
    async getFundingOverview(): Promise<{
        totalGrants: number;
        activeGrants: number;
        totalFunding: number;
        totalSpent: number;
        byDonorType: { type: FundingType; count: number; amount: number }[];
        byStatus: { status: GrantStatus; count: number }[];
    }> {
        const grants = Array.from(this.grants.values());
        const totalSpent = this.expenditures.reduce((sum, e) => sum + e.amount, 0);

        const byDonorType = new Map<FundingType, { count: number; amount: number }>();
        const byStatus = new Map<GrantStatus, number>();

        for (const grant of grants) {
            // By donor type
            const typeData = byDonorType.get(grant.donorType) || { count: 0, amount: 0 };
            typeData.count++;
            typeData.amount += grant.amount;
            byDonorType.set(grant.donorType, typeData);

            // By status
            byStatus.set(grant.status, (byStatus.get(grant.status) || 0) + 1);
        }

        return {
            totalGrants: grants.length,
            activeGrants: grants.filter(g => g.status === GrantStatus.ACTIVE).length,
            totalFunding: grants.reduce((sum, g) => sum + g.amount, 0),
            totalSpent,
            byDonorType: Array.from(byDonorType.entries()).map(([type, data]) => ({
                type,
                ...data,
            })),
            byStatus: Array.from(byStatus.entries()).map(([status, count]) => ({
                status,
                count,
            })),
        };
    }
}
