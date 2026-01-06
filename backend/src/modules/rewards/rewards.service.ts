import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

/**
 * Rewards Service
 * Gamification and points system for volunteers and civilians
 */
@Injectable()
export class RewardsService {
    private readonly logger = new Logger(RewardsService.name);

    private userPoints: Map<string, UserRewards> = new Map();
    private leaderboard: LeaderboardEntry[] = [];

    private readonly BADGES = [
        { id: 'first_report', name: '初次回報', points: 0, icon: '📝' },
        { id: 'verified_10', name: '可靠情報員', points: 100, icon: '✅' },
        { id: 'life_saver', name: '生命守護者', points: 500, icon: '🩺' },
        { id: 'community_hero', name: '社區英雄', points: 1000, icon: '🦸' },
        { id: 'master_responder', name: '救災達人', points: 5000, icon: '⭐' },
    ];

    constructor(private eventEmitter: EventEmitter2) { }

    /**
     * Award points to user
     */
    awardPoints(userId: string, amount: number, reason: string): UserRewards {
        const rewards = this.getUserRewards(userId);

        rewards.points += amount;
        rewards.history.push({
            amount,
            reason,
            timestamp: new Date(),
        });

        // Check for new badges
        this.checkBadges(rewards);

        // Update leaderboard
        this.updateLeaderboard(userId, rewards.points);

        this.eventEmitter.emit('rewards.points.awarded', { userId, amount, reason });

        return rewards;
    }

    /**
     * Get user rewards
     */
    getUserRewards(userId: string): UserRewards {
        if (!this.userPoints.has(userId)) {
            this.userPoints.set(userId, {
                userId,
                points: 0,
                level: 1,
                badges: [],
                history: [],
            });
        }
        return this.userPoints.get(userId)!;
    }

    /**
     * Get leaderboard
     */
    getLeaderboard(limit: number = 10): LeaderboardEntry[] {
        return this.leaderboard.slice(0, limit);
    }

    /**
     * Redeem points for reward
     */
    async redeemReward(userId: string, rewardId: string): Promise<RedemptionResult> {
        const rewards = this.getUserRewards(userId);
        const catalog = this.getRewardCatalog();
        const reward = catalog.find((r) => r.id === rewardId);

        if (!reward) return { success: false, error: 'Reward not found' };
        if (rewards.points < reward.cost) return { success: false, error: 'Insufficient points' };

        rewards.points -= reward.cost;
        rewards.history.push({
            amount: -reward.cost,
            reason: `Redeemed: ${reward.name}`,
            timestamp: new Date(),
        });

        return { success: true, reward };
    }

    /**
     * Get reward catalog
     */
    getRewardCatalog(): RewardItem[] {
        return [
            { id: 'coffee', name: '咖啡券', cost: 100, description: '合作店家咖啡兌換券', stock: 50 },
            { id: 'meal', name: '餐點券', cost: 200, description: '合作餐廳餐點兌換券', stock: 30 },
            { id: 'certificate', name: '感謝狀', cost: 500, description: '電子感謝狀', stock: -1 },
            { id: 'tshirt', name: '志工T恤', cost: 1000, description: '限量版志工紀念T恤', stock: 20 },
        ];
    }

    // Event handlers
    @OnEvent('crowd.report.verified')
    handleReportVerified(payload: any) {
        if (payload.reporterId) {
            this.awardPoints(payload.reporterId, 20, '災情回報已驗證');
        }
    }

    @OnEvent('microtask.completed')
    handleMicroTaskCompleted(payload: any) {
        this.awardPoints(payload.userId, payload.points, '微任務完成');
    }

    private checkBadges(rewards: UserRewards): void {
        for (const badge of this.BADGES) {
            if (rewards.points >= badge.points && !rewards.badges.includes(badge.id)) {
                rewards.badges.push(badge.id);
                this.eventEmitter.emit('rewards.badge.earned', {
                    userId: rewards.userId,
                    badge,
                });
            }
        }

        // Update level
        rewards.level = Math.floor(rewards.points / 100) + 1;
    }

    private updateLeaderboard(userId: string, points: number): void {
        const existing = this.leaderboard.find((e) => e.userId === userId);
        if (existing) {
            existing.points = points;
        } else {
            this.leaderboard.push({ userId, points, rank: 0 });
        }

        this.leaderboard.sort((a, b) => b.points - a.points);
        this.leaderboard.forEach((entry, index) => {
            entry.rank = index + 1;
        });
    }
}

// Types
interface UserRewards {
    userId: string;
    points: number;
    level: number;
    badges: string[];
    history: PointsHistory[];
}

interface PointsHistory {
    amount: number;
    reason: string;
    timestamp: Date;
}

interface LeaderboardEntry {
    userId: string;
    points: number;
    rank: number;
}

interface RewardItem {
    id: string;
    name: string;
    cost: number;
    description: string;
    stock: number;
}

interface RedemptionResult {
    success: boolean;
    reward?: RewardItem;
    error?: string;
}
