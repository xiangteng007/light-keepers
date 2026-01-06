import { Injectable, Logger } from '@nestjs/common';

export interface VolunteerPoints {
    volunteerId: string;
    volunteerName: string;
    totalPoints: number;
    currentLevel: number;
    levelName: string;
    serviceHours: number;
    badges: Badge[];
    pointHistory: PointTransaction[];
    redemptions: Redemption[];
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: Date;
    category: 'service' | 'skill' | 'special' | 'leadership';
}

export interface PointTransaction {
    id: string;
    type: 'earn' | 'redeem' | 'bonus' | 'adjust';
    points: number;
    reason: string;
    referenceId?: string;
    createdAt: Date;
}

export interface Redemption {
    id: string;
    rewardId: string;
    rewardName: string;
    pointsCost: number;
    status: 'pending' | 'approved' | 'fulfilled' | 'cancelled';
    requestedAt: Date;
    fulfilledAt?: Date;
}

export interface Reward {
    id: string;
    name: string;
    description: string;
    pointsCost: number;
    category: string;
    stock: number;
    imageUrl?: string;
    active: boolean;
}

export interface LevelConfig {
    level: number;
    name: string;
    minPoints: number;
    benefits: string[];
}

export interface AnnualReport {
    volunteerId: string;
    volunteerName: string;
    year: number;
    totalEarned: number;
    totalRedeemed: number;
    netPoints: number;
    serviceHours: number;
    badgesEarned: number;
    currentLevel: string;
    rank: number;
}

@Injectable()
export class VolunteerPointsService {
    private readonly logger = new Logger(VolunteerPointsService.name);
    private volunteerPoints: Map<string, VolunteerPoints> = new Map();
    private rewards: Map<string, Reward> = new Map();

    private readonly levels: LevelConfig[] = [
        { level: 1, name: '新手志工', minPoints: 0, benefits: ['基本培訓'] },
        { level: 2, name: '見習志工', minPoints: 100, benefits: ['基本培訓', '參與一般任務'] },
        { level: 3, name: '正式志工', minPoints: 500, benefits: ['進階培訓', '參與緊急任務'] },
        { level: 4, name: '資深志工', minPoints: 1500, benefits: ['帶領小組', '專業培訓'] },
        { level: 5, name: '精英志工', minPoints: 5000, benefits: ['指導新人', 'VIP 活動'] },
        { level: 6, name: '榮譽志工', minPoints: 10000, benefits: ['所有權限', '年度表彰'] },
    ];

    private readonly pointRules = {
        perHour: 10,
        nightShiftBonus: 5,
        weekendBonus: 3,
        emergencyBonus: 20,
        trainingComplete: 50,
        referral: 100,
    };

    constructor() {
        this.initializeDefaultRewards();
    }

    private initializeDefaultRewards() {
        const defaultRewards: Reward[] = [
            { id: 'r1', name: '協會紀念T恤', description: '官方志工服', pointsCost: 200, category: '服飾', stock: 50, active: true },
            { id: 'r2', name: '環保水壺', description: '不鏽鋼保溫杯', pointsCost: 150, category: '配件', stock: 30, active: true },
            { id: 'r3', name: '培訓課程優惠券', description: '專業培訓50%折扣', pointsCost: 300, category: '培訓', stock: 20, active: true },
            { id: 'r4', name: '志工帽', description: '遮陽帽', pointsCost: 100, category: '服飾', stock: 40, active: true },
            { id: 'r5', name: '急救包', description: '隨身急救套組', pointsCost: 500, category: '裝備', stock: 15, active: true },
        ];
        defaultRewards.forEach(r => this.rewards.set(r.id, r));
    }

    // ===== 積分管理 =====

    getVolunteerPoints(volunteerId: string): VolunteerPoints | undefined {
        return this.volunteerPoints.get(volunteerId);
    }

    initializeVolunteer(volunteerId: string, volunteerName: string): VolunteerPoints {
        const points: VolunteerPoints = {
            volunteerId,
            volunteerName,
            totalPoints: 0,
            currentLevel: 1,
            levelName: this.levels[0].name,
            serviceHours: 0,
            badges: [],
            pointHistory: [],
            redemptions: [],
        };
        this.volunteerPoints.set(volunteerId, points);
        return points;
    }

    addPoints(volunteerId: string, points: number, reason: string, referenceId?: string): PointTransaction | null {
        let volunteer = this.volunteerPoints.get(volunteerId);
        if (!volunteer) {
            volunteer = this.initializeVolunteer(volunteerId, volunteerId);
        }

        const transaction: PointTransaction = {
            id: `pt-${Date.now()}`,
            type: 'earn',
            points,
            reason,
            referenceId,
            createdAt: new Date(),
        };

        volunteer.totalPoints += points;
        volunteer.pointHistory.push(transaction);

        // 檢查升級
        this.checkLevelUp(volunteer);
        // 檢查徽章
        this.checkBadges(volunteer);

        return transaction;
    }

    recordServiceHours(volunteerId: string, hours: number, isNightShift: boolean, isWeekend: boolean, isEmergency: boolean): number {
        let volunteer = this.volunteerPoints.get(volunteerId);
        if (!volunteer) {
            volunteer = this.initializeVolunteer(volunteerId, volunteerId);
        }

        volunteer.serviceHours += hours;

        let earnedPoints = hours * this.pointRules.perHour;
        if (isNightShift) earnedPoints += hours * this.pointRules.nightShiftBonus;
        if (isWeekend) earnedPoints += hours * this.pointRules.weekendBonus;
        if (isEmergency) earnedPoints += this.pointRules.emergencyBonus;

        this.addPoints(volunteerId, earnedPoints, `服務 ${hours} 小時`);
        return earnedPoints;
    }

    private checkLevelUp(volunteer: VolunteerPoints) {
        const newLevel = this.levels
            .filter(l => volunteer.totalPoints >= l.minPoints)
            .sort((a, b) => b.level - a.level)[0];

        if (newLevel && newLevel.level > volunteer.currentLevel) {
            volunteer.currentLevel = newLevel.level;
            volunteer.levelName = newLevel.name;
            // 升級獎勵徽章
            this.awardBadge(volunteer, {
                id: `level-${newLevel.level}`,
                name: `晉升 ${newLevel.name}`,
                description: `達到等級 ${newLevel.level}`,
                icon: '🎖️',
                category: 'service',
            });
        }
    }

    private checkBadges(volunteer: VolunteerPoints) {
        // 服務時數徽章
        const hourMilestones = [10, 50, 100, 500, 1000];
        hourMilestones.forEach(hours => {
            if (volunteer.serviceHours >= hours &&
                !volunteer.badges.find(b => b.id === `hours-${hours}`)) {
                this.awardBadge(volunteer, {
                    id: `hours-${hours}`,
                    name: `${hours}小時達成`,
                    description: `累計服務 ${hours} 小時`,
                    icon: '⏱️',
                    category: 'service',
                });
            }
        });
    }

    private awardBadge(volunteer: VolunteerPoints, badge: Omit<Badge, 'earnedAt'>) {
        if (!volunteer.badges.find(b => b.id === badge.id)) {
            volunteer.badges.push({ ...badge, earnedAt: new Date() });
        }
    }

    // ===== 獎品兌換 =====

    getRewards(): Reward[] {
        return Array.from(this.rewards.values()).filter(r => r.active);
    }

    redeemReward(volunteerId: string, rewardId: string): Redemption | null {
        const volunteer = this.volunteerPoints.get(volunteerId);
        const reward = this.rewards.get(rewardId);

        if (!volunteer || !reward || reward.stock <= 0) {
            return null;
        }

        if (volunteer.totalPoints < reward.pointsCost) {
            return null;
        }

        // 扣除積分
        volunteer.totalPoints -= reward.pointsCost;
        reward.stock--;

        const redemption: Redemption = {
            id: `red-${Date.now()}`,
            rewardId,
            rewardName: reward.name,
            pointsCost: reward.pointsCost,
            status: 'pending',
            requestedAt: new Date(),
        };

        volunteer.redemptions.push(redemption);
        volunteer.pointHistory.push({
            id: `pt-${Date.now()}`,
            type: 'redeem',
            points: -reward.pointsCost,
            reason: `兌換: ${reward.name}`,
            referenceId: redemption.id,
            createdAt: new Date(),
        });

        return redemption;
    }

    fulfillRedemption(volunteerId: string, redemptionId: string): boolean {
        const volunteer = this.volunteerPoints.get(volunteerId);
        if (!volunteer) return false;

        const redemption = volunteer.redemptions.find(r => r.id === redemptionId);
        if (!redemption || redemption.status !== 'pending') return false;

        redemption.status = 'fulfilled';
        redemption.fulfilledAt = new Date();
        return true;
    }

    // ===== 排行榜 =====

    getLeaderboard(limit: number = 10): { rank: number; volunteerId: string; volunteerName: string; totalPoints: number; level: string }[] {
        return Array.from(this.volunteerPoints.values())
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .slice(0, limit)
            .map((v, i) => ({
                rank: i + 1,
                volunteerId: v.volunteerId,
                volunteerName: v.volunteerName,
                totalPoints: v.totalPoints,
                level: v.levelName,
            }));
    }

    // ===== 年度報告 =====

    generateAnnualReport(volunteerId: string, year: number): AnnualReport | null {
        const volunteer = this.volunteerPoints.get(volunteerId);
        if (!volunteer) return null;

        const yearTransactions = volunteer.pointHistory.filter(t =>
            t.createdAt.getFullYear() === year
        );

        const earned = yearTransactions.filter(t => t.points > 0).reduce((sum, t) => sum + t.points, 0);
        const redeemed = yearTransactions.filter(t => t.points < 0).reduce((sum, t) => sum + Math.abs(t.points), 0);

        return {
            volunteerId: volunteer.volunteerId,
            volunteerName: volunteer.volunteerName,
            year,
            totalEarned: earned,
            totalRedeemed: redeemed,
            netPoints: earned - redeemed,
            serviceHours: volunteer.serviceHours,
            badgesEarned: volunteer.badges.filter(b => b.earnedAt.getFullYear() === year).length,
            currentLevel: volunteer.levelName,
            rank: this.getLeaderboard(1000).find(l => l.volunteerId === volunteerId)?.rank || 0,
        };
    }
}

