import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ImageRecognitionService } from './image-recognition.service';

describe('ImageRecognitionService', () => {
    let service: ImageRecognitionService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ImageRecognitionService,
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
            ],
        }).compile();
        service = module.get(ImageRecognitionService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('analyzeDisasterImage returns mock when no API key', async () => {
        const result = await service.analyzeDisasterImage('base64data');
        expect(result.damageType).toBe('building_collapse');
        expect(result.severity).toBe(3);
    });

    it('classifyDamage returns classification', async () => {
        const result = await service.classifyDamage('base64data');
        expect(result.type).toBe('building_collapse');
        expect(result.confidence).toBe(0.85);
    });

    it('detectHazards returns hazards', async () => {
        const result = await service.detectHazards('base64data');
        expect(result.length).toBeGreaterThan(0);
    });

    it('detectPersons returns detections', async () => {
        const result = await service.detectPersons('base64data');
        expect(result.length).toBeGreaterThan(0);
    });

    it('compareImages returns comparison', async () => {
        const result = await service.compareImages('img1', 'img2');
        expect(result).toHaveProperty('similarity');
        expect(result).toHaveProperty('isMatch');
    });
});
