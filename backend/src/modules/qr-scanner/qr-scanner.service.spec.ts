import { Test, TestingModule } from '@nestjs/testing';
import { QrScannerService } from './qr-scanner.service';

describe('QrScannerService', () => {
    let service: QrScannerService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [QrScannerService],
        }).compile();
        service = module.get(QrScannerService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('parseQRCode parses equipment prefix', () => {
        const result = service.parseQRCode('EQ:eq123');
        expect(result.type).toBe('equipment');
        expect(result.id).toBe('eq123');
    });

    it('parseQRCode parses volunteer prefix', () => {
        const result = service.parseQRCode('VOL:v001');
        expect(result.type).toBe('volunteer');
        expect(result.id).toBe('v001');
    });

    it('parseQRCode parses victim prefix', () => {
        expect(service.parseQRCode('VIC:vic1').type).toBe('victim');
    });

    it('parseQRCode parses checkpoint prefix', () => {
        expect(service.parseQRCode('CP:cp1').type).toBe('checkpoint');
    });

    it('parseQRCode parses resource prefix', () => {
        expect(service.parseQRCode('RES:r1').type).toBe('resource');
    });

    it('parseQRCode parses URL with entity path', () => {
        const result = service.parseQRCode('https://example.com/equipment/123');
        expect(result.type).toBe('equipment');
        expect(result.id).toBe('123');
    });

    it('parseQRCode parses generic URL', () => {
        const result = service.parseQRCode('https://example.com/dashboard');
        expect(result.type).toBe('url');
    });

    it('parseQRCode parses JSON', () => {
        const result = service.parseQRCode('{"type":"checkpoint","id":"cp99"}');
        expect(result.type).toBe('checkpoint');
        expect(result.id).toBe('cp99');
    });

    it('parseQRCode returns unknown for unrecognized', () => {
        expect(service.parseQRCode('random text').type).toBe('unknown');
    });

    it('generateEquipmentQR returns prefixed string', () => {
        expect(service.generateEquipmentQR('eq1', 'SN001')).toBe('EQ:eq1');
    });

    it('generateVolunteerQR returns prefixed string', () => {
        expect(service.generateVolunteerQR('v1')).toBe('VOL:v1');
    });

    it('generateVictimQR returns prefixed string', () => {
        expect(service.generateVictimQR('vic1')).toBe('VIC:vic1');
    });

    it('generateCheckpointQR returns JSON', () => {
        const qr = service.generateCheckpointQR('cp1', 'Gate A');
        const parsed = JSON.parse(qr);
        expect(parsed.type).toBe('checkpoint');
        expect(parsed.id).toBe('cp1');
    });
});
