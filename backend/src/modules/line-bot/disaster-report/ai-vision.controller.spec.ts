import { Test, TestingModule } from '@nestjs/testing';
import { AiVisionController } from './ai-vision.controller';
import { AiClassificationService } from './ai-classification.service';
import { BadRequestException } from '@nestjs/common';
import { CoreJwtGuard, UnifiedRolesGuard } from '../../shared/guards';

describe('AiVisionController', () => {
    let controller: AiVisionController;

    beforeEach(async () => {
        const service = {
            analyzeDisasterImage: jest.fn().mockResolvedValue({ type: 'flood' }),
            analyzeFloodLevel: jest.fn().mockResolvedValue({ level: 2 }),
            assessDamage: jest.fn().mockResolvedValue({ severity: 'high' }),
            classifyDisasterType: jest.fn().mockResolvedValue({ type: 'earthquake' }),
            batchClassify: jest.fn().mockResolvedValue([{ type: 'flood' }]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AiVisionController],
            providers: [{ provide: AiClassificationService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<AiVisionController>(AiVisionController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('analyzeImage returns result', async () => {
        const result = await controller.analyzeImage('base64data', 'image/jpeg', 'test');
        expect(result.success).toBe(true);
    });
    it('analyzeImage throws without imageBase64', async () => {
        await expect(controller.analyzeImage(undefined as any)).rejects.toThrow(BadRequestException);
    });
    it('analyzeFloodLevel returns result', async () => {
        const result = await controller.analyzeFloodLevel('base64data');
        expect(result.success).toBe(true);
    });
    it('assessDamage returns result', async () => {
        const result = await controller.assessDamage('base64data', 'image/jpeg', 'building');
        expect(result.success).toBe(true);
    });
    it('classifyText returns result', async () => {
        const result = await controller.classifyText('earthquake damage');
        expect(result.success).toBe(true);
    });
    it('classifyText throws without description', async () => {
        await expect(controller.classifyText(undefined as any)).rejects.toThrow(BadRequestException);
    });
    it('classifyBatch returns results', async () => {
        const result = await controller.classifyBatch(['flood']);
        expect(result.success).toBe(true);
    });
});
