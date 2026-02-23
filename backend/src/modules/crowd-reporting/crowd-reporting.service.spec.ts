import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrowdReportingService } from './crowd-reporting.service';

describe('CrowdReportingService', () => {
    let service: CrowdReportingService;
    let eventEmitter: { emit: jest.Mock };

    const reportSubmission = {
        reporterId: 'user-1',
        description: '前方道路嚴重積水，深度約一公尺',
        location: { lat: 25.033, lng: 121.565 },
        locationType: 'road',
        photos: ['photo1.jpg'],
    };

    beforeEach(async () => {
        eventEmitter = { emit: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CrowdReportingService,
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(null) } },
                { provide: EventEmitter2, useValue: eventEmitter },
            ],
        }).compile();

        service = module.get<CrowdReportingService>(CrowdReportingService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== submitReport =====
    describe('submitReport', () => {
        it('should create report with classification', async () => {
            const report = await service.submitReport(reportSubmission);
            expect(report.id).toContain('report-');
            expect(['pending', 'verified']).toContain(report.status);
            expect(report.classification).toBeDefined();
            expect(report.credibilityScore).toBeGreaterThanOrEqual(0);
        });

        it('should classify based on description keywords', async () => {
            const floodReport = await service.submitReport({
                ...reportSubmission,
                description: '洪水淹沒道路，積水很深',
            });
            expect(floodReport.classification).toBeDefined();
            expect(floodReport.classification!.type).toBeDefined();
        });

        it('should emit crowd.report.pending or verified event', async () => {
            await service.submitReport(reportSubmission);
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                expect.stringMatching(/crowd\.report\.(pending|verified)/),
                expect.any(Object),
            );
        });
    });

    // ===== getReportsInArea =====
    describe('getReportsInArea', () => {
        it('should return reports within bounds', async () => {
            await service.submitReport(reportSubmission);
            const bounds = { north: 26, south: 24, east: 122, west: 121 };
            const reports = service.getReportsInArea(bounds);
            expect(reports.length).toBe(1);
        });

        it('should filter by type', async () => {
            await service.submitReport(reportSubmission);
            const bounds = { north: 26, south: 24, east: 122, west: 121 };
            const reports = service.getReportsInArea(bounds, { type: 'nonexistent' });
            expect(reports.length).toBe(0);
        });

        it('should not return reports outside bounds', async () => {
            await service.submitReport(reportSubmission);
            const bounds = { north: 30, south: 29, east: 130, west: 129 };
            const reports = service.getReportsInArea(bounds);
            expect(reports.length).toBe(0);
        });
    });

    // ===== getReportClusters =====
    describe('getReportClusters', () => {
        it('should return clusters', () => {
            const clusters = service.getReportClusters();
            expect(Array.isArray(clusters)).toBe(true);
        });
    });

    // ===== verifyReport =====
    describe('verifyReport', () => {
        it('should verify report', async () => {
            const report = await service.submitReport(reportSubmission);
            const verified = await service.verifyReport(report.id, 'responder-1', 'verified');
            expect(verified.status).toBe('verified');
            expect(verified.verifiedBy).toBe('responder-1');
        });

        it('should mark report as false', async () => {
            const report = await service.submitReport(reportSubmission);
            const flagged = await service.verifyReport(report.id, 'responder-1', 'false');
            expect(flagged.status).toBe('false');
        });

        it('should throw for nonexistent report', async () => {
            await expect(service.verifyReport('fake', 'r-1', 'verified'))
                .rejects.toThrow();
        });
    });

    // ===== getTrendingTypes =====
    describe('getTrendingTypes', () => {
        it('should return trending disaster types', async () => {
            await service.submitReport(reportSubmission);
            await new Promise(r => setTimeout(r, 2));
            await service.submitReport({
                ...reportSubmission,
                description: '地震搖晃劇烈',
            });
            const trending = service.getTrendingTypes(24);
            expect(Array.isArray(trending)).toBe(true);
        });
    });
});
