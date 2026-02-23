import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LineBotService } from './line-bot.service';
import { Account } from '../accounts/entities';

// Mock @line/bot-sdk
jest.mock('@line/bot-sdk', () => ({
    messagingApi: {
        MessagingApiClient: jest.fn().mockImplementation(() => ({
            pushMessage: jest.fn().mockResolvedValue(undefined),
            multicast: jest.fn().mockResolvedValue(undefined),
            broadcast: jest.fn().mockResolvedValue(undefined),
            replyMessage: jest.fn().mockResolvedValue(undefined),
        })),
    },
}));

describe('LineBotService', () => {
    let service: LineBotService;
    let accountRepo: {
        findOne: jest.Mock;
        find: jest.Mock;
        save: jest.Mock;
        update: jest.Mock;
        count: jest.Mock;
        createQueryBuilder: jest.Mock;
    };
    let mockAccountQb: any;

    describe('without LINE credentials', () => {
        beforeEach(async () => {
            mockAccountQb = {
                where: jest.fn().mockReturnThis(),
                getCount: jest.fn().mockResolvedValue(0),
            };

            accountRepo = {
                findOne: jest.fn().mockResolvedValue(null),
                find: jest.fn().mockResolvedValue([]),
                save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
                update: jest.fn().mockResolvedValue(undefined),
                count: jest.fn().mockResolvedValue(0),
                createQueryBuilder: jest.fn().mockReturnValue(mockAccountQb),
            };

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    LineBotService,
                    {
                        provide: ConfigService,
                        useValue: {
                            get: jest.fn().mockReturnValue(undefined),
                        },
                    },
                    { provide: getRepositoryToken(Account), useValue: accountRepo },
                ],
            }).compile();

            service = module.get<LineBotService>(LineBotService);
        });

        it('should be defined', () => {
            expect(service).toBeDefined();
        });

        it('should report disabled when no credentials', () => {
            expect(service.isEnabled()).toBe(false);
        });

        it('should return config with empty values', () => {
            const config = service.getConfig();
            expect(config).toBeDefined();
        });

        it('should return rich menu config object', () => {
            const menu = service.getRichMenuConfig();
            expect(menu).toHaveProperty('size');
            expect(menu).toHaveProperty('areas');
        });

        it('should generate binding link with base64 token', () => {
            const link = service.generateBindingLink('U123');
            expect(link).toContain('/bind-line?token=');
            // Token is base64 of 'U123:<timestamp>'
            const token = link.split('token=')[1];
            const decoded = Buffer.from(token, 'base64').toString();
            expect(decoded).toContain('U123');
        });

        // Account binding tests
        describe('bindAccount', () => {
            it('should bind LINE user to account', async () => {
                const account = { id: 'acc-1', lineUserId: null } as any;
                accountRepo.findOne.mockResolvedValueOnce(account);
                const result = await service.bindAccount('acc-1', 'U123');
                expect(result).toBe(true);
                expect(account.lineUserId).toBe('U123');
                expect(accountRepo.save).toHaveBeenCalled();
            });

            it('should return false when account not found', async () => {
                const result = await service.bindAccount('no-acc', 'U123');
                expect(result).toBe(false);
            });
        });

        describe('unbindAccount', () => {
            it('should unbind LINE user from account', async () => {
                const account = { id: 'acc-1', lineUserId: 'U123' } as any;
                accountRepo.findOne.mockResolvedValueOnce(account);
                const result = await service.unbindAccount('acc-1');
                expect(result).toBe(true);
                expect(accountRepo.save).toHaveBeenCalled();
            });

            it('should return false when account not found', async () => {
                const result = await service.unbindAccount('no-acc');
                expect(result).toBe(false);
            });
        });

        describe('getBindingStatus', () => {
            it('should return bound true when account found', async () => {
                accountRepo.findOne.mockResolvedValueOnce({ id: 'acc-1', lineUserId: 'U123' });
                const result = await service.getBindingStatus('U123');
                expect(result.bound).toBe(true);
                expect(result.accountId).toBe('acc-1');
            });

            it('should return bound false when not found', async () => {
                const result = await service.getBindingStatus('U999');
                expect(result.bound).toBe(false);
            });
        });

        describe('getBoundUserCount', () => {
            it('should return count from repository', async () => {
                mockAccountQb.getCount.mockResolvedValueOnce(42);
                const count = await service.getBoundUserCount();
                expect(count).toBe(42);
            });
        });

        describe('sendOtp', () => {
            it('should return true in unconfigured mode (dev fallback)', async () => {
                const result = await service.sendOtp('U123', '123456');
                expect(result).toBe(true);
            });
        });
    });
});
