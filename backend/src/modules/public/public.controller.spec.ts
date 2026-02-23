import { Test, TestingModule } from '@nestjs/testing';
import { PublicController } from './public.controller';
import { AnnouncementsService } from '../announcements/announcements.service';
import { PublicResourcesService } from '../public-resources/public-resources.service';
import { NcdrAlertsService } from '../ncdr-alerts/ncdr-alerts.service';
import { WeatherService } from '../weather-service/weather.service';

describe('PublicController', () => {
    let controller: PublicController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PublicController],
            providers: [
                { provide: AnnouncementsService, useValue: { findAll: jest.fn().mockResolvedValue([]) } },
                { provide: PublicResourcesService, useValue: { getShelters: jest.fn().mockResolvedValue([]), getAedLocations: jest.fn().mockResolvedValue([]) } },
                { provide: NcdrAlertsService, useValue: { findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }) } },
                { provide: WeatherService, useValue: { getCurrentWeather: jest.fn().mockResolvedValue({}), getAllLocationsWeather: jest.fn().mockResolvedValue([]) } },
            ],
        }).compile();

        controller = module.get<PublicController>(PublicController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('ping returns status', () => {
        const result = controller.ping();
        expect(result.status).toBe('ok');
    });
    it('getPublicInfo returns info', () => {
        const result = controller.getPublicInfo();
        expect(result).toHaveProperty('name');
    });
    it('getPublicAnnouncements returns data', async () => {
        const result = await controller.getPublicAnnouncements();
        expect(result).toHaveProperty('data');
    });
    it('getPublicShelters returns data', async () => {
        const result = await controller.getPublicShelters();
        expect(result).toHaveProperty('data');
    });
});
