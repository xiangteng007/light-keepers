import { CourseScraperService } from './course-scraper.service';

describe('CourseScraperService', () => {
    let service: CourseScraperService;
    let sourceRepo: Record<string, jest.Mock>;
    let courseRepo: Record<string, jest.Mock>;

    beforeEach(() => {
        sourceRepo = {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation(d => ({ id: 'src-1', ...d })),
            save: jest.fn().mockImplementation(d => Promise.resolve(d)),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            delete: jest.fn().mockResolvedValue({ affected: 1 }),
        };
        courseRepo = {
            find: jest.fn().mockResolvedValue([]),
            save: jest.fn().mockImplementation(d => Promise.resolve(Array.isArray(d) ? d : [d])),
            delete: jest.fn().mockResolvedValue({ affected: 0 }),
            create: jest.fn().mockImplementation(d => d),
        };
        service = new CourseScraperService(sourceRepo as any, courseRepo as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('getAllSources', () => {
        it('should return all sources', async () => {
            sourceRepo.find.mockResolvedValueOnce([{ id: 'src-1' }]);
            const sources = await service.getAllSources();
            expect(sources.length).toBe(1);
        });
    });

    describe('createSource', () => {
        it('should create source', async () => {
            const source = await service.createSource({ name: 'TestSource', url: 'https://test.com' });
            expect(sourceRepo.create).toHaveBeenCalled();
            expect(sourceRepo.save).toHaveBeenCalled();
        });
    });

    describe('updateSource', () => {
        it('should update existing source', async () => {
            sourceRepo.findOne.mockResolvedValueOnce({ id: 'src-1', name: 'Old' });
            sourceRepo.save.mockResolvedValueOnce({ id: 'src-1', name: 'New' });
            const updated = await service.updateSource('src-1', { name: 'New' });
            expect(updated).toBeDefined();
        });

        it('should return null for unknown source', async () => {
            const result = await service.updateSource('bad', { name: 'X' });
            expect(result).toBeNull();
        });
    });

    describe('deleteSource', () => {
        it('should delete source', async () => {
            await service.deleteSource('src-1');
            expect(sourceRepo.delete).toHaveBeenCalledWith('src-1');
        });
    });

    describe('getScrapedCourses', () => {
        it('should return all courses', async () => {
            courseRepo.find.mockResolvedValueOnce([{ id: 'c-1' }]);
            const courses = await service.getScrapedCourses();
            expect(courses.length).toBe(1);
        });

        it('should filter by sourceId', async () => {
            await service.getScrapedCourses('src-1');
            expect(courseRepo.find).toHaveBeenCalled();
        });
    });

    describe('categorizeByTitle', () => {
        it('should categorize earthquake training', () => {
            const cat = (service as any).categorizeByTitle('地震防災訓練課程');
            expect(cat).toBeDefined();
        });

        it('should categorize first aid', () => {
            const cat = (service as any).categorizeByTitle('急救與CPR訓練');
            expect(cat).toBeDefined();
        });

        it('should handle generic title', () => {
            const cat = (service as any).categorizeByTitle('一般志工培訓');
            expect(cat).toBeDefined();
        });
    });

    describe('getDefaultSelectors', () => {
        it('should return selectors for known URL', () => {
            const selectors = (service as any).getDefaultSelectors('https://www.nfa.gov.tw/courses');
            expect(selectors).toBeDefined();
        });

        it('should return selectors for unknown URL', () => {
            const selectors = (service as any).getDefaultSelectors('https://unknown.com');
            expect(selectors).toBeDefined();
        });
    });
});
