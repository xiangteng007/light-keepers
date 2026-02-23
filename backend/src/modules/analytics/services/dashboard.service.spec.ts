import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
    let service: DashboardService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [DashboardService],
        }).compile();
        service = module.get<DashboardService>(DashboardService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('CRUD', () => {
        it('should create a dashboard', () => {
            const dash = service.create({
                name: 'Ops Dashboard',
                widgets: [],
                createdBy: 'user-1',
                isPublic: false,
            });
            expect(dash.id).toContain('dash-');
            expect(dash.name).toBe('Ops Dashboard');
            expect(dash.createdAt).toBeInstanceOf(Date);
        });

        it('should find all dashboards', () => {
            // Mock Date.now to return distinct values to avoid ID collision
            const originalNow = Date.now;
            let counter = 0;
            jest.spyOn(Date, 'now').mockImplementation(() => originalNow() + (counter++));
            
            service.create({ name: 'D1', widgets: [], createdBy: 'u1', isPublic: true });
            service.create({ name: 'D2', widgets: [], createdBy: 'u2', isPublic: false });
            expect(service.findAll()).toHaveLength(2);
            
            jest.restoreAllMocks();
        });

        it('should find by id', () => {
            const dash = service.create({ name: 'Find', widgets: [], createdBy: 'u1', isPublic: true });
            expect(service.findById(dash.id)?.name).toBe('Find');
        });

        it('should return undefined for unknown id', () => {
            expect(service.findById('no-such-id')).toBeUndefined();
        });

        it('should update a dashboard', () => {
            const dash = service.create({ name: 'Old', widgets: [], createdBy: 'u1', isPublic: false });
            const updated = service.update(dash.id, { name: 'New' });
            expect(updated?.name).toBe('New');
            expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(dash.updatedAt.getTime());
        });

        it('should return null when updating nonexistent', () => {
            expect(service.update('no-id', { name: 'x' })).toBeNull();
        });

        it('should delete a dashboard', () => {
            const dash = service.create({ name: 'Del', widgets: [], createdBy: 'u1', isPublic: true });
            expect(service.delete(dash.id)).toBe(true);
            expect(service.findById(dash.id)).toBeUndefined();
        });

        it('should return false when deleting nonexistent', () => {
            expect(service.delete('no-id')).toBe(false);
        });
    });

    describe('Widget management', () => {
        it('should add widget to dashboard', () => {
            const dash = service.create({ name: 'W', widgets: [], createdBy: 'u1', isPublic: false });
            const widget = service.addWidget(dash.id, {
                type: 'metric',
                title: 'Active SOS',
                position: { x: 0, y: 0, w: 4, h: 3 },
                config: { metric: 'sos_count' },
            });
            expect(widget?.id).toContain('widget-');
            expect(service.findById(dash.id)?.widgets).toHaveLength(1);
        });

        it('should return null when adding widget to unknown dashboard', () => {
            expect(service.addWidget('no-id', { type: 'text', title: 't', position: { x: 0, y: 0, w: 1, h: 1 }, config: {} }))
                .toBeNull();
        });

        it('should remove widget from dashboard', () => {
            const dash = service.create({ name: 'R', widgets: [], createdBy: 'u1', isPublic: false });
            const widget = service.addWidget(dash.id, {
                type: 'chart',
                title: 'Chart',
                position: { x: 0, y: 0, w: 6, h: 4 },
                config: {},
            });
            expect(service.removeWidget(dash.id, widget!.id)).toBe(true);
            expect(service.findById(dash.id)?.widgets).toHaveLength(0);
        });

        it('should return false when removing unknown widget', () => {
            const dash = service.create({ name: 'X', widgets: [], createdBy: 'u1', isPublic: false });
            expect(service.removeWidget(dash.id, 'no-widget')).toBe(false);
        });
    });
});
