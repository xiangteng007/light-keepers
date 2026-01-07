import { Test, TestingModule } from '@nestjs/testing';
import { OrgChartController } from './org-chart.controller';
import { OrgChartService } from './org-chart.service';

describe('OrgChartController', () => {
    let controller: OrgChartController;
    let service: OrgChartService;

    const mockService = {
        addNode: jest.fn(),
        getNode: jest.fn(),
        updateNode: jest.fn(),
        deleteNode: jest.fn(),
        getChildren: jest.fn(),
        getTree: jest.fn(),
        getPath: jest.fn(),
        search: jest.fn(),
        moveNode: jest.fn(),
        getStats: jest.fn(),
        exportFlat: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [OrgChartController],
            providers: [
                { provide: OrgChartService, useValue: mockService },
            ],
        }).compile();

        controller = module.get<OrgChartController>(OrgChartController);
        service = module.get<OrgChartService>(OrgChartService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('addNode', () => {
        it('should create a new node', async () => {
            const dto = { name: 'New Team', type: 'team', parentId: 'n1' };
            const newNode = { id: 'n2', ...dto };
            mockService.addNode.mockResolvedValue(newNode);

            const result = await controller.addNode(dto);

            expect(service.addNode).toHaveBeenCalledWith(dto);
            expect(result).toEqual(newNode);
        });
    });

    describe('getNode', () => {
        it('should return single node by ID', async () => {
            const node = { id: 'n1', name: 'Division A' };
            mockService.getNode.mockResolvedValue(node);

            const result = await controller.getNode('n1');

            expect(service.getNode).toHaveBeenCalledWith('n1');
            expect(result).toEqual(node);
        });
    });

    describe('updateNode', () => {
        it('should update existing node', async () => {
            const updates = { name: 'Updated Team' };
            const updatedNode = { id: 'n1', name: 'Updated Team' };
            mockService.updateNode.mockResolvedValue(updatedNode);

            const result = await controller.updateNode('n1', updates);

            expect(service.updateNode).toHaveBeenCalledWith('n1', updates);
            expect(result).toEqual(updatedNode);
        });
    });

    describe('deleteNode', () => {
        it('should delete node by ID', async () => {
            mockService.deleteNode.mockReturnValue(true);

            const result = await controller.deleteNode('n1');

            expect(service.deleteNode).toHaveBeenCalledWith('n1');
            expect(result).toEqual({ success: true });
        });
    });

    describe('getChildren', () => {
        it('should return child nodes', async () => {
            const children = [{ id: 'n2' }, { id: 'n3' }];
            mockService.getChildren.mockResolvedValue(children);

            const result = await controller.getChildren('n1');

            expect(service.getChildren).toHaveBeenCalledWith('n1');
            expect(result).toEqual(children);
        });
    });

    describe('getTree', () => {
        it('should return org tree from root', async () => {
            const tree = { id: 'root', name: 'Organization', children: [] };
            mockService.getTree.mockResolvedValue(tree);

            const result = await controller.getTree('root');

            expect(service.getTree).toHaveBeenCalledWith('root');
            expect(result).toEqual(tree);
        });
    });

    describe('getPath', () => {
        it('should return path from root to node', async () => {
            const path = [{ id: 'root' }, { id: 'n1' }, { id: 'n2' }];
            mockService.getPath.mockResolvedValue(path);

            const result = await controller.getPath('n2');

            expect(service.getPath).toHaveBeenCalledWith('n2');
            expect(result).toEqual(path);
        });
    });

    describe('search', () => {
        it('should search nodes by query', async () => {
            const results = [{ id: 'n1', name: 'Test Team' }];
            mockService.search.mockResolvedValue(results);

            const result = await controller.search('Test');

            expect(service.search).toHaveBeenCalledWith('Test');
            expect(result).toEqual(results);
        });
    });

    describe('moveNode', () => {
        it('should move node to new parent', async () => {
            mockService.moveNode.mockReturnValue(true);

            const result = await controller.moveNode('n2', { newParentId: 'n3' });

            expect(service.moveNode).toHaveBeenCalledWith('n2', 'n3');
            expect(result).toEqual({ success: true });
        });
    });

    describe('getStats', () => {
        it('should return organization statistics', async () => {
            const stats = { totalNodes: 50, maxDepth: 4 };
            mockService.getStats.mockResolvedValue(stats);

            const result = await controller.getStats();

            expect(service.getStats).toHaveBeenCalled();
            expect(result).toEqual(stats);
        });
    });

    describe('exportFlat', () => {
        it('should export flat list of all nodes', async () => {
            const flatList = [{ id: 'root' }, { id: 'n1' }];
            mockService.exportFlat.mockResolvedValue(flatList);

            const result = await controller.exportFlat();

            expect(service.exportFlat).toHaveBeenCalled();
            expect(result).toEqual(flatList);
        });
    });
});
