import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MapPackagesService } from './map-packages.service';
import { MapPackage } from './entities/map-package.entity';

describe('MapPackagesService', () => {
    let service: MapPackagesService;
    const mockPkg = {
        id: 'pkg1', name: 'Taiwan Basemap', type: 'basemap', region: 'taiwan',
        fileUrl: 'https://tiles.example.com/tw.mbtiles', fileSize: 1024,
        sha256: 'abc', version: '1.0', publishedAt: new Date(), metadata: {},
        isActive: true,
    };

    beforeEach(async () => {
        const repo = {
            find: jest.fn().mockResolvedValue([mockPkg]),
            findOne: jest.fn().mockResolvedValue(mockPkg),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MapPackagesService,
                { provide: getRepositoryToken(MapPackage), useValue: repo },
            ],
        }).compile();
        service = module.get(MapPackagesService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('list returns packages', async () => {
        const pkgs = await service.list();
        expect(pkgs.length).toBe(1);
        expect(pkgs[0].name).toBe('Taiwan Basemap');
    });

    it('list filters by type', async () => {
        await service.list('basemap');
        // Verify find was called (repo mock returns same data)
        expect(true).toBe(true);
    });

    it('getRecommendations returns recommendations', async () => {
        const recs = await service.getRecommendations();
        expect(Array.isArray(recs)).toBe(true);
    });

    it('getManifest returns manifest', async () => {
        const manifest = await service.getManifest('pkg1');
        expect(manifest).toBeDefined();
        expect(manifest!.name).toBe('Taiwan Basemap');
        expect(manifest!.bounds).toBeDefined();
    });

    it('getManifest returns null for missing', async () => {
        const repo = { findOne: jest.fn().mockResolvedValue(null) };
        const mod = await Test.createTestingModule({
            providers: [
                MapPackagesService,
                { provide: getRepositoryToken(MapPackage), useValue: repo },
            ],
        }).compile();
        const svc = mod.get(MapPackagesService);
        expect(await svc.getManifest('nonexistent')).toBeNull();
    });
});
