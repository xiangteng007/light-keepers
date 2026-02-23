import { Test, TestingModule } from '@nestjs/testing';
import { TemplateService } from './template.service';

describe('TemplateService', () => {
    let service: TemplateService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TemplateService],
        }).compile();
        service = module.get(TemplateService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('constructor inits default templates', () => {
        expect(service.listTemplates().length).toBeGreaterThanOrEqual(1);
    });

    it('createTemplate creates and stores', () => {
        const t = service.createTemplate({
            name: 'Custom', category: 'custom', content: 'Hello {{name}}',
            variables: ['name'], createdBy: 'me',
        });
        expect(t.id).toBeDefined();
        expect(service.getTemplate(t.id)).toBeDefined();
    });

    it('getTemplatesByCategory filters', () => {
        const ics = service.getTemplatesByCategory('ics');
        expect(ics.length).toBeGreaterThanOrEqual(0);
    });

    it('updateTemplate updates', () => {
        const templates = service.listTemplates();
        const updated = service.updateTemplate(templates[0].id, { name: 'Updated' });
        expect(updated!.name).toBe('Updated');
    });

    it('deleteTemplate removes', () => {
        const t = service.createTemplate({
            name: 'Del', category: 'custom', content: 'X', variables: [], createdBy: 'me',
        });
        expect(service.deleteTemplate(t.id)).toBe(true);
    });

    it('render replaces variables', () => {
        const t = service.createTemplate({
            name: 'Test', category: 'custom', content: 'Hello {{name}}, event: {{event}}',
            variables: ['name', 'event'], createdBy: 'me',
        });
        const rendered = service.render(t.id, { name: '台北', event: '地震' });
        expect(rendered).toBe('Hello 台北, event: 地震');
    });

    it('render throws for missing template', () => {
        expect(() => service.render('no', {})).toThrow();
    });
});
