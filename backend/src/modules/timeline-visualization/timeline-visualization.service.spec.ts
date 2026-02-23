import { Test, TestingModule } from '@nestjs/testing';
import { TimelineVisualizationService } from './timeline-visualization.service';

describe('TimelineVisualizationService', () => {
    let service: TimelineVisualizationService;

    const mkEvent = (id: string, title: string, ts: string, type = 'report', phase?: string, isMilestone = false) =>
        ({ id, title, timestamp: ts, type, phase, isMilestone });

    const events = [
        mkEvent('e3', '收容安置', '2025-08-02T10:00:00Z', 'action', 'recovery'),
        mkEvent('e1', '地震發生', '2025-08-01T03:00:00Z', 'disaster', 'response', true),
        mkEvent('e2', '救援出發', '2025-08-01T06:00:00Z', 'dispatch', 'response'),
    ];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TimelineVisualizationService],
        }).compile();

        service = module.get<TimelineVisualizationService>(TimelineVisualizationService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== generateTimeline =====
    describe('generateTimeline', () => {
        it('should sort events by timestamp', () => {
            const timeline = service.generateTimeline(events);
            expect(timeline.events[0].id).toBe('e1');
            expect(timeline.events[2].id).toBe('e3');
        });

        it('should calculate start, end, and duration', () => {
            const timeline = service.generateTimeline(events);
            expect(timeline.start).toBe('2025-08-01T03:00:00Z');
            expect(timeline.end).toBe('2025-08-02T10:00:00Z');
            expect(timeline.duration).toContain('h');
        });

        it('should assign index to each event', () => {
            const timeline = service.generateTimeline(events);
            expect(timeline.events[0].index).toBe(0);
            expect(timeline.events[1].index).toBe(1);
        });

        it('should handle empty events', () => {
            const timeline = service.generateTimeline([]);
            expect(timeline.duration).toBe('N/A');
        });
    });

    // ===== groupByPhase =====
    describe('groupByPhase', () => {
        it('should group events by phase', () => {
            const groups = service.groupByPhase(events);
            const phases = groups.map(g => g.phase);
            expect(phases).toContain('response');
            expect(phases).toContain('recovery');
        });

        it('should assign correct color per phase', () => {
            const groups = service.groupByPhase(events);
            const response = groups.find(g => g.phase === 'response');
            expect(response!.color).toBe('#FF0000');
        });

        it('should default to general phase', () => {
            const noPhase = [mkEvent('x', 'test', '2025-01-01T00:00:00Z', 'info')];
            const groups = service.groupByPhase(noPhase);
            expect(groups[0].phase).toBe('general');
            expect(groups[0].color).toBe('#999999');
        });
    });

    // ===== generateGanttData =====
    describe('generateGanttData', () => {
        it('should transform tasks to Gantt items', () => {
            const tasks = [
                { id: 't1', name: '搜救', startTime: '2025-08-01T00:00:00Z', endTime: '2025-08-02T00:00:00Z', progress: 80, status: 'in_progress', dependencies: [] },
            ];
            const gantt = service.generateGanttData(tasks);
            expect(gantt).toHaveLength(1);
            expect(gantt[0].color).toBe('#0088FF');
            expect(gantt[0].progress).toBe(80);
        });

        it('should use status color mapping', () => {
            const tasks = [
                { id: 't1', name: 'Done', startTime: '2025-01-01', status: 'completed' },
                { id: 't2', name: 'Wait', startTime: '2025-01-01', status: 'pending' },
            ];
            const gantt = service.generateGanttData(tasks);
            expect(gantt[0].color).toBe('#00AA00');
            expect(gantt[1].color).toBe('#FFA500');
        });
    });

    // ===== generateMilestones =====
    describe('generateMilestones', () => {
        it('should filter milestone events', () => {
            const milestones = service.generateMilestones(events);
            expect(milestones).toHaveLength(1);
            expect(milestones[0].id).toBe('e1');
        });

        it('should default icon to 🔵', () => {
            const milestones = service.generateMilestones(events);
            expect(milestones[0].icon).toBe('🔵');
        });
    });

    // ===== compareTwoTimelines =====
    describe('compareTwoTimelines', () => {
        it('should compare two timelines', () => {
            const a = [mkEvent('a1', 'A', '2025-01-01T00:00:00Z', 'x')];
            const b = [mkEvent('b1', 'B1', '2025-01-01T00:00:00Z', 'x'), mkEvent('b2', 'B2', '2025-01-02T00:00:00Z', 'x')];
            const comparison = service.compareTwoTimelines(a, b);
            expect(comparison.eventCountDiff).toBe(-1);
            expect(comparison.durationDiff).toContain('vs');
        });
    });

    // ===== getTimeRangeStats =====
    describe('getTimeRangeStats', () => {
        it('should filter events within range', () => {
            const stats = service.getTimeRangeStats(
                events,
                new Date('2025-08-01T00:00:00Z'),
                new Date('2025-08-01T23:59:59Z'),
            );
            expect(stats.totalEvents).toBe(2);
        });

        it('should count events by type', () => {
            const stats = service.getTimeRangeStats(events, new Date('2025-01-01'), new Date('2025-12-31'));
            expect(stats.byType['disaster']).toBe(1);
            expect(stats.byType['dispatch']).toBe(1);
        });

        it('should calculate avgPerDay', () => {
            const stats = service.getTimeRangeStats(events, new Date('2025-08-01'), new Date('2025-08-03'));
            expect(stats.avgPerDay).toBeGreaterThan(0);
        });
    });
});
