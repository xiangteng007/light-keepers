import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { AirRaidSheltersSyncService } from './air-raid-shelters-sync.service';
import { AirRaidSheltersService } from './air-raid-shelters.service';

describe('AirRaidSheltersSyncService', () => {
    let service: AirRaidSheltersSyncService;
    let airRaidSheltersService: { importFromCsv: jest.Mock };
    let httpService: { get: jest.Mock };
    let configService: { get: jest.Mock };

    beforeEach(async () => {
        airRaidSheltersService = { importFromCsv: jest.fn().mockResolvedValue({
            totalRows: 0, inserted: 0, updated: 0, skipped: 0, missingCoordinates: [],
        }) };
        httpService = { get: jest.fn() };
        configService = { get: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AirRaidSheltersSyncService,
                { provide: AirRaidSheltersService, useValue: airRaidSheltersService },
                { provide: HttpService, useValue: httpService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get(AirRaidSheltersSyncService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('skips sync (no network call) when AIR_RAID_SHELTER_CSV_URL is not configured', async () => {
        configService.get.mockReturnValue(undefined);

        await service.handleMonthlySync();

        expect(httpService.get).not.toHaveBeenCalled();
        expect(airRaidSheltersService.importFromCsv).not.toHaveBeenCalled();
    });

    it('fetches CSV and imports when AIR_RAID_SHELTER_CSV_URL is configured', async () => {
        configService.get.mockImplementation((key: string) =>
            key === 'AIR_RAID_SHELTER_CSV_URL' ? 'https://data.gov.tw/fake-dataset.csv' : undefined,
        );
        httpService.get.mockReturnValue(of({ data: 'address\nfake address\n' }));

        await service.handleMonthlySync();

        expect(httpService.get).toHaveBeenCalledWith(
            'https://data.gov.tw/fake-dataset.csv',
            expect.objectContaining({ responseType: 'text' }),
        );
        expect(airRaidSheltersService.importFromCsv).toHaveBeenCalledTimes(1);
    });

    it('does not throw when the CSV fetch fails', async () => {
        configService.get.mockImplementation((key: string) =>
            key === 'AIR_RAID_SHELTER_CSV_URL' ? 'https://data.gov.tw/fake-dataset.csv' : undefined,
        );
        httpService.get.mockImplementation(() => {
            throw new Error('network error');
        });

        await expect(service.handleMonthlySync()).resolves.not.toThrow();
        expect(airRaidSheltersService.importFromCsv).not.toHaveBeenCalled();
    });
});
