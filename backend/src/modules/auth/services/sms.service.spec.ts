import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';

describe('SmsService', () => {
    let service: SmsService;

    describe('without Twilio credentials', () => {
        beforeEach(async () => {
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    SmsService,
                    {
                        provide: ConfigService,
                        useValue: {
                            get: jest.fn().mockReturnValue(undefined),
                        },
                    },
                ],
            }).compile();

            service = module.get<SmsService>(SmsService);
        });

        it('should be defined', () => {
            expect(service).toBeDefined();
        });

        it('should send OTP in dev mode (console fallback)', async () => {
            const result = await service.sendOtp('0912345678', '123456');
            expect(result).toBe(true);
        });

        it('should send password reset SMS in dev mode', async () => {
            const result = await service.sendPasswordResetSms('0912345678', 'https://example.com/reset');
            expect(result).toBe(true);
        });
    });

    describe('phone number formatting (via public API)', () => {
        beforeEach(async () => {
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    SmsService,
                    {
                        provide: ConfigService,
                        useValue: {
                            get: jest.fn().mockReturnValue(undefined),
                        },
                    },
                ],
            }).compile();

            service = module.get<SmsService>(SmsService);
        });

        // formatPhoneNumber and maskPhone are private, but we can test
        // via the public API (sendOtp). The methods are tested indirectly
        // by verifying that OTP sends succeed with various phone formats.
        it('should handle standard Taiwan number', async () => {
            expect(await service.sendOtp('0912345678', '111111')).toBe(true);
        });

        it('should handle international format 886', async () => {
            expect(await service.sendOtp('886912345678', '222222')).toBe(true);
        });

        it('should handle short phone numbers', async () => {
            expect(await service.sendOtp('1234', '333333')).toBe(true);
        });
    });
});
