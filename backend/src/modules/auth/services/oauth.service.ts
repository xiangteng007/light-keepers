/**
 * OAuth Service
 * 
 * Handles LINE Login and Google OAuth 2.0 integration.
 * v1.0: Token exchange, account linking/unlinking
 */

import { Injectable, Logger, BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../../accounts/entities/account.entity';
import axios from 'axios';

export interface LineTokenResponse {
    access_token: string;
    token_type: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    id_token: string;
}

export interface LineProfile {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
}

export interface GoogleTokenInfo {
    sub: string;  // Google User ID
    email: string;
    email_verified: boolean;
    name?: string;
    picture?: string;
}

@Injectable()
export class OAuthService {
    private readonly logger = new Logger(OAuthService.name);

    // LINE OAuth Configuration
    private readonly lineChannelId: string;
    private readonly lineChannelSecret: string;
    private readonly lineRedirectUri: string;

    // Google OAuth Configuration
    private readonly googleClientId: string;
    private readonly googleClientSecret: string;
    private readonly googleRedirectUri: string;

    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
    ) {
        this.lineChannelId = this.configService.get<string>('LINE_CHANNEL_ID', '');
        this.lineChannelSecret = this.configService.get<string>('LINE_CHANNEL_SECRET', '');
        this.lineRedirectUri = this.configService.get<string>('LINE_REDIRECT_URI', 'http://localhost:3000/auth/line/callback');

        this.googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID', '');
        this.googleClientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET', '');
        this.googleRedirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI', 'http://localhost:3000/auth/google/callback');
    }

    // ===== LINE OAuth =====

    /**
     * Generate LINE Login authorization URL
     */
    getLineAuthorizationUrl(state: string): string {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.lineChannelId,
            redirect_uri: this.lineRedirectUri,
            state,
            scope: 'profile openid email',
        });
        return `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
    }

    /**
     * Exchange LINE authorization code for access token
     */
    async exchangeLineCode(code: string): Promise<LineTokenResponse> {
        if (!this.lineChannelId || !this.lineChannelSecret) {
            this.logger.warn('LINE OAuth not configured - using mock response');
            return this.getMockLineTokenResponse();
        }

        try {
            const response = await axios.post(
                'https://api.line.me/oauth2/v2.1/token',
                new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: this.lineRedirectUri,
                    client_id: this.lineChannelId,
                    client_secret: this.lineChannelSecret,
                }).toString(),
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                }
            );
            return response.data;
        } catch (error: any) {
            this.logger.error(`LINE token exchange failed: ${error.message}`);
            throw new BadRequestException('LINE authorization failed');
        }
    }

    /**
     * Get LINE user profile using access token
     */
    async getLineProfile(accessToken: string): Promise<LineProfile> {
        if (!this.lineChannelId) {
            return this.getMockLineProfile();
        }

        try {
            const response = await axios.get('https://api.line.me/v2/profile', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            return response.data;
        } catch (error: any) {
            this.logger.error(`Failed to get LINE profile: ${error.message}`);
            throw new BadRequestException('Failed to get LINE profile');
        }
    }

    /**
     * Link LINE account to existing user
     */
    async linkLineAccount(accountId: string, code: string): Promise<Account> {
        const tokenResponse = await this.exchangeLineCode(code);
        const profile = await this.getLineProfile(tokenResponse.access_token);

        // Check if LINE account is already linked to another user
        const existingLink = await this.accountRepository.findOne({
            where: { lineUserId: profile.userId },
        });

        if (existingLink && existingLink.id !== accountId) {
            throw new ConflictException('此 LINE 帳號已綁定其他用戶');
        }

        // Update account with LINE info
        await this.accountRepository.update(accountId, {
            lineUserId: profile.userId,
            lineDisplayName: profile.displayName,
        });

        return this.accountRepository.findOneOrFail({ where: { id: accountId } });
    }

    /**
     * Unlink LINE account
     */
    async unlinkLineAccount(accountId: string): Promise<Account> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });
        if (!account) {
            throw new BadRequestException('帳戶不存在');
        }

        if (!account.lineUserId) {
            throw new BadRequestException('帳戶未綁定 LINE');
        }

        await this.accountRepository.update(accountId, {
            lineUserId: null as any,
            lineDisplayName: null as any,
        });

        return this.accountRepository.findOneOrFail({ where: { id: accountId } });
    }

    /**
     * Find or create account by LINE login
     */
    async findOrCreateByLine(code: string): Promise<{ account: Account; isNew: boolean }> {
        const tokenResponse = await this.exchangeLineCode(code);
        const profile = await this.getLineProfile(tokenResponse.access_token);

        let account = await this.accountRepository.findOne({
            where: { lineUserId: profile.userId },
            relations: ['roles'],
        });

        if (account) {
            // Update last login and profile info
            await this.accountRepository.update(account.id, {
                lastLoginAt: new Date(),
                lineDisplayName: profile.displayName,
                avatarUrl: profile.pictureUrl || account.avatarUrl,
            });
            return { account, isNew: false };
        }

        // Create new account
        const newAccount = this.accountRepository.create({
            lineUserId: profile.userId,
            lineDisplayName: profile.displayName,
            displayName: profile.displayName,
            avatarUrl: profile.pictureUrl,
            passwordHash: '', // No password for OAuth-only accounts
            isActive: true,
            lastLoginAt: new Date(),
        });

        account = await this.accountRepository.save(newAccount);
        return { account, isNew: true };
    }

    // ===== Google OAuth =====

    /**
     * Generate Google OAuth authorization URL
     */
    getGoogleAuthorizationUrl(state: string): string {
        const params = new URLSearchParams({
            client_id: this.googleClientId,
            redirect_uri: this.googleRedirectUri,
            response_type: 'code',
            scope: 'openid email profile',
            state,
            access_type: 'offline',
            prompt: 'consent',
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    /**
     * Exchange Google authorization code for tokens and get user info
     */
    async exchangeGoogleCode(code: string): Promise<GoogleTokenInfo> {
        if (!this.googleClientId || !this.googleClientSecret) {
            this.logger.warn('Google OAuth not configured - using mock response');
            return this.getMockGoogleTokenInfo();
        }

        try {
            // Exchange code for tokens
            const tokenResponse = await axios.post(
                'https://oauth2.googleapis.com/token',
                new URLSearchParams({
                    code,
                    client_id: this.googleClientId,
                    client_secret: this.googleClientSecret,
                    redirect_uri: this.googleRedirectUri,
                    grant_type: 'authorization_code',
                }).toString(),
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                }
            );

            // Get user info from access token
            const userInfo = await axios.get(
                `https://oauth2.googleapis.com/tokeninfo?id_token=${tokenResponse.data.id_token}`
            );

            return userInfo.data;
        } catch (error: any) {
            this.logger.error(`Google token exchange failed: ${error.message}`);
            throw new BadRequestException('Google authorization failed');
        }
    }

    /**
     * Link Google account to existing user
     */
    async linkGoogleAccount(accountId: string, code: string): Promise<Account> {
        const userInfo = await this.exchangeGoogleCode(code);

        // Check if Google account is already linked to another user
        const existingLink = await this.accountRepository.findOne({
            where: { googleId: userInfo.sub },
        });

        if (existingLink && existingLink.id !== accountId) {
            throw new ConflictException('此 Google 帳號已綁定其他用戶');
        }

        // Update account with Google info
        await this.accountRepository.update(accountId, {
            googleId: userInfo.sub,
            googleEmail: userInfo.email,
        });

        return this.accountRepository.findOneOrFail({ where: { id: accountId } });
    }

    /**
     * Unlink Google account
     */
    async unlinkGoogleAccount(accountId: string): Promise<Account> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });
        if (!account) {
            throw new BadRequestException('帳戶不存在');
        }

        if (!account.googleId) {
            throw new BadRequestException('帳戶未綁定 Google');
        }

        await this.accountRepository.update(accountId, {
            googleId: null as any,
            googleEmail: null as any,
        });

        return this.accountRepository.findOneOrFail({ where: { id: accountId } });
    }

    /**
     * Find or create account by Google login
     */
    async findOrCreateByGoogle(code: string): Promise<{ account: Account; isNew: boolean }> {
        const userInfo = await this.exchangeGoogleCode(code);

        let account = await this.accountRepository.findOne({
            where: { googleId: userInfo.sub },
            relations: ['roles'],
        });

        if (account) {
            // Update last login
            await this.accountRepository.update(account.id, {
                lastLoginAt: new Date(),
                googleEmail: userInfo.email,
            });
            return { account, isNew: false };
        }

        // Check if email already exists
        if (userInfo.email) {
            account = await this.accountRepository.findOne({
                where: { email: userInfo.email },
                relations: ['roles'],
            });

            if (account) {
                // Link Google to existing email account
                await this.accountRepository.update(account.id, {
                    googleId: userInfo.sub,
                    googleEmail: userInfo.email,
                    lastLoginAt: new Date(),
                });
                return { account, isNew: false };
            }
        }

        // Create new account
        const newAccount = this.accountRepository.create({
            googleId: userInfo.sub,
            googleEmail: userInfo.email,
            email: userInfo.email,
            displayName: userInfo.name || userInfo.email?.split('@')[0],
            avatarUrl: userInfo.picture,
            passwordHash: '', // No password for OAuth-only accounts
            emailVerified: userInfo.email_verified,
            isActive: true,
            lastLoginAt: new Date(),
        });

        account = await this.accountRepository.save(newAccount);
        return { account, isNew: true };
    }

    // ===== Mock Responses (for development without credentials) =====

    private getMockLineTokenResponse(): LineTokenResponse {
        return {
            access_token: 'mock_line_access_token_' + Date.now(),
            token_type: 'Bearer',
            refresh_token: 'mock_line_refresh_token',
            expires_in: 3600,
            scope: 'profile openid email',
            id_token: 'mock_id_token',
        };
    }

    private getMockLineProfile(): LineProfile {
        return {
            userId: 'U' + Math.random().toString(36).substring(2, 15),
            displayName: '測試用戶 (LINE)',
            pictureUrl: 'https://ui-avatars.com/api/?name=LINE+User&background=06C755&color=fff',
        };
    }

    private getMockGoogleTokenInfo(): GoogleTokenInfo {
        const mockId = Math.random().toString().substring(2, 15);
        return {
            sub: mockId,
            email: `test.user.${mockId}@gmail.com`,
            email_verified: true,
            name: '測試用戶 (Google)',
            picture: 'https://ui-avatars.com/api/?name=Google+User&background=4285F4&color=fff',
        };
    }
}
