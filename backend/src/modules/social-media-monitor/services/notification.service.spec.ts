import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { NotificationConfig } from '../entities/notification-config.entity';

describe('NotificationService (social-media-monitor)', () => {
    let service: NotificationService;
    const mockConfig = { id: 'c1', channel: 'email', name: 'test', enabled: true, minUrgency: 5, platforms: [], keywords: [], config: {} };

    beforeEach(async () => {
        const repo = {
            find: jest.fn().mockResolvedValue([mockConfig]),
            findOneBy: jest.fn().mockResolvedValue(mockConfig),
            create: jest.fn().mockReturnValue(mockConfig),
            save: jest.fn().mockResolvedValue(mockConfig),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            delete: jest.fn().mockResolvedValue({ affected: 1 }),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationService,
                { provide: getRepositoryToken(NotificationConfig), useValue: repo },
            ],
        }).compile();
        service = module.get(NotificationService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('getConfigs returns configs', async () => {
        const configs = await service.getConfigs();
        expect(configs.length).toBe(1);
    });

    it('createConfig returns config', async () => {
        const config = await service.createConfig({ channel: 'telegram' } as any);
        expect(config.id).toBeDefined();
    });

    it('updateConfig returns updated', async () => {
        const config = await service.updateConfig('c1', { name: 'updated' } as any);
        expect(config).toBeDefined();
    });

    it('deleteConfig completes', async () => {
        await expect(service.deleteConfig('c1')).resolves.toBeUndefined();
    });
});
