import { Injectable, Logger } from '@nestjs/common';

/**
 * Public Finance Service
 * Generate public-facing financial transparency reports
 */
@Injectable()
export class PublicFinanceService {
    private readonly logger = new Logger(PublicFinanceService.name);

    /**
     * 取得公開財務摘要
     */
    getPublicFinanceSummary(year: number): PublicFinanceSummary {
        return {
            organization: '社團法人台灣光守護者協會',
            year,
            income: {
                donations: 5800000,
                grants: 2500000,
                membershipFees: 350000,
                eventIncome: 420000,
                other: 130000,
                total: 9200000,
            },
            expenses: {
                programs: 4500000,
                administration: 1200000,
                fundraising: 350000,
                equipment: 800000,
                training: 650000,
                other: 400000,
                total: 7900000,
            },
            balance: 1300000,
            programExpenseRatio: 0.57,
            adminExpenseRatio: 0.15,
            certifications: ['勸募許可字號: 衛部救字第XXX號'],
            auditedBy: '安達會計師事務所',
            reportDate: new Date(),
        };
    }

    /**
     * 取得重大支出明細
     */
    getMajorExpenditures(year: number, minAmount: number = 100000): MajorExpenditure[] {
        return [
            { description: '災害救援設備採購', amount: 850000, category: 'equipment', date: new Date(year, 3, 15) },
            { description: '年度志工培訓計畫', amount: 450000, category: 'training', date: new Date(year, 5, 1) },
            { description: '社區防災宣導活動', amount: 280000, category: 'programs', date: new Date(year, 8, 10) },
            { description: '救災物資倉儲', amount: 180000, category: 'operations', date: new Date(year, 2, 1) },
        ].filter((e) => e.amount >= minAmount);
    }

    /**
     * 取得專案執行報告
     */
    getProjectReport(projectId: string): ProjectFinanceReport {
        return {
            projectId,
            projectName: '2026 年救災行動計畫',
            budget: 1500000,
            spent: 1280000,
            remaining: 220000,
            utilizationRate: 85.3,
            timeline: { start: new Date(2026, 0, 1), end: new Date(2026, 11, 31) },
            milestones: [
                { name: '第一階段培訓', budgeted: 300000, actual: 285000, status: 'completed' },
                { name: '設備採購', budgeted: 500000, actual: 495000, status: 'completed' },
                { name: '社區推廣', budgeted: 400000, actual: 350000, status: 'in_progress' },
            ],
            outcomes: ['培訓志工 250 人', '支援 45 場社區活動', '參與 12 次災害應變'],
        };
    }

    /**
     * 取得捐款人感謝報告
     */
    getDonorAcknowledgement(period: { from: Date; to: Date }): DonorAcknowledgement {
        return {
            period,
            totalDonors: 1256,
            totalDonations: 5800000,
            impactHighlights: [
                '支援 156 場緊急救援行動',
                '培訓 450 位認證志工',
                '服務 28,000 位社區居民',
                '舉辦 36 場防災教育活動',
            ],
            testimonials: [
                { source: '受助家庭', quote: '感謝志工們在颱風期間的協助...' },
                { source: '合作社區', quote: '防災訓練讓我們更有信心面對災害...' },
            ],
            thankYouMessage: '感謝所有捐款人的支持，讓我們能夠持續守護社區安全。',
        };
    }

    /**
     * 產生年度報告 PDF 資訊
     */
    getAnnualReportInfo(year: number): AnnualReportInfo {
        return {
            year,
            title: `${year} 年度報告`,
            available: true,
            downloadUrl: `/api/public/reports/annual/${year}.pdf`,
            sections: ['主席的話', '年度亮點', '財務報告', '專案成果', '展望未來'],
            pageCount: 24,
            publishedAt: new Date(year + 1, 2, 1),
        };
    }

    /**
     * 取得即時收支看板資料
     */
    getLiveDashboardData(): FinanceDashboard {
        const now = new Date();
        return {
            currentMonth: `${now.getFullYear()}/${now.getMonth() + 1}`,
            mtdIncome: 485000,
            mtdExpense: 320000,
            ytdIncome: 7850000,
            ytdExpense: 6200000,
            cashBalance: 2850000,
            pendingReceivables: 350000,
            pendingPayables: 180000,
            lastUpdated: now,
        };
    }
}

// Types
interface PublicFinanceSummary {
    organization: string; year: number;
    income: Record<string, number>; expenses: Record<string, number>;
    balance: number; programExpenseRatio: number; adminExpenseRatio: number;
    certifications: string[]; auditedBy: string; reportDate: Date;
}
interface MajorExpenditure { description: string; amount: number; category: string; date: Date; }
interface ProjectFinanceReport {
    projectId: string; projectName: string;
    budget: number; spent: number; remaining: number; utilizationRate: number;
    timeline: { start: Date; end: Date };
    milestones: { name: string; budgeted: number; actual: number; status: string }[];
    outcomes: string[];
}
interface DonorAcknowledgement {
    period: { from: Date; to: Date }; totalDonors: number; totalDonations: number;
    impactHighlights: string[]; testimonials: { source: string; quote: string }[];
    thankYouMessage: string;
}
interface AnnualReportInfo {
    year: number; title: string; available: boolean; downloadUrl: string;
    sections: string[]; pageCount: number; publishedAt: Date;
}
interface FinanceDashboard {
    currentMonth: string; mtdIncome: number; mtdExpense: number;
    ytdIncome: number; ytdExpense: number; cashBalance: number;
    pendingReceivables: number; pendingPayables: number; lastUpdated: Date;
}
