import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaiwanPdpaService, DataCategory } from './taiwan-pdpa.service';

describe('TaiwanPdpaService', () => {
    let service: TaiwanPdpaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TaiwanPdpaService,
                { provide: EventEmitter2, useValue: { emit: jest.fn() } },
            ],
        }).compile();
        service = module.get(TaiwanPdpaService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('recordConsent creates record', () => {
        const c = service.recordConsent('u1', DataCategory.GENERAL, 'volunteer');
        expect(c.userId).toBe('u1');
        expect(c.status).toBe('granted');
    });

    it('revokeConsent works', () => {
        const c = service.recordConsent('u1', DataCategory.GENERAL, 'p');
        expect(service.revokeConsent('u1', c.id)).toBe(true);
    });

    it('checkConsent returns true after grant', () => {
        service.recordConsent('u1', DataCategory.GENERAL, 'volunteer');
        expect(service.checkConsent('u1', 'volunteer')).toBe(true);
    });

    it('getUserConsents returns list', () => {
        service.recordConsent('u1', DataCategory.GENERAL, 'p');
        expect(service.getUserConsents('u1').length).toBe(1);
    });

    it('getRetentionPolicies returns policies', () => {
        expect(service.getRetentionPolicies().length).toBeGreaterThan(0);
    });

    it('anonymizeData masks fields', () => {
        const result = service.anonymizeData({ name: '林小明', email: 'a@b.c', phone: '0912345678' });
        expect(result.name).not.toBe('林小明');
    });

    it('reportBreach creates incident', () => {
        const b = service.reportBreach(['email'], 100, 'high');
        expect(b.id).toBeDefined();
        expect(b.severity).toBe('high');
    });

    it('updateBreachStatus updates incident', () => {
        const b = service.reportBreach(['email'], 10, 'low');
        const updated = service.updateBreachStatus(b.id, { notificationSent: true });
        expect(updated!.notificationSent).toBe(true);
    });

    it('getBreachIncidents returns list', () => {
        service.reportBreach(['data'], 1, 'low');
        expect(service.getBreachIncidents().length).toBe(1);
    });

    it('handleDataSubjectRequest returns request', () => {
        const req = service.handleDataSubjectRequest('u1', 'access');
        expect(req.requestId).toBeDefined();
    });

    it('generateComplianceReport returns report', () => {
        const report = service.generateComplianceReport();
        expect(report.generatedAt).toBeInstanceOf(Date);
        expect(report.consentStats).toBeDefined();
    });
});
