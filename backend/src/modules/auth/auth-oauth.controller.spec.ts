import { Test, TestingModule } from '@nestjs/testing';
import { AuthOAuthController } from './auth-oauth.controller';
import { OAuthService } from './services/oauth.service';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { ConfigService } from '@nestjs/config';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('AuthOAuthController', () => {
    let controller: AuthOAuthController;

    beforeEach(async () => {
        const oauthService = {
            getLineAuthorizationUrl: jest.fn().mockReturnValue('https://line.me/oauth?state=abc'),
            handleLineCallback: jest.fn().mockResolvedValue({ account: { id: 'u1' }, isNew: false }),
            linkLineAccount: jest.fn().mockResolvedValue({ lineUserId: 'L001', lineDisplayName: 'Test' }),
            unlinkLineAccount: jest.fn().mockResolvedValue(undefined),
            getGoogleAuthorizationUrl: jest.fn().mockReturnValue('https://accounts.google.com/oauth?state=abc'),
            handleGoogleCallback: jest.fn().mockResolvedValue({ account: { id: 'u1' }, isNew: false }),
            linkGoogleAccount: jest.fn().mockResolvedValue({ googleId: 'G001', googleEmail: 'test@gmail.com' }),
            unlinkGoogleAccount: jest.fn().mockResolvedValue(undefined),
        };

        const authService = {
            generateTokens: jest.fn().mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' }),
        };

        const refreshTokenService = {
            storeRefreshToken: jest.fn().mockResolvedValue(undefined),
        };

        const configService = {
            get: jest.fn().mockImplementation((key: string) => {
                if (key === 'FRONTEND_URL') return 'https://app.test.com';
                return undefined;
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthOAuthController],
            providers: [
                { provide: OAuthService, useValue: oauthService },
                { provide: AuthService, useValue: authService },
                { provide: RefreshTokenService, useValue: refreshTokenService },
                { provide: ConfigService, useValue: configService },
            ],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<AuthOAuthController>(AuthOAuthController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('lineAuth redirects to LINE OAuth URL', async () => {
        const res = { redirect: jest.fn() } as any;
        await controller.lineAuth('/', res);
        expect(res.redirect).toHaveBeenCalled();
    });

    it('googleAuth redirects to Google OAuth URL', async () => {
        const res = { redirect: jest.fn() } as any;
        await controller.googleAuth('/', res);
        expect(res.redirect).toHaveBeenCalled();
    });

    it('linkLine links LINE account', async () => {
        const req = { user: { id: 'u1' } } as any;
        const result = await controller.linkLine('code123', req);
        expect(result.success).toBe(true);
        expect(result.message).toContain('LINE');
    });

    it('unlinkLine unlinks LINE account', async () => {
        const req = { user: { id: 'u1' } } as any;
        const result = await controller.unlinkLine(req);
        expect(result.success).toBe(true);
    });

    it('linkGoogle links Google account', async () => {
        const req = { user: { id: 'u1' } } as any;
        const result = await controller.linkGoogle('code123', req);
        expect(result.success).toBe(true);
        expect(result.message).toContain('Google');
    });

    it('unlinkGoogle unlinks Google account', async () => {
        const req = { user: { id: 'u1' } } as any;
        const result = await controller.unlinkGoogle(req);
        expect(result.success).toBe(true);
    });
});
