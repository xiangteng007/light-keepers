import { Injectable, Logger } from '@nestjs/common';

/**
 * Auto Dispatch Service
 * Automatic volunteer dispatch without manual approval
 */
@Injectable()
export class AutoDispatchService {
    private readonly logger = new Logger(AutoDispatchService.name);
    private rules: DispatchRule[] = [];
    private dispatchHistory: DispatchRecord[] = [];

    constructor() {
        this.loadDefaultRules();
    }

    private loadDefaultRules() {
        this.rules = [
            { id: 'r1', name: '高優先級自動派遣', priority: 1, condition: { minSeverity: 4 }, action: { autoDispatch: true, notifyAdmin: true } },
            { id: 'r2', name: '技能匹配派遣', priority: 2, condition: { requireSkillMatch: true }, action: { autoDispatch: true, minMatchScore: 0.7 } },
            { id: 'r3', name: '距離優先派遣', priority: 3, condition: { maxDistance: 10 }, action: { autoDispatch: true } },
        ];
    }

    /**
     * 自動派遣
     */
    async autoDispatch(incident: IncidentData): Promise<DispatchResult> {
        this.logger.log(`Auto dispatch for incident ${incident.id}`);

        // 找出符合規則
        const applicableRule = this.findApplicableRule(incident);
        if (!applicableRule) {
            return { success: false, reason: 'No applicable rule found' };
        }

        // 找出最佳志工
        const candidates = await this.findCandidates(incident);
        if (candidates.length === 0) {
            return { success: false, reason: 'No available volunteers' };
        }

        // 選擇志工
        const selected = this.selectVolunteers(candidates, incident.requiredCount);

        // 執行派遣
        const dispatch: DispatchRecord = {
            id: `disp-${Date.now()}`,
            incidentId: incident.id,
            ruleId: applicableRule.id,
            volunteers: selected.map((v) => v.id),
            dispatchedAt: new Date(),
            status: 'dispatched',
        };

        this.dispatchHistory.push(dispatch);

        // 通知志工
        await this.notifyVolunteers(selected, incident);

        return {
            success: true,
            dispatchId: dispatch.id,
            volunteersDispatched: selected.length,
            estimatedArrival: this.estimateArrival(selected, incident),
        };
    }

    /**
     * 查詢派遣狀態
     */
    getDispatchStatus(dispatchId: string): DispatchRecord | undefined {
        return this.dispatchHistory.find((d) => d.id === dispatchId);
    }

    /**
     * 取消派遣
     */
    cancelDispatch(dispatchId: string, reason: string): boolean {
        const dispatch = this.dispatchHistory.find((d) => d.id === dispatchId);
        if (!dispatch || dispatch.status === 'completed') return false;

        dispatch.status = 'cancelled';
        dispatch.cancelReason = reason;
        return true;
    }

    /**
     * 更新規則
     */
    updateRule(ruleId: string, updates: Partial<DispatchRule>): boolean {
        const rule = this.rules.find((r) => r.id === ruleId);
        if (!rule) return false;

        Object.assign(rule, updates);
        return true;
    }

    /**
     * 取得規則
     */
    getRules(): DispatchRule[] {
        return this.rules;
    }

    /**
     * 取得派遣統計
     */
    getDispatchStats(): DispatchStats {
        const total = this.dispatchHistory.length;
        const successful = this.dispatchHistory.filter((d) => d.status === 'completed').length;
        const cancelled = this.dispatchHistory.filter((d) => d.status === 'cancelled').length;

        return {
            total,
            successful,
            cancelled,
            successRate: total > 0 ? (successful / total * 100).toFixed(1) + '%' : '0%',
            avgResponseTime: '15 min', // TODO: 計算實際平均
        };
    }

    private findApplicableRule(incident: IncidentData): DispatchRule | null {
        return this.rules.find((r) => {
            if (r.condition.minSeverity && incident.severity < r.condition.minSeverity) return false;
            return true;
        }) || null;
    }

    private async findCandidates(incident: IncidentData): Promise<VolunteerCandidate[]> {
        // 模擬志工資料
        return [
            { id: 'v1', name: '王大明', skills: ['rescue'], distance: 5, available: true, score: 0.9 },
            { id: 'v2', name: '李小華', skills: ['medical'], distance: 8, available: true, score: 0.85 },
            { id: 'v3', name: '張三', skills: ['rescue', 'medical'], distance: 3, available: true, score: 0.95 },
        ];
    }

    private selectVolunteers(candidates: VolunteerCandidate[], count: number): VolunteerCandidate[] {
        return candidates.sort((a, b) => b.score - a.score).slice(0, count);
    }

    private async notifyVolunteers(volunteers: VolunteerCandidate[], incident: IncidentData): Promise<void> {
        // TODO: 發送通知
        this.logger.log(`Notifying ${volunteers.length} volunteers for incident ${incident.id}`);
    }

    private estimateArrival(volunteers: VolunteerCandidate[], incident: IncidentData): string {
        const minDistance = Math.min(...volunteers.map((v) => v.distance));
        return `${Math.round(minDistance * 3)} min`; // 假設 3 min/km
    }
}

// Types
interface IncidentData { id: string; severity: number; requiredSkills?: string[]; requiredCount: number; lat: number; lng: number; }
interface DispatchRule { id: string; name: string; priority: number; condition: any; action: any; }
interface VolunteerCandidate { id: string; name: string; skills: string[]; distance: number; available: boolean; score: number; }
interface DispatchRecord { id: string; incidentId: string; ruleId: string; volunteers: string[]; dispatchedAt: Date; status: string; cancelReason?: string; }
interface DispatchResult { success: boolean; dispatchId?: string; volunteersDispatched?: number; estimatedArrival?: string; reason?: string; }
interface DispatchStats { total: number; successful: number; cancelled: number; successRate: string; avgResponseTime: string; }
