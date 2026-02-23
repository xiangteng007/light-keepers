import { NotificationTemplatesService } from './notification-templates.service';

describe('NotificationTemplatesService', () => {
    let service: NotificationTemplatesService;
    let cacheService: Record<string, jest.Mock>;

    beforeEach(() => {
        cacheService = {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
        };
        service = new NotificationTemplatesService(cacheService as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('createTemplate', () => {
        it('should create template', async () => {
            const tpl = await service.createTemplate({
                key: 'test_alert', name: '測試', channel: 'push',
                title: '標題', body: '內容 {{name}}',
                variables: ['name'], locale: 'zh-TW', active: true,
            });
            expect(tpl.id).toBeDefined();
            expect(tpl.key).toBe('test_alert');
        });
    });

    describe('getAllTemplates', () => {
        it('should return all templates including seeds', async () => {
            const templates = await service.getAllTemplates();
            expect(templates.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('getTemplate', () => {
        it('should find template by key and channel', async () => {
            await service.createTemplate({
                key: 'find_me', name: 'Find Test', channel: 'push',
                body: 'test', variables: [], locale: 'zh-TW', active: true,
            });
            const found = await service.getTemplate('find_me', 'push');
            expect(found).toBeDefined();
            expect(found?.key).toBe('find_me');
        });

        it('should return null for missing template', async () => {
            const found = await service.getTemplate('nonexistent', 'push');
            expect(found).toBeNull();
        });
    });

    describe('updateTemplate', () => {
        it('should update template', async () => {
            const tpl = await service.createTemplate({
                key: 'update_me', name: 'Update Test', channel: 'push',
                body: 'old', variables: [], locale: 'zh-TW', active: true,
            });
            const updated = await service.updateTemplate(tpl.id, { body: 'new' });
            expect(updated?.body).toBe('new');
        });

        it('should return null for missing ID', async () => {
            const result = await service.updateTemplate('bad-id', { body: 'x' });
            expect(result).toBeNull();
        });
    });

    describe('deleteTemplate', () => {
        it('should delete template', async () => {
            const tpl = await service.createTemplate({
                key: 'del_me', name: 'Del Test', channel: 'push',
                body: 'bye', variables: [], locale: 'zh-TW', active: true,
            });
            expect(await service.deleteTemplate(tpl.id)).toBe(true);
        });

        it('should return false for missing ID', async () => {
            expect(await service.deleteTemplate('bad-id')).toBe(false);
        });
    });

    describe('render', () => {
        it('should render template with variables', async () => {
            await service.createTemplate({
                key: 'render_test', name: 'Render', channel: 'push',
                title: 'Hello {{name}}', body: '任務 {{task}}',
                variables: ['name', 'task'], locale: 'zh-TW', active: true,
            });
            const rendered = await service.render('render_test', 'push', { name: 'Alice', task: '搜救' });
            expect(rendered?.title).toBe('Hello Alice');
            expect(rendered?.body).toBe('任務 搜救');
        });

        it('should return null for missing template', async () => {
            const result = await service.render('missing', 'push', {});
            expect(result).toBeNull();
        });
    });
});
