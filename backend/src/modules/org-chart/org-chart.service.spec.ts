import { Test, TestingModule } from '@nestjs/testing';
import { OrgChartService } from './org-chart.service';

describe('OrgChartService', () => {
    let service: OrgChartService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [OrgChartService],
        }).compile();
        service = module.get(OrgChartService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('constructor creates default nodes', () => {
        expect(service.getNode('root')).toBeDefined();
        expect(service.getNode('north')).toBeDefined();
    });

    it('addNode creates and returns node', () => {
        const node = service.addNode({ name: 'Team A', type: 'team', parentId: 'north' });
        expect(node.id).toBeDefined();
        expect(node.name).toBe('Team A');
    });

    it('updateNode modifies node', () => {
        const updated = service.updateNode('north', { name: '北區改名' });
        expect(updated!.name).toBe('北區改名');
    });

    it('deleteNode prevents deleting parent', () => {
        expect(service.deleteNode('root')).toBe(false);
    });

    it('deleteNode removes leaf node', () => {
        const leaf = service.addNode({ name: 'Leaf', type: 'unit', parentId: 'south' });
        expect(service.deleteNode(leaf.id)).toBe(true);
    });

    it('getChildren returns children', () => {
        expect(service.getChildren('root').length).toBe(3);
    });

    it('getTree returns tree', () => {
        const tree = service.getTree('root');
        expect(tree).not.toBeNull();
        expect(tree!.children.length).toBe(3);
    });

    it('getPath returns path to root', () => {
        const path = service.getPath('north');
        expect(path.length).toBe(2);
        expect(path[0].id).toBe('root');
    });

    it('search finds by name', () => {
        expect(service.search('北區').length).toBe(1);
    });

    it('moveNode moves node', () => {
        expect(service.moveNode('north', 'south')).toBe(true);
    });

    it('moveNode prevents circular', () => {
        const child = service.addNode({ name: 'C', type: 'team', parentId: 'north' });
        expect(service.moveNode('north', child.id)).toBe(false);
    });

    it('getStats returns stats', () => {
        const stats = service.getStats();
        expect(stats.totalNodes).toBeGreaterThan(0);
    });

    it('exportFlat returns array', () => {
        expect(service.exportFlat().length).toBeGreaterThan(0);
    });
});
