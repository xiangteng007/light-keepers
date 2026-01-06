import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Community Resilience Service
 * Assess community disaster preparedness and resilience
 */
@Injectable()
export class CommunityResilienceService {
    private readonly logger = new Logger(CommunityResilienceService.name);

    private assessments: Map<string, CommunityAssessment> = new Map();
    private communities: Map<string, CommunityProfile> = new Map();

    constructor(private configService: ConfigService) { }

    /**
     * Register community for assessment
     */
    registerCommunity(profile: CommunityRegistration): CommunityProfile {
        const community: CommunityProfile = {
            id: `comm-${Date.now()}`,
            ...profile,
            resilienceScore: null,
            lastAssessment: null,
            registeredAt: new Date(),
        };

        this.communities.set(community.id, community);
        this.logger.log(`Community registered: ${community.name}`);

        return community;
    }

    /**
     * Conduct resilience assessment
     */
    async conductAssessment(communityId: string, answers: AssessmentAnswers): Promise<CommunityAssessment> {
        const community = this.communities.get(communityId);
        if (!community) throw new Error('Community not found');

        const scores = this.calculateScores(answers);

        const assessment: CommunityAssessment = {
            id: `assess-${Date.now()}`,
            communityId,
            communityName: community.name,
            scores,
            overallScore: this.calculateOverallScore(scores),
            grade: this.determineGrade(this.calculateOverallScore(scores)),
            strengths: this.identifyStrengths(scores),
            weaknesses: this.identifyWeaknesses(scores),
            recommendations: this.generateRecommendations(scores),
            assessedAt: new Date(),
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        };

        this.assessments.set(assessment.id, assessment);
        community.resilienceScore = assessment.overallScore;
        community.lastAssessment = assessment.assessedAt;

        return assessment;
    }

    /**
     * Get assessment questions
     */
    getAssessmentQuestions(): AssessmentQuestion[] {
        return [
            // 災害認知
            { id: 'awareness_1', category: 'awareness', question: '社區是否了解當地主要災害風險？', weight: 3 },
            { id: 'awareness_2', category: 'awareness', question: '居民是否知道疏散路線？', weight: 3 },
            { id: 'awareness_3', category: 'awareness', question: '過去一年是否舉辦防災宣導？', weight: 2 },

            // 組織能力
            { id: 'organization_1', category: 'organization', question: '是否有社區防災組織或自主防災隊？', weight: 4 },
            { id: 'organization_2', category: 'organization', question: '是否有指定避難所管理人？', weight: 3 },
            { id: 'organization_3', category: 'organization', question: '是否建立弱勢族群清單？', weight: 3 },

            // 資源準備
            { id: 'resources_1', category: 'resources', question: '社區是否備有急救包/AED？', weight: 3 },
            { id: 'resources_2', category: 'resources', question: '是否有緊急糧食儲備點？', weight: 2 },
            { id: 'resources_3', category: 'resources', question: '是否有備用發電設備？', weight: 2 },

            // 溝通能力
            { id: 'communication_1', category: 'communication', question: '是否有社區廣播或警報系統？', weight: 3 },
            { id: 'communication_2', category: 'communication', question: '是否建立緊急聯絡網（LINE群等）？', weight: 3 },
            { id: 'communication_3', category: 'communication', question: '是否能在30分鐘內通知全社區？', weight: 3 },

            // 演練經驗
            { id: 'drill_1', category: 'drill', question: '過去一年是否進行過疏散演練？', weight: 4 },
            { id: 'drill_2', category: 'drill', question: '演練是否包含弱勢族群？', weight: 2 },
            { id: 'drill_3', category: 'drill', question: '是否有演練後檢討改善？', weight: 2 },
        ];
    }

    /**
     * Get community leaderboard
     */
    getLeaderboard(region?: string): LeaderboardEntry[] {
        const communities = Array.from(this.communities.values())
            .filter((c) => c.resilienceScore !== null)
            .filter((c) => !region || c.region === region)
            .sort((a, b) => (b.resilienceScore || 0) - (a.resilienceScore || 0));

        return communities.map((c, index) => ({
            rank: index + 1,
            communityId: c.id,
            communityName: c.name,
            region: c.region,
            score: c.resilienceScore!,
            grade: this.determineGrade(c.resilienceScore!),
        }));
    }

    /**
     * Generate improvement plan
     */
    generateImprovementPlan(assessmentId: string): ImprovementPlan {
        const assessment = this.assessments.get(assessmentId);
        if (!assessment) throw new Error('Assessment not found');

        const actions: PlannedAction[] = [];

        for (const weakness of assessment.weaknesses) {
            actions.push({
                category: weakness.category,
                action: weakness.recommendation,
                priority: weakness.score < 30 ? 'high' : 'medium',
                estimatedCost: this.estimateCost(weakness.category),
                estimatedTime: this.estimateTime(weakness.category),
                status: 'planned',
            });
        }

        return {
            assessmentId,
            communityId: assessment.communityId,
            currentScore: assessment.overallScore,
            targetScore: Math.min(assessment.overallScore + 20, 100),
            actions,
            createdAt: new Date(),
        };
    }

    // Private methods
    private calculateScores(answers: AssessmentAnswers): CategoryScores {
        const questions = this.getAssessmentQuestions();
        const categories: Record<string, { total: number; earned: number }> = {};

        for (const q of questions) {
            if (!categories[q.category]) {
                categories[q.category] = { total: 0, earned: 0 };
            }
            categories[q.category].total += q.weight * 5; // Max 5 points per question
            categories[q.category].earned += (answers[q.id] || 0) * q.weight;
        }

        return {
            awareness: Math.round((categories.awareness?.earned / categories.awareness?.total) * 100) || 0,
            organization: Math.round((categories.organization?.earned / categories.organization?.total) * 100) || 0,
            resources: Math.round((categories.resources?.earned / categories.resources?.total) * 100) || 0,
            communication: Math.round((categories.communication?.earned / categories.communication?.total) * 100) || 0,
            drill: Math.round((categories.drill?.earned / categories.drill?.total) * 100) || 0,
        };
    }

    private calculateOverallScore(scores: CategoryScores): number {
        const weights = { awareness: 0.2, organization: 0.25, resources: 0.15, communication: 0.2, drill: 0.2 };
        return Math.round(
            scores.awareness * weights.awareness +
            scores.organization * weights.organization +
            scores.resources * weights.resources +
            scores.communication * weights.communication +
            scores.drill * weights.drill
        );
    }

    private determineGrade(score: number): string {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    private identifyStrengths(scores: CategoryScores): CategoryAnalysis[] {
        return Object.entries(scores)
            .filter(([, score]) => score >= 70)
            .map(([category, score]) => ({
                category,
                score,
                recommendation: '維持現況並分享經驗',
            }));
    }

    private identifyWeaknesses(scores: CategoryScores): CategoryAnalysis[] {
        const recommendations: Record<string, string> = {
            awareness: '舉辦防災講座、製作防災地圖',
            organization: '成立自主防災隊、建立輪值制度',
            resources: '採購急救設備、建立物資儲備',
            communication: '建立緊急聯絡網、安裝廣播設備',
            drill: '規劃年度演練、納入弱勢族群',
        };

        return Object.entries(scores)
            .filter(([, score]) => score < 70)
            .map(([category, score]) => ({
                category,
                score,
                recommendation: recommendations[category] || '加強該項目',
            }));
    }

    private generateRecommendations(scores: CategoryScores): string[] {
        const recommendations: string[] = [];

        if (scores.awareness < 60) recommendations.push('優先舉辦防災宣導活動');
        if (scores.organization < 60) recommendations.push('儘速成立自主防災組織');
        if (scores.communication < 60) recommendations.push('建立緊急通訊管道');
        if (scores.drill < 60) recommendations.push('安排年度疏散演練');

        if (recommendations.length === 0) {
            recommendations.push('持續維持良好表現');
            recommendations.push('考慮申請政府防災社區認證');
        }

        return recommendations;
    }

    private estimateCost(category: string): string {
        const costs: Record<string, string> = {
            awareness: 'NT$ 5,000 - 20,000',
            organization: 'NT$ 0 (志工人力)',
            resources: 'NT$ 30,000 - 100,000',
            communication: 'NT$ 10,000 - 50,000',
            drill: 'NT$ 5,000 - 30,000',
        };
        return costs[category] || 'NT$ 10,000 - 50,000';
    }

    private estimateTime(category: string): string {
        const times: Record<string, string> = {
            awareness: '1-2 個月',
            organization: '2-3 個月',
            resources: '1-3 個月',
            communication: '2-4 週',
            drill: '1-2 個月籌備',
        };
        return times[category] || '1-3 個月';
    }
}

// Types
interface CommunityRegistration {
    name: string;
    region: string;
    district: string;
    population: number;
    households: number;
    contactName: string;
    contactPhone: string;
    vulnerableCount?: number;
}

interface CommunityProfile extends CommunityRegistration {
    id: string;
    resilienceScore: number | null;
    lastAssessment: Date | null;
    registeredAt: Date;
}

interface AssessmentQuestion {
    id: string;
    category: string;
    question: string;
    weight: number;
}

type AssessmentAnswers = Record<string, number>;

interface CategoryScores {
    awareness: number;
    organization: number;
    resources: number;
    communication: number;
    drill: number;
}

interface CategoryAnalysis {
    category: string;
    score: number;
    recommendation: string;
}

interface CommunityAssessment {
    id: string;
    communityId: string;
    communityName: string;
    scores: CategoryScores;
    overallScore: number;
    grade: string;
    strengths: CategoryAnalysis[];
    weaknesses: CategoryAnalysis[];
    recommendations: string[];
    assessedAt: Date;
    validUntil: Date;
}

interface LeaderboardEntry {
    rank: number;
    communityId: string;
    communityName: string;
    region: string;
    score: number;
    grade: string;
}

interface PlannedAction {
    category: string;
    action: string;
    priority: 'high' | 'medium' | 'low';
    estimatedCost: string;
    estimatedTime: string;
    status: 'planned' | 'in_progress' | 'completed';
}

interface ImprovementPlan {
    assessmentId: string;
    communityId: string;
    currentScore: number;
    targetScore: number;
    actions: PlannedAction[];
    createdAt: Date;
}
