import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventExternalizationService, EventTopic } from './event-externalization.service';

describe('EventExternalizationService', () => {
    let service: EventExternalizationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventExternalizationService,
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
                { provide: EventEmitter2, useValue: { emit: jest.fn(), on: jest.fn() } },
            ],
        }).compile();
        service = module.get(EventExternalizationService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('publish returns event id', async () => {
        const id = await service.publish(EventTopic.MISSION_CREATED, { name: 'test' });
        expect(id).toBeDefined();
    });

    it('publishBatch returns multiple ids', async () => {
        const ids = await service.publishBatch([
            { topic: EventTopic.MISSION_CREATED, payload: {} },
            { topic: EventTopic.SYSTEM_HEALTH, payload: {} },
        ]);
        expect(ids.length).toBe(2);
    });

    it('subscribe and unsubscribe work', () => {
        service.subscribe({ name: 'test-sub', topic: EventTopic.SYSTEM_HEALTH, handler: async () => {} });
        const subs = service.getSubscriptions();
        expect(subs.some(s => s.name === 'test-sub')).toBe(true);
        const removed = service.unsubscribe('test-sub');
        expect(removed).toBe(true);
    });

    it('getPublishStats returns stats', async () => {
        await service.publish(EventTopic.MISSION_CREATED, {});
        const stats = service.getPublishStats();
        expect(stats.successRate).toBeDefined();
    });

    it('purgeOldEvents returns count', () => {
        const purged = service.purgeOldEvents(0);
        expect(typeof purged).toBe('number');
    });
});
