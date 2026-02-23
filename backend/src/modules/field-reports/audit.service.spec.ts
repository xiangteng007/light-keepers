import { AuditService } from './audit.service';

describe('AuditService', () => {
    let service: AuditService;
    let auditRepo: Record<string, jest.Mock>;

    const mockAudit = {
        id: 'al1', actorUserId: 'u1', action: 'field_report:create',
        entityType: 'field_report', entityId: 'fr1', createdAt: new Date(),
    };

    beforeEach(() => {
        auditRepo = {
            create: jest.fn().mockImplementation(d => ({ id: 'al1', createdAt: new Date(), ...d })),
            save: jest.fn().mockImplementation(d => Promise.resolve(d)),
            find: jest.fn().mockResolvedValue([mockAudit]),
        };
        service = new AuditService(auditRepo as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('log', () => {
        it('should create audit entry', async () => {
            const result = await service.log({
                actorUserId: 'u1', action: 'test', entityType: 'report', entityId: 'fr1',
            });
            expect(auditRepo.create).toHaveBeenCalled();
            expect(auditRepo.save).toHaveBeenCalled();
        });
    });

    describe('findByEntity', () => {
        it('should return audit logs for entity', async () => {
            const result = await service.findByEntity('field_report', 'fr1');
            expect(result.length).toBe(1);
        });
    });

    describe('findBySession', () => {
        it('should return session audit logs', async () => {
            const result = await service.findBySession('ms1');
            expect(auditRepo.find).toHaveBeenCalledWith(expect.objectContaining({
                where: { missionSessionId: 'ms1' },
                take: 100,
            }));
        });

        it('should respect custom limit', async () => {
            await service.findBySession('ms1', 50);
            expect(auditRepo.find).toHaveBeenCalledWith(expect.objectContaining({
                take: 50,
            }));
        });
    });
});
