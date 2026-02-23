import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ExternalApiService } from './external-api.service';
import { of, throwError } from 'rxjs';

describe('ExternalApiService', () => {
    let service: ExternalApiService;
    let httpService: HttpService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ExternalApiService,
                { provide: HttpService, useValue: { get: jest.fn(), post: jest.fn() } },
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('mock-key') } },
            ],
        }).compile();
        service = module.get(ExternalApiService);
        httpService = module.get(HttpService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('getWeather returns mock on failure', async () => {
        jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => new Error('API Error')));
        const result = await service.getWeather(25.0, 121.5);
        expect(result).toBeDefined();
        expect(result!.temperature).toBeDefined();
    });

    it('sendWebhook returns false on failure', async () => {
        jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => new Error('fail')));
        const result = await service.sendWebhook('http://test.com', { test: true });
        expect(result).toBe(false);
    });
});
