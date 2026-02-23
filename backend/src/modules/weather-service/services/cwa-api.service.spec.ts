import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { CwaApiService, CWA_DATASETS } from './cwa-api.service';

describe('CwaApiService', () => {
    let service: CwaApiService;
    let httpService: any;

    const mockResponse = {
        data: {
            success: 'true',
            result: { resource_id: 'test', fields: [] },
            records: { location: [{ locationName: '台北市' }] },
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CwaApiService,
                {
                    provide: HttpService,
                    useValue: {
                        get: jest.fn().mockReturnValue(of(mockResponse)),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue('test-api-key'),
                    },
                },
            ],
        }).compile();

        service = module.get<CwaApiService>(CwaApiService);
        httpService = module.get(HttpService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('isAvailable', () => {
        it('should return true when API key is configured', () => {
            expect(service.isAvailable()).toBe(true);
        });

        it('should return false when API key is missing', async () => {
            const module = await Test.createTestingModule({
                providers: [
                    CwaApiService,
                    { provide: HttpService, useValue: { get: jest.fn() } },
                    { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
                ],
            }).compile();
            const svc = module.get<CwaApiService>(CwaApiService);
            expect(svc.isAvailable()).toBe(false);
        });
    });

    describe('fetch', () => {
        it('should fetch data from CWA API', async () => {
            const result = await service.fetch('F-C0032-001');
            expect(httpService.get).toHaveBeenCalled();
            expect(result).toEqual(mockResponse.data.records);
        });

        it('should use cache on second call', async () => {
            await service.fetch('F-C0032-001');
            await service.fetch('F-C0032-001');
            // Only one HTTP call despite two fetches
            expect(httpService.get).toHaveBeenCalledTimes(1);
        });

        it('should bypass cache when useCache=false', async () => {
            await service.fetch('F-C0032-001');
            await service.fetch('F-C0032-001', {}, false);
            expect(httpService.get).toHaveBeenCalledTimes(2);
        });

        it('should return null on API error', async () => {
            httpService.get.mockReturnValueOnce(throwError(() => new Error('Network error')));
            const result = await service.fetch('F-C0032-001', {}, false);
            expect(result).toBeNull();
        });

        it('should return null on unsuccessful response', async () => {
            httpService.get.mockReturnValueOnce(of({
                data: { success: 'false', records: null },
            }));
            const result = await service.fetch('F-C0032-001', {}, false);
            expect(result).toBeNull();
        });

        it('should return null when API key unavailable', async () => {
            const module = await Test.createTestingModule({
                providers: [
                    CwaApiService,
                    { provide: HttpService, useValue: { get: jest.fn() } },
                    { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
                ],
            }).compile();
            const svc = module.get<CwaApiService>(CwaApiService);
            const result = await svc.fetch('F-C0032-001');
            expect(result).toBeNull();
        });

        it('should pass params to API', async () => {
            await service.fetch('F-C0032-001', { locationName: '台北市' }, false);
            expect(httpService.get).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    params: expect.objectContaining({ locationName: '台北市' }),
                }),
            );
        });
    });

    describe('clearCache', () => {
        it('should clear cache and re-fetch on next call', async () => {
            await service.fetch('F-C0032-001');
            service.clearCache();
            await service.fetch('F-C0032-001');
            expect(httpService.get).toHaveBeenCalledTimes(2);
        });
    });

    describe('getDatasets', () => {
        it('should return CWA_DATASETS', () => {
            const datasets = service.getDatasets();
            expect(datasets).toBe(CWA_DATASETS);
            expect(datasets.GENERAL_36H).toBe('F-C0032-001');
            expect(datasets.ALERTS).toBe('W-C0033-001');
        });
    });
});
