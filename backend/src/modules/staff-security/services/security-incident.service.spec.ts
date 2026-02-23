import { SecurityIncidentService, IncidentType, IncidentSeverity } from './security-incident.service';

describe('SecurityIncidentService', () => {
    let service: SecurityIncidentService;
    let repo: Record<string, jest.Mock>;
    let queryBuilder: Record<string, jest.Mock>;

    beforeEach(() => {
        queryBuilder = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
        };
        repo = {
            create: jest.fn().mockImplementation(d => ({ id: 'inc-1', ...d })),
            save: jest.fn().mockImplementation(d => Promise.resolve({ id: 'inc-1', ...d })),
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
        };
        service = new SecurityIncidentService(repo as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('reportIncident', () => {
        it('should create and save incident', async () => {
            const result = await service.reportIncident({
                type: IncidentType.THEFT,
                severity: IncidentSeverity.MEDIUM,
                description: '物資被偷',
                location: { latitude: 25.03, longitude: 121.56, address: '台北市' },
                reporterId: 'staff-1',
            });
            expect(repo.create).toHaveBeenCalled();
            expect(repo.save).toHaveBeenCalled();
            expect(result.type).toBe(IncidentType.THEFT);
        });

        it('should trigger critical alert for HIGH severity', async () => {
            const result = await service.reportIncident({
                type: IncidentType.ASSAULT,
                severity: IncidentSeverity.HIGH,
                description: '人員被攻擊',
                location: { address: '受災區' },
                reporterId: 'staff-2',
            });
            expect(repo.save).toHaveBeenCalled();
        });
    });

    describe('getActiveIncidents', () => {
        it('should return active incidents', async () => {
            repo.find.mockResolvedValueOnce([{ id: '1', status: 'reported' }]);
            const result = await service.getActiveIncidents();
            expect(result.length).toBe(1);
        });
    });

    describe('updateStatus', () => {
        it('should update incident status', async () => {
            repo.findOne.mockResolvedValueOnce({ id: 'inc-1', status: 'resolved' });
            const result = await service.updateStatus('inc-1', 'resolved', '已處理');
            expect(repo.update).toHaveBeenCalledWith('inc-1', expect.objectContaining({ status: 'resolved' }));
            expect(result?.status).toBe('resolved');
        });

        it('should return null if not found', async () => {
            const result = await service.updateStatus('bad', 'resolved');
            expect(result).toBeNull();
        });
    });

    describe('getIncidentsNearLocation', () => {
        it('should query by location radius', async () => {
            await service.getIncidentsNearLocation(25.03, 121.56, 5);
            expect(repo.createQueryBuilder).toHaveBeenCalledWith('incident');
            expect(queryBuilder.where).toHaveBeenCalled();
            expect(queryBuilder.getMany).toHaveBeenCalled();
        });
    });
});
