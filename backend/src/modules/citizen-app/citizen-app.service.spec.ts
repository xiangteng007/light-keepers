import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CitizenAppService } from './citizen-app.service';

describe('CitizenAppService', () => {
    let service: CitizenAppService;
    let eventEmitter: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CitizenAppService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key: string) => {
                            if (key === 'APP_VERSION_IOS') return '2.0.0';
                            if (key === 'APP_VERSION_ANDROID') return '2.0.0';
                            if (key === 'APP_MIN_VERSION') return '1.5.0';
                            return null;
                        }),
                    },
                },
                {
                    provide: EventEmitter2,
                    useValue: {
                        emit: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<CitizenAppService>(CitizenAppService);
        eventEmitter = module.get(EventEmitter2);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== Anonymous Session =====
    describe('createAnonymousSession', () => {
        it('should create anonymous session with token', () => {
            const session = service.createAnonymousSession('device-123');
            expect(session.token).toBeDefined();
            expect(session.deviceId).toBe('device-123');
            expect(session.reportCount).toBe(0);
        });
    });

    describe('validateSession', () => {
        it('should validate existing session', () => {
            const session = service.createAnonymousSession('device-1');
            const validated = service.validateSession(session.token);
            expect(validated).toBeDefined();
            expect(validated!.deviceId).toBe('device-1');
        });

        it('should return null for invalid token', () => {
            expect(service.validateSession('invalid-token')).toBeNull();
        });
    });

    // ===== Report Submission =====
    describe('submitReport', () => {
        it('should submit disaster report', async () => {
            const session = service.createAnonymousSession('device-1');
            const report = await service.submitReport(session.token, {
                type: 'earthquake',
                description: '台北發生地震',
                location: { lat: 25.033, lng: 121.565 },
                severity: 'high',
            });
            expect(report.id).toBeDefined();
            expect(report.status).toBe('submitted');
            expect(report.isAnonymous).toBe(false); // has valid session
        });
    });

    describe('getReportStatus', () => {
        it('should return report status', async () => {
            const session = service.createAnonymousSession('device-1');
            const report = await service.submitReport(session.token, {
                type: 'flood',
                description: '道路淹水',
                location: { lat: 25.0, lng: 121.5 },
            });
            const status = service.getReportStatus(report.id);
            expect(status).toBeDefined();
            expect(status!.status).toBe('submitted');
        });

        it('should return null for unknown report', () => {
            expect(service.getReportStatus('nonexistent')).toBeNull();
        });
    });

    // ===== Public Data =====
    describe('getNearbyAlerts', () => {
        it('should return nearby alerts', () => {
            const alerts = service.getNearbyAlerts(25.033, 121.565);
            expect(Array.isArray(alerts)).toBe(true);
        });
    });

    describe('getNearbyShelters', () => {
        it('should return nearby shelters', () => {
            const shelters = service.getNearbyShelters(25.033, 121.565, 5);
            expect(Array.isArray(shelters)).toBe(true);
        });
    });

    describe('getPublicAnnouncements', () => {
        it('should return announcements', () => {
            const announcements = service.getPublicAnnouncements();
            expect(Array.isArray(announcements)).toBe(true);
        });
    });

    // ===== Version Check =====
    describe('checkAppVersion', () => {
        it('should check iOS version', () => {
            const result = service.checkAppVersion('1.0.0', 'ios');
            expect(result).toBeDefined();
            expect(result.currentVersion).toBe('1.0.0');
        });

        it('should check Android version', () => {
            const result = service.checkAppVersion('2.0.0', 'android');
            expect(result).toBeDefined();
        });
    });

    // ===== Offline Data =====
    describe('getOfflineDataPackage', () => {
        it('should return offline package for region', () => {
            const pkg = service.getOfflineDataPackage('taipei');
            expect(pkg.region).toBe('taipei');
            expect(pkg.shelters).toBeDefined();
            expect(pkg.emergencyContacts).toBeDefined();
        });
    });
});
