import { Test, TestingModule } from '@nestjs/testing';
import { SosController } from './sos.controller';
import { SosService } from './sos.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('SosController', () => {
    let controller: SosController;
    const mockUser = { uid: 'u1', id: 'u1' } as any;

    beforeEach(async () => {
        const service = {
            trigger: jest.fn().mockResolvedValue({ sosId: 'sos1', status: 'active' }),
            ack: jest.fn().mockResolvedValue({ sosId: 'sos1', status: 'acknowledged' }),
            resolve: jest.fn().mockResolvedValue({ sosId: 'sos1', status: 'resolved' }),
            findActive: jest.fn().mockResolvedValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [SosController],
            providers: [{ provide: SosService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<SosController>(SosController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('trigger sends SOS signal', async () => {
        const result = await controller.trigger('ms1', {} as any, mockUser);
        expect(result).toBeDefined();
    });

    it('ack acknowledges SOS', async () => {
        const result = await controller.ack('sos1', {} as any, mockUser);
        expect(result).toBeDefined();
    });

    it('resolve resolves SOS', async () => {
        const result = await controller.resolve('sos1', {} as any, mockUser);
        expect(result).toBeDefined();
    });

    it('getActive returns active SOS signals', async () => {
        const result = await controller.getActive('ms1');
        expect(result).toBeDefined();
    });
});
