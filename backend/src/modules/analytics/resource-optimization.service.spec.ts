import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ResourceOptimizationService } from './resource-optimization.service';

describe('ResourceOptimizationService', () => {
    let service: ResourceOptimizationService;
    let dataSource: { query: jest.Mock };

    beforeEach(async () => {
        dataSource = { query: jest.fn().mockResolvedValue([]) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ResourceOptimizationService,
                { provide: DataSource, useValue: dataSource },
            ],
        }).compile();

        service = module.get<ResourceOptimizationService>(ResourceOptimizationService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== Resource Allocation =====
    describe('generateResourceAllocation', () => {
        it('should return empty when no incidents', async () => {
            const result = await service.generateResourceAllocation();
            expect(result).toEqual([]);
        });

        it('should match resources to flood incidents', async () => {
            dataSource.query
                .mockResolvedValueOnce([  // getActiveIncidentsByLocation
                    { location: '台南市', type: 'flood', severity: 'critical', count: '10' },
                ])
                .mockResolvedValueOnce([  // getAvailableResources
                    { id: 'r1', name: '飲用水', category: 'water', quantity: 200, location: '台北倉庫' },
                    { id: 'r2', name: '毛毯', category: 'blankets', quantity: 100, location: '高雄倉庫' },
                ]);

            const result = await service.generateResourceAllocation();
            expect(result.length).toBeGreaterThanOrEqual(1);
            expect(result[0].recommendedLocation).toBe('台南市');
            expect(result[0].priority).toBe('urgent'); // critical severity
        });
    });

    // ===== Volunteer Dispatch =====
    describe('generateVolunteerDispatch', () => {
        it('should return empty when no pending tasks', async () => {
            const result = await service.generateVolunteerDispatch();
            expect(result).toEqual([]);
        });

        it('should match volunteers to tasks by skills', async () => {
            dataSource.query
                .mockResolvedValueOnce([  // getPendingTasks
                    { id: 't1', title: '搜救行動', description: '山區搜救', location: '台中市', priority: 'high', required_skills: 'rescue,medical' },
                ])
                .mockResolvedValueOnce([  // getAvailableVolunteers
                    { id: 'v1', name: '王大明', status: 'available', skills: 'rescue,climbing', region: '台中' },
                    { id: 'v2', name: '李小華', status: 'available', skills: 'cooking', region: '台北' },
                ]);

            const result = await service.generateVolunteerDispatch();
            expect(result.length).toBeGreaterThanOrEqual(1);
            // v1 should score higher (skill + location match)
            expect(result[0].volunteerName).toBe('王大明');
            expect(result[0].matchScore).toBeGreaterThan(50);
        });
    });

    // ===== Optimization Report =====
    describe('generateOptimizationReport', () => {
        it('should generate report with empty data', async () => {
            const result = await service.generateOptimizationReport();
            expect(result.generatedAt).toBeDefined();
            expect(result.resourceAllocations).toEqual([]);
            expect(result.volunteerDispatches).toEqual([]);
            expect(result.efficiencyScore).toBeGreaterThanOrEqual(0);
            expect(result.recommendations).toBeDefined();
        });

        it('should include no-volunteer recommendation', async () => {
            const result = await service.generateOptimizationReport();
            expect(result.recommendations).toContain('No active volunteers available - consider sending alerts');
        });
    });
});
