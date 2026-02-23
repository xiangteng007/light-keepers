import { Test, TestingModule } from '@nestjs/testing';
import { CourseScraperController } from './course-scraper.controller';
import { CourseScraperService } from './course-scraper.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('CourseScraperController', () => {
    let controller: CourseScraperController;

    beforeEach(async () => {
        const service = {
            getAllSources: jest.fn().mockResolvedValue([]),
            createSource: jest.fn().mockResolvedValue({ id: 's1' }),
            updateSource: jest.fn().mockResolvedValue({ id: 's1' }),
            deleteSource: jest.fn().mockResolvedValue(undefined),
            triggerScrape: jest.fn().mockResolvedValue({ success: 3, failed: 0 }),
            getScrapedCourses: jest.fn().mockResolvedValue([]),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CourseScraperController],
            providers: [{ provide: CourseScraperService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<CourseScraperController>(CourseScraperController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getSources', async () => expect((await controller.getSources()).success).toBe(true));
    it('createSource', async () => expect((await controller.createSource({ name: 'S', url: 'http://a.com' })).success).toBe(true));
    it('updateSource', async () => expect((await controller.updateSource('s1', { name: 'S2' })).success).toBe(true));
    it('deleteSource', async () => expect((await controller.deleteSource('s1')).success).toBe(true));
    it('triggerScrape', async () => expect((await controller.triggerScrape()).success).toBe(true));
    it('getScrapedCourses', async () => expect((await controller.getScrapedCourses()).success).toBe(true));
});
