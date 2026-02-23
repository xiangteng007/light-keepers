import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CloudStorageService } from './cloud-storage.service';
import { MapPackage } from './entities/map-package.entity';

describe('CloudStorageService', () => {
    let service: CloudStorageService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CloudStorageService,
                { provide: ConfigService, useValue: {
                    get: jest.fn().mockImplementation((key: string) => {
                        if (key === 'GCS_MAP_PACKAGES_BUCKET') return 'test-bucket';
                        return undefined; // no GCP_PROJECT_ID = storage disabled
                    }),
                } },
                { provide: getRepositoryToken(MapPackage), useValue: {
                    find: jest.fn().mockResolvedValue([]),
                    findOne: jest.fn().mockResolvedValue({ id: 'p1', type: 'basemap', name: 'Test' }),
                    update: jest.fn().mockResolvedValue({ affected: 1 }),
                } },
            ],
        }).compile();
        service = module.get(CloudStorageService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('isAvailable returns false without GCP project', () => {
        expect(service.isAvailable()).toBe(false);
    });

    it('getSignedDownloadUrl returns null when storage unavailable', async () => {
        const url = await service.getSignedDownloadUrl('p1');
        expect(url).toBeNull();
    });

    it('listStoredPackages returns empty when unavailable', async () => {
        const packages = await service.listStoredPackages();
        expect(packages).toEqual([]);
    });

    it('syncMetadata returns 0 when unavailable', async () => {
        const updated = await service.syncMetadata();
        expect(updated).toBe(0);
    });

    it('getPackageMetadata returns null when unavailable', async () => {
        const metadata = await service.getPackageMetadata('p1');
        expect(metadata).toBeNull();
    });
});
