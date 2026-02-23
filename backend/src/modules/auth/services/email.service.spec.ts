import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

// Mock Resend module
jest.mock('resend', () => ({
    Resend: jest.fn().mockImplementation(() => ({
        emails: {
            send: jest.fn().mockResolvedValue({ data: { id: 'msg-1' }, error: null }),
        },
    })),
}));

describe('EmailService', () => {
    let service: EmailService;
    let configService: { get: jest.Mock };

    describe('without Resend API key', () => {
        beforeEach(async () => {
            configService = {
                get: jest.fn().mockReturnValue(undefined),
            };

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    EmailService,
                    { provide: ConfigService, useValue: configService },
                ],
            }).compile();

            service = module.get<EmailService>(EmailService);
        });

        it('should be defined', () => {
            expect(service).toBeDefined();
        });

        it('should send OTP in dev mode (console fallback)', async () => {
            const result = await service.sendOtp('test@example.com', '123456');
            expect(result).toBe(true);
        });

        it('should send password reset in dev mode (console fallback)', async () => {
            const result = await service.sendPasswordReset('test@example.com', 'https://example.com/reset');
            expect(result).toBe(true);
        });

        it('should send verification email in dev mode', async () => {
            const result = await service.sendVerificationEmail(
                'test@example.com',
                'Test User',
                'https://example.com/verify',
            );
            expect(result.success).toBe(true);
            expect(result.message).toContain('開發模式');
        });
    });

    describe('with Resend API key', () => {
        let mockResendSend: jest.Mock;

        beforeEach(async () => {
            configService = {
                get: jest.fn().mockImplementation((key: string) => {
                    if (key === 'RESEND_API_KEY') return 'test-api-key';
                    if (key === 'RESEND_FROM') return 'noreply@lightkeepers.ngo';
                    return undefined;
                }),
            };

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    EmailService,
                    { provide: ConfigService, useValue: configService },
                ],
            }).compile();

            service = module.get<EmailService>(EmailService);

            // Access internal resend mock
            mockResendSend = (service as any).resend?.emails?.send;
        });

        it('should send OTP via Resend', async () => {
            const result = await service.sendOtp('user@test.com', '654321');
            expect(result).toBe(true);
            if (mockResendSend) {
                expect(mockResendSend).toHaveBeenCalledWith(
                    expect.objectContaining({
                        to: 'user@test.com',
                        subject: expect.stringContaining('驗證碼'),
                    }),
                );
            }
        });

        it('should handle Resend API error gracefully', async () => {
            if (mockResendSend) {
                mockResendSend.mockResolvedValueOnce({ data: null, error: { message: 'Rate limited' } });
            }
            const result = await service.sendOtp('user@test.com', '123456');
            expect(result).toBe(true); // Still returns true (best-effort)
        });

        it('should handle Resend exception gracefully', async () => {
            if (mockResendSend) {
                mockResendSend.mockRejectedValueOnce(new Error('Network error'));
            }
            const result = await service.sendOtp('user@test.com', '123456');
            expect(result).toBe(true); // Still returns true
        });

        it('should send verification email via Resend', async () => {
            const result = await service.sendVerificationEmail(
                'user@test.com',
                'Alice',
                'https://lightkeepers.ngo/verify?token=abc',
            );
            expect(result.success).toBe(true);
        });

        it('should return failure on verification email Resend error', async () => {
            if (mockResendSend) {
                mockResendSend.mockResolvedValueOnce({ data: null, error: { message: 'Invalid recipient' } });
            }
            const result = await service.sendVerificationEmail(
                'bad@test.com',
                'Bob',
                'https://lightkeepers.ngo/verify?token=xyz',
            );
            expect(result.success).toBe(false);
        });
    });
});
