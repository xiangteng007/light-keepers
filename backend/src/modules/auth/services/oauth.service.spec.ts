import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { OAuthService } from './oauth.service';
import { Account } from '../../accounts/entities/account.entity';

// Mock axios
jest.mock('axios');

describe('OAuthService', () => {
    let service: OAuthService;
    let accountRepo: {
        findOne: jest.Mock;
        findOneOrFail: jest.Mock;
        update: jest.Mock;
        create: jest.Mock;
        save: jest.Mock;
    };

    beforeEach(async () => {
        accountRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            findOneOrFail: jest.fn().mockResolvedValue({ id: 'acc-1' }),
            update: jest.fn().mockResolvedValue(undefined),
            create: jest.fn().mockImplementation((data) => ({ id: 'new-acc', ...data })),
            save: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'new-acc', ...data })),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OAuthService,
                { provide: getRepositoryToken(Account), useValue: accountRepo },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key: string, defaultVal?: string) => {
                            // Return empty to trigger mock responses
                            return defaultVal || '';
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<OAuthService>(OAuthService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== LINE OAuth =====
    describe('LINE OAuth', () => {
        describe('getLineAuthorizationUrl', () => {
            it('should generate valid LINE auth URL', () => {
                const url = service.getLineAuthorizationUrl('test-state');
                expect(url).toContain('https://access.line.me/oauth2/v2.1/authorize');
                expect(url).toContain('state=test-state');
                expect(url).toContain('scope=profile+openid+email');
            });
        });

        describe('exchangeLineCode (mock mode)', () => {
            it('should return mock token when LINE not configured', async () => {
                const result = await service.exchangeLineCode('test-code');
                expect(result.access_token).toContain('mock_line_access_token');
                expect(result.token_type).toBe('Bearer');
            });
        });

        describe('getLineProfile (mock mode)', () => {
            it('should return mock profile when LINE not configured', async () => {
                const result = await service.getLineProfile('mock-token');
                expect(result.userId).toBeTruthy();
                expect(result.displayName).toContain('測試用戶');
            });
        });

        describe('unlinkLineAccount', () => {
            it('should throw if account not found', async () => {
                await expect(service.unlinkLineAccount('no-acc'))
                    .rejects.toThrow(BadRequestException);
            });

            it('should throw if LINE not linked', async () => {
                accountRepo.findOne.mockResolvedValueOnce({ id: 'acc-1', lineUserId: null });
                await expect(service.unlinkLineAccount('acc-1'))
                    .rejects.toThrow('帳戶未綁定 LINE');
            });

            it('should unlink LINE account', async () => {
                accountRepo.findOne.mockResolvedValueOnce({ id: 'acc-1', lineUserId: 'U123' });
                const result = await service.unlinkLineAccount('acc-1');
                expect(accountRepo.update).toHaveBeenCalledWith('acc-1', expect.objectContaining({
                    lineUserId: null,
                }));
                expect(result).toBeDefined();
            });
        });

        describe('findOrCreateByLine', () => {
            it('should return existing account when LINE user found', async () => {
                accountRepo.findOne.mockResolvedValueOnce({ id: 'acc-existing', lineUserId: 'U999' });
                const result = await service.findOrCreateByLine('code');
                expect(result.isNew).toBe(false);
                expect(accountRepo.update).toHaveBeenCalled();
            });

            it('should create new account when LINE user not found', async () => {
                accountRepo.findOne.mockResolvedValueOnce(null); // No existing account
                const result = await service.findOrCreateByLine('code');
                expect(result.isNew).toBe(true);
                expect(accountRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                    passwordHash: '',
                    isActive: true,
                }));
            });
        });
    });

    // ===== Google OAuth =====
    describe('Google OAuth', () => {
        describe('getGoogleAuthorizationUrl', () => {
            it('should generate valid Google auth URL', () => {
                const url = service.getGoogleAuthorizationUrl('google-state');
                expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
                expect(url).toContain('state=google-state');
                expect(url).toContain('access_type=offline');
            });
        });

        describe('exchangeGoogleCode (mock mode)', () => {
            it('should return mock user info when Google not configured', async () => {
                const result = await service.exchangeGoogleCode('test-code');
                expect(result.sub).toBeTruthy();
                expect(result.email).toContain('@gmail.com');
                expect(result.email_verified).toBe(true);
            });
        });

        describe('unlinkGoogleAccount', () => {
            it('should throw if account not found', async () => {
                await expect(service.unlinkGoogleAccount('no-acc'))
                    .rejects.toThrow(BadRequestException);
            });

            it('should throw if Google not linked', async () => {
                accountRepo.findOne.mockResolvedValueOnce({ id: 'acc-1', googleId: null });
                await expect(service.unlinkGoogleAccount('acc-1'))
                    .rejects.toThrow('帳戶未綁定 Google');
            });

            it('should unlink Google account', async () => {
                accountRepo.findOne.mockResolvedValueOnce({ id: 'acc-1', googleId: 'g123' });
                await service.unlinkGoogleAccount('acc-1');
                expect(accountRepo.update).toHaveBeenCalledWith('acc-1', expect.objectContaining({
                    googleId: null,
                }));
            });
        });

        describe('findOrCreateByGoogle', () => {
            it('should return existing account when Google user found', async () => {
                accountRepo.findOne.mockResolvedValueOnce({ id: 'acc-g', googleId: 'g999' });
                const result = await service.findOrCreateByGoogle('code');
                expect(result.isNew).toBe(false);
            });

            it('should link Google to existing email account', async () => {
                accountRepo.findOne
                    .mockResolvedValueOnce(null)   // No Google account
                    .mockResolvedValueOnce({ id: 'acc-email', email: 'test@gmail.com' }); // Existing email
                const result = await service.findOrCreateByGoogle('code');
                expect(result.isNew).toBe(false);
                expect(accountRepo.update).toHaveBeenCalled();
            });

            it('should create new account when no match found', async () => {
                accountRepo.findOne
                    .mockResolvedValueOnce(null)   // No Google account
                    .mockResolvedValueOnce(null);   // No email match
                const result = await service.findOrCreateByGoogle('code');
                expect(result.isNew).toBe(true);
            });
        });
    });
});
