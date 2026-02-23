import { RichMenuService } from './rich-menu.service';

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('RichMenuService', () => {
    let service: RichMenuService;
    let configService: { get: jest.Mock };

    beforeEach(() => {
        configService = { get: jest.fn().mockReturnValue('test-channel-token') };
        service = new RichMenuService(configService as any);
        mockFetch.mockReset();
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ richMenuId: 'rm-123' }),
            status: 200,
        });
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('createRichMenu', () => {
        it('should create rich menu via API', async () => {
            const result = await service.createRichMenu({
                size: { width: 2500, height: 1686 },
                selected: true,
                name: '主選單',
                chatBarText: '選單',
                areas: [],
            });
            expect(result).toBe('rm-123');
        });

        it('should return null on API failure', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 400, json: () => Promise.resolve({}) });
            const result = await service.createRichMenu({
                size: { width: 2500, height: 1686 },
                selected: true,
                name: 'Test',
                chatBarText: 'Menu',
                areas: [],
            });
            expect(result).toBeNull();
        });
    });

    describe('setDefaultRichMenu', () => {
        it('should set default menu', async () => {
            const result = await service.setDefaultRichMenu('rm-123');
            expect(result).toBe(true);
        });

        it('should return false on failure', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
            const result = await service.setDefaultRichMenu('rm-bad');
            expect(result).toBe(false);
        });
    });

    describe('linkRichMenuToUser', () => {
        it('should link menu to user', async () => {
            const result = await service.linkRichMenuToUser('user-1', 'rm-123');
            expect(result).toBe(true);
        });
    });

    describe('unlinkRichMenuFromUser', () => {
        it('should unlink menu from user', async () => {
            const result = await service.unlinkRichMenuFromUser('user-1');
            expect(result).toBe(true);
        });
    });

    describe('getRichMenuList', () => {
        it('should return menu list', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ richmenus: [{ richMenuId: 'rm-1' }] }),
            });
            const list = await service.getRichMenuList();
            expect(Array.isArray(list)).toBe(true);
        });
    });

    describe('deleteRichMenu', () => {
        it('should delete menu', async () => {
            const result = await service.deleteRichMenu('rm-123');
            expect(result).toBe(true);
        });
    });

    describe('getDefaultMenuConfig', () => {
        it('should return main menu config', () => {
            const config = service.getDefaultMenuConfig('main');
            expect(config).toBeDefined();
            expect(config.name).toBeDefined();
        });

        it('should return volunteer menu config', () => {
            const config = service.getDefaultMenuConfig('volunteer');
            expect(config).toBeDefined();
        });
    });
});
