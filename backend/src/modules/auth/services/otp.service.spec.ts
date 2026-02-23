import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { OtpService } from './otp.service';
import { OtpCode } from '../entities/otp.entity';

describe('OtpService', () => {
    let service: OtpService;
    let otpRepo: {
        findOne: jest.Mock;
        create: jest.Mock;
        save: jest.Mock;
        delete: jest.Mock;
    };

    beforeEach(async () => {
        otpRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((data) => ({ ...data })),
            save: jest.fn().mockResolvedValue(undefined),
            delete: jest.fn().mockResolvedValue({ affected: 0 }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OtpService,
                { provide: getRepositoryToken(OtpCode), useValue: otpRepo },
            ],
        }).compile();

        service = module.get<OtpService>(OtpService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('generateOtp', () => {
        it('should generate a 6-digit code', async () => {
            const code = await service.generateOtp('test@example.com', 'email');
            expect(code).toMatch(/^\d{6}$/);
            expect(otpRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    target: 'test@example.com',
                    targetType: 'email',
                    code,
                    used: false,
                    attempts: 0,
                }),
            );
            expect(otpRepo.save).toHaveBeenCalled();
        });

        it('should throw if within cooldown period', async () => {
            otpRepo.findOne.mockResolvedValueOnce({
                createdAt: new Date(), // Just created
            });
            await expect(service.generateOtp('test@example.com', 'email'))
                .rejects.toThrow(BadRequestException);
        });

        it('should generate for phone target type', async () => {
            const code = await service.generateOtp('0912345678', 'phone');
            expect(code).toMatch(/^\d{6}$/);
        });
    });

    describe('verifyOtp', () => {
        it('should throw if no valid OTP found', async () => {
            await expect(service.verifyOtp('test@example.com', 'email', '123456'))
                .rejects.toThrow('驗證碼不存在或已過期');
        });

        it('should throw if max attempts exceeded', async () => {
            otpRepo.findOne.mockResolvedValueOnce({
                code: '123456',
                attempts: 5, // MAX_ATTEMPTS = 5
                used: false,
            });
            await expect(service.verifyOtp('test@example.com', 'email', '123456'))
                .rejects.toThrow('驗證次數過多');
        });

        it('should throw on wrong code and increment attempts', async () => {
            const record = {
                code: '123456',
                attempts: 0,
                used: false,
            };
            otpRepo.findOne.mockResolvedValueOnce(record);
            await expect(service.verifyOtp('test@example.com', 'email', '999999'))
                .rejects.toThrow('驗證碼錯誤');
            expect(record.attempts).toBe(1);
            expect(otpRepo.save).toHaveBeenCalledWith(record);
        });

        it('should return true and mark as used on correct code', async () => {
            const record = {
                code: '123456',
                attempts: 0,
                used: false,
            };
            otpRepo.findOne.mockResolvedValueOnce(record);
            const result = await service.verifyOtp('test@example.com', 'email', '123456');
            expect(result).toBe(true);
            expect(record.used).toBe(true);
            expect(otpRepo.save).toHaveBeenCalledWith(record);
        });
    });

    describe('cleanupExpiredOtps', () => {
        it('should return affected count', async () => {
            otpRepo.delete.mockResolvedValueOnce({ affected: 5 });
            const count = await service.cleanupExpiredOtps();
            expect(count).toBe(5);
        });

        it('should return 0 when none affected', async () => {
            otpRepo.delete.mockResolvedValueOnce({ affected: null });
            const count = await service.cleanupExpiredOtps();
            expect(count).toBe(0);
        });
    });
});
