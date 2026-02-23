import { CapAdapterService } from './cap-adapter.service';

describe('CapAdapterService', () => {
    let service: CapAdapterService;

    beforeEach(() => {
        service = new CapAdapterService();
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('toCapAlert', () => {
        it('should convert internal alert to CAP format', () => {
            const cap = service.toCapAlert({
                id: 'a1', title: '地震警報', description: '6.2級地震',
                severity: 'critical', category: 'earthquake',
            });
            expect(cap.identifier).toBe('LK-a1');
            expect(cap.status).toBe('Actual');
            expect(cap.info![0].severity).toBe('Extreme');
            expect(cap.info![0].category).toContain('Geo');
        });

        it('should handle unknown severity', () => {
            const cap = service.toCapAlert({
                id: 'a2', title: 'test', description: 'desc',
                severity: 'unknown', category: 'other',
            });
            expect(cap.info![0].severity).toBe('Unknown');
        });
    });

    describe('toCapXml', () => {
        it('should generate valid CAP XML', () => {
            const cap = service.toCapAlert({
                id: 'a3', title: '颱風警報', description: '強颱來襲',
                severity: 'high', category: 'typhoon',
            });
            const xml = service.toCapXml(cap);
            expect(xml).toContain('<?xml');
            expect(xml).toContain('<alert');
            expect(xml).toContain('LK-a3');
            expect(xml).toContain('<severity>Severe</severity>');
        });
    });

    describe('fromCapXml', () => {
        it('should parse CAP XML to internal format', () => {
            const xml = `<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
                <identifier>TW-001</identifier>
                <sender>CWA</sender>
                <info><headline>Test Alert</headline><description>Details</description><severity>Severe</severity></info>
            </alert>`;
            const result = service.fromCapXml(xml);
            expect(result.id).toBe('TW-001');
            expect(result.title).toBe('Test Alert');
        });

        it('should throw for invalid XML', () => {
            expect(() => service.fromCapXml('<invalid>data</invalid>')).toThrow('Invalid CAP XML');
        });
    });
});
