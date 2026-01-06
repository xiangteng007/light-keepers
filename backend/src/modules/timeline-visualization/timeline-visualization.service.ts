import { Injectable, Logger } from '@nestjs/common';

/**
 * Timeline Visualization Service
 * Event sequence visualization data
 */
@Injectable()
export class TimelineVisualizationService {
    private readonly logger = new Logger(TimelineVisualizationService.name);

    /**
     * 產生事件時間軸
     */
    generateTimeline(events: TimelineEvent[]): Timeline {
        const sorted = [...events].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        return {
            start: sorted[0]?.timestamp,
            end: sorted[sorted.length - 1]?.timestamp,
            events: sorted.map((e, i) => ({ ...e, index: i })),
            duration: this.calcDuration(sorted[0]?.timestamp, sorted[sorted.length - 1]?.timestamp),
        };
    }

    /**
     * 分群時間軸
     */
    groupByPhase(events: TimelineEvent[]): PhaseGroup[] {
        const phases: Map<string, TimelineEvent[]> = new Map();

        for (const event of events) {
            const phase = event.phase || 'general';
            if (!phases.has(phase)) phases.set(phase, []);
            phases.get(phase)!.push(event);
        }

        return Array.from(phases.entries()).map(([phase, items]) => ({
            phase,
            events: items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
            count: items.length,
            color: this.getPhaseColor(phase),
        }));
    }

    /**
     * 產生 Gantt 資料
     */
    generateGanttData(tasks: TaskData[]): GanttItem[] {
        return tasks.map((t) => ({
            id: t.id,
            name: t.name,
            start: t.startTime,
            end: t.endTime || new Date().toISOString(),
            progress: t.progress || 0,
            dependencies: t.dependencies || [],
            color: this.getStatusColor(t.status),
        }));
    }

    /**
     * 產生里程碑時間軸
     */
    generateMilestones(events: TimelineEvent[]): Milestone[] {
        const milestones = events.filter((e) => e.isMilestone);
        return milestones.map((m) => ({
            id: m.id,
            title: m.title,
            timestamp: m.timestamp,
            icon: m.icon || '🔵',
            description: m.description,
        }));
    }

    /**
     * 比較多個時間軸
     */
    compareTwoTimelines(a: TimelineEvent[], b: TimelineEvent[]): TimelineComparison {
        const timelineA = this.generateTimeline(a);
        const timelineB = this.generateTimeline(b);

        return {
            timelineA,
            timelineB,
            durationDiff: this.calcDurationDiff(timelineA.duration, timelineB.duration),
            eventCountDiff: a.length - b.length,
        };
    }

    /**
     * 取得時間段統計
     */
    getTimeRangeStats(events: TimelineEvent[], start: Date, end: Date): TimeRangeStats {
        const filtered = events.filter((e) => {
            const t = new Date(e.timestamp).getTime();
            return t >= start.getTime() && t <= end.getTime();
        });

        const byType: Record<string, number> = {};
        filtered.forEach((e) => {
            byType[e.type] = (byType[e.type] || 0) + 1;
        });

        return {
            start: start.toISOString(),
            end: end.toISOString(),
            totalEvents: filtered.length,
            byType,
            avgPerDay: filtered.length / Math.max(1, (end.getTime() - start.getTime()) / 86400000),
        };
    }

    private calcDuration(start?: string, end?: string): string {
        if (!start || !end) return 'N/A';
        const diff = new Date(end).getTime() - new Date(start).getTime();
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        return `${hours}h ${mins}m`;
    }

    private calcDurationDiff(a: string, b: string): string {
        return `${a} vs ${b}`;
    }

    private getPhaseColor(phase: string): string {
        const colors: Record<string, string> = {
            preparation: '#FFA500', response: '#FF0000',
            recovery: '#00AA00', mitigation: '#0088FF', general: '#999999',
        };
        return colors[phase] || '#999999';
    }

    private getStatusColor(status: string): string {
        const colors: Record<string, string> = {
            pending: '#FFA500', in_progress: '#0088FF',
            completed: '#00AA00', cancelled: '#999999',
        };
        return colors[status] || '#999999';
    }
}

// Types
interface TimelineEvent { id: string; title: string; timestamp: string; type: string; phase?: string; isMilestone?: boolean; icon?: string; description?: string; }
interface Timeline { start?: string; end?: string; events: any[]; duration: string; }
interface PhaseGroup { phase: string; events: TimelineEvent[]; count: number; color: string; }
interface TaskData { id: string; name: string; startTime: string; endTime?: string; progress?: number; dependencies?: string[]; status: string; }
interface GanttItem { id: string; name: string; start: string; end: string; progress: number; dependencies: string[]; color: string; }
interface Milestone { id: string; title: string; timestamp: string; icon: string; description?: string; }
interface TimelineComparison { timelineA: Timeline; timelineB: Timeline; durationDiff: string; eventCountDiff: number; }
interface TimeRangeStats { start: string; end: string; totalEvents: number; byType: Record<string, number>; avgPerDay: number; }
