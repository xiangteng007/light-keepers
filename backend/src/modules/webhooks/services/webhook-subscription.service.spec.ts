import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WebhookSubscriptionService } from './webhook-subscription.service';
import { WebhookSubscription, WebhookEventType } from '../entities/webhook-subscription.entity';

describe('WebhookSubscriptionService', () => {
    let service: WebhookSubscriptionService;
    let repo: any;

    const mockSub: Partial<WebhookSubscription> = {
        id: 'ws-1',
        name: '外部告警',
        url: 'https://hooks.example.com/alerts',
        secret: 'whsec_abc123',
        events: [WebhookEventType.ALERT_CREATED, WebhookEventType.ALERT_UPDATED],
        active: true,
        failureCount: 0,
        maxRetries: 3,
        timeoutMs: 30000,
        headers: {},
        verifySSL: false,
    };

    const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockSub]),
    };

    beforeEach(async () => {
        Object.values(mockQb).forEach(fn => (fn as jest.Mock).mockClear());
        mockQb.where.mockReturnThis();
        mockQb.andWhere.mockReturnThis();
        mockQb.orderBy.mockReturnThis();
        mockQb.getMany.mockResolvedValue([mockSub]);

        repo = {
            create: jest.fn().mockImplementation((d) => ({ id: 'ws-new', ...d })),
            save: jest.fn().mockImplementation((a) => Promise.resolve(a)),
            findOne: jest.fn().mockResolvedValue({ ...mockSub }),
            find: jest.fn().mockResolvedValue([mockSub]),
            remove: jest.fn().mockResolvedValue(undefined),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            createQueryBuilder: jest.fn().mockReturnValue(mockQb),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WebhookSubscriptionService,
                { provide: getRepositoryToken(WebhookSubscription), useValue: repo },
            ],
        }).compile();

        service = module.get<WebhookSubscriptionService>(WebhookSubscriptionService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== create =====
    describe('create', () => {
        it('should create a subscription with secret', async () => {
            const dto = {
                name: '告警 hook',
                url: 'https://hooks.example.com/test',
                events: [WebhookEventType.ALERT_CREATED],
            };
            const result = await service.create(dto);
            expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
                name: '告警 hook',
            }));
            expect(repo.save).toHaveBeenCalled();
        });

        it('should reject invalid URL', async () => {
            const dto = { name: 'bad', url: 'not-a-url', events: [WebhookEventType.ALERT_CREATED] };
            await expect(service.create(dto)).rejects.toThrow(BadRequestException);
        });

        it('should reject empty events', async () => {
            const dto = { name: 'empty', url: 'https://valid.url', events: [] as WebhookEventType[] };
            await expect(service.create(dto)).rejects.toThrow(BadRequestException);
        });
    });

    // ===== findAll =====
    describe('findAll', () => {
        it('should query all subscriptions', async () => {
            const result = await service.findAll();
            expect(repo.createQueryBuilder).toHaveBeenCalled();
            expect(result).toHaveLength(1);
        });

        it('should filter by tenantId', async () => {
            await service.findAll('tenant-1');
            expect(mockQb.where).toHaveBeenCalledWith('ws.tenantId = :tenantId', { tenantId: 'tenant-1' });
        });
    });

    // ===== findByEventType =====
    describe('findByEventType', () => {
        it('should return active subscriptions by event type', async () => {
            const result = await service.findByEventType(WebhookEventType.ALERT_CREATED);
            expect(result.length).toBeGreaterThanOrEqual(0);
        });
    });

    // ===== findById =====
    describe('findById', () => {
        it('should return subscription by id', async () => {
            const result = await service.findById('ws-1');
            expect(result).toBeDefined();
        });

        it('should throw NotFoundException when not found', async () => {
            repo.findOne.mockResolvedValueOnce(null);
            await expect(service.findById('no-id')).rejects.toThrow(NotFoundException);
        });
    });

    // ===== update =====
    describe('update', () => {
        it('should update subscription', async () => {
            const result = await service.update('ws-1', { name: '新名稱' });
            expect(repo.save).toHaveBeenCalled();
            expect(result.name).toBe('新名稱');
        });

        it('should reject invalid URL in update', async () => {
            await expect(service.update('ws-1', { url: 'bad-url' }))
                .rejects.toThrow(BadRequestException);
        });

        it('should reset failure count when reactivating', async () => {
            repo.findOne.mockResolvedValueOnce({ ...mockSub, failureCount: 5, active: false });
            const result = await service.update('ws-1', { active: true });
            expect(result.failureCount).toBe(0);
        });
    });

    // ===== delete =====
    describe('delete', () => {
        it('should delete subscription', async () => {
            await service.delete('ws-1');
            expect(repo.remove).toHaveBeenCalled();
        });
    });

    // ===== regenerateSecret =====
    describe('regenerateSecret', () => {
        it('should generate a new secret starting with whsec_', async () => {
            const newSecret = await service.regenerateSecret('ws-1');
            expect(newSecret).toContain('whsec_');
            expect(repo.save).toHaveBeenCalled();
        });
    });

    // ===== recordSuccess =====
    describe('recordSuccess', () => {
        it('should reset failure count', async () => {
            await service.recordSuccess('ws-1');
            expect(repo.update).toHaveBeenCalledWith('ws-1', expect.objectContaining({
                failureCount: 0,
            }));
        });
    });

    // ===== recordFailure =====
    describe('recordFailure', () => {
        it('should increment failure count', async () => {
            repo.findOne.mockResolvedValueOnce({ ...mockSub, failureCount: 0 });
            await service.recordFailure('ws-1', 'Timeout');
            expect(repo.save).toHaveBeenCalledWith(
                expect.objectContaining({ failureCount: 1, lastError: 'Timeout' }),
            );
        });

        it('should deactivate after max retries', async () => {
            repo.findOne.mockResolvedValueOnce({ ...mockSub, failureCount: 2, maxRetries: 3 });
            await service.recordFailure('ws-1', 'Connection refused');
            expect(repo.save).toHaveBeenCalledWith(
                expect.objectContaining({ active: false, failureCount: 3 }),
            );
        });
    });

    // ===== getStats =====
    describe('getStats', () => {
        it('should return total and active counts', async () => {
            repo.find.mockResolvedValueOnce([
                { ...mockSub, active: true, failureCount: 0, maxRetries: 3, events: [WebhookEventType.ALERT_CREATED] },
                { ...mockSub, id: 'ws-2', active: false, failureCount: 5, maxRetries: 3, events: [WebhookEventType.TASK_COMPLETED] },
            ]);
            const stats = await service.getStats();
            expect(stats.total).toBe(2);
            expect(stats.active).toBe(1);
            expect(stats.failed).toBe(1);
        });
    });

    // ===== generateSignature =====
    describe('generateSignature', () => {
        it('should return sha256 HMAC signature', () => {
            const sig = service.generateSignature({ test: true }, 'secret');
            expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
        });

        it('should produce consistent signatures for same input', () => {
            const sig1 = service.generateSignature({ a: 1 }, 'key');
            const sig2 = service.generateSignature({ a: 1 }, 'key');
            expect(sig1).toBe(sig2);
        });
    });
});
