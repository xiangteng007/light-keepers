/**
 * OAuth Controller
 * 
 * Endpoints for LINE and Google OAuth flows
 * v1.0: Authorization, callback, linking/unlinking
 */

import {
    Controller,
    Get,
    Post,
    Delete,
    Query,
    Res,
    Req,
    UseGuards,
    HttpStatus,
    Logger,
    BadRequestException,
} from '@nestjs/common';
import { getErrorMessage } from '../../common/utils/error-utils';
import { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS, Public } from '../shared/guards';
import { OAuthService } from './services/oauth.service';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('OAuth')
@Controller('auth')
export class AuthOAuthController {
    private readonly logger = new Logger(AuthOAuthController.name);
    private readonly frontendUrl: string;

    constructor(
        private readonly oauthService: OAuthService,
        private readonly authService: AuthService,
        private readonly refreshTokenService: RefreshTokenService,
        private readonly configService: ConfigService,
    ) {
        this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5175');
    }

    /**
     * Helper method to get consistent cookie options
     */
    private getCookieOptions() {
        const isProduction = process.env.NODE_ENV === 'production';
        return {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' as const : 'lax' as const,
            path: '/',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        };
    }

    // ===== LINE OAuth =====

    @Public()
    @Get('line')
    @ApiOperation({ summary: 'Redirect to LINE Login authorization page' })
    @ApiQuery({ name: 'redirect', required: false, description: 'URL to redirect after login' })
    lineAuth(@Query('redirect') redirect: string, @Res() res: Response) {
        // Store redirect URL in state (base64 encoded)
        const state = Buffer.from(JSON.stringify({
            redirect: redirect || '/dashboard',
            timestamp: Date.now(),
        })).toString('base64');

        const authUrl = this.oauthService.getLineAuthorizationUrl(state);
        this.logger.log(`Redirecting to LINE auth: ${authUrl.substring(0, 100)}...`);
        return res.redirect(authUrl);
    }

    @Public()
    @Get('line/callback')
    @ApiOperation({ summary: 'LINE OAuth callback handler' })
    async lineCallback(
        @Query('code') code: string,
        @Query('state') state: string,
        @Query('error') error: string,
        @Res() res: Response,
    ) {
        // Parse redirect from state
        let redirectPath = '/dashboard';
        try {
            const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            redirectPath = stateData.redirect || redirectPath;
        } catch (e) {
            this.logger.warn('Failed to parse state, using default redirect');
        }

        if (error) {
            this.logger.error(`LINE OAuth error: ${error}`);
            return res.redirect(`${this.frontendUrl}${redirectPath}&error=line_auth_failed`);
        }

        if (!code) {
            return res.redirect(`${this.frontendUrl}${redirectPath}&error=no_code`);
        }

        try {
            const { account, isNew } = await this.oauthService.findOrCreateByLine(code);

            // Generate JWT token
            const tokens = await this.authService.generateTokenForAccountId(account.id);

            // Create and set refresh token as httpOnly cookie
            const refreshToken = await this.refreshTokenService.createRefreshToken(
                account.id,
                'OAuth Browser',
                undefined,
            );
            res.cookie('refresh_token', refreshToken, this.getCookieOptions());

            // Redirect with access token only (refresh token is in cookie)
            const params = new URLSearchParams({
                access_token: tokens.accessToken,
                is_new: isNew.toString(),
            });

            return res.redirect(`${this.frontendUrl}/auth/callback?${params.toString()}&redirect=${encodeURIComponent(redirectPath)}`);
        } catch (e: unknown) {
            this.logger.error(`LINE callback error: ${getErrorMessage(e)}`);
            return res.redirect(`${this.frontendUrl}${redirectPath}&error=${encodeURIComponent(getErrorMessage(e))}`);
        }
    }

    @Post('link/line')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Link LINE account to current user' })
    @ApiQuery({ name: 'code', required: true, description: 'LINE authorization code' })
    async linkLine(@Query('code') code: string, @Req() req: Request) {
        if (!code) {
            throw new BadRequestException('Authorization code is required');
        }

        const userId = (req as any).user?.id;
        if (!userId) {
            throw new BadRequestException('User not authenticated');
        }

        const account = await this.oauthService.linkLineAccount(userId, code);
        return {
            success: true,
            message: 'LINE 帳號已成功綁定',
            data: {
                lineUserId: account.lineUserId,
                lineDisplayName: account.lineDisplayName,
            },
        };
    }

    @Delete('link/line')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Unlink LINE account from current user' })
    async unlinkLine(@Req() req: Request) {
        const userId = (req as any).user?.id;
        if (!userId) {
            throw new BadRequestException('User not authenticated');
        }

        await this.oauthService.unlinkLineAccount(userId);
        return {
            success: true,
            message: 'LINE 帳號已成功解除綁定',
        };
    }

    // ===== Google OAuth =====

    @Public()
    @Get('google')
    @ApiOperation({ summary: 'Redirect to Google OAuth authorization page' })
    @ApiQuery({ name: 'redirect', required: false, description: 'URL to redirect after login' })
    googleAuth(@Query('redirect') redirect: string, @Res() res: Response) {
        const state = Buffer.from(JSON.stringify({
            redirect: redirect || '/dashboard',
            timestamp: Date.now(),
        })).toString('base64');

        const authUrl = this.oauthService.getGoogleAuthorizationUrl(state);
        this.logger.log(`Redirecting to Google auth: ${authUrl.substring(0, 100)}...`);
        return res.redirect(authUrl);
    }

    @Public()
    @Get('google/callback')
    @ApiOperation({ summary: 'Google OAuth callback handler' })
    async googleCallback(
        @Query('code') code: string,
        @Query('state') state: string,
        @Query('error') error: string,
        @Res() res: Response,
    ) {
        let redirectPath = '/dashboard';
        try {
            const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            redirectPath = stateData.redirect || redirectPath;
        } catch (e) {
            this.logger.warn('Failed to parse state, using default redirect');
        }

        if (error) {
            this.logger.error(`Google OAuth error: ${error}`);
            return res.redirect(`${this.frontendUrl}${redirectPath}&error=google_auth_failed`);
        }

        if (!code) {
            return res.redirect(`${this.frontendUrl}${redirectPath}&error=no_code`);
        }

        try {
            const { account, isNew } = await this.oauthService.findOrCreateByGoogle(code);

            const tokens = await this.authService.generateTokenForAccountId(account.id);

            // Create and set refresh token as httpOnly cookie
            const refreshToken = await this.refreshTokenService.createRefreshToken(
                account.id,
                'OAuth Browser',
                undefined,
            );
            res.cookie('refresh_token', refreshToken, this.getCookieOptions());

            // Redirect with access token only (refresh token is in cookie)
            const params = new URLSearchParams({
                access_token: tokens.accessToken,
                is_new: isNew.toString(),
            });

            return res.redirect(`${this.frontendUrl}/auth/callback?${params.toString()}&redirect=${encodeURIComponent(redirectPath)}`);
        } catch (e: unknown) {
            this.logger.error(`Google callback error: ${getErrorMessage(e)}`);
            return res.redirect(`${this.frontendUrl}${redirectPath}&error=${encodeURIComponent(getErrorMessage(e))}`);
        }
    }

    @Post('link/google')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Link Google account to current user' })
    @ApiQuery({ name: 'code', required: true, description: 'Google authorization code' })
    async linkGoogle(@Query('code') code: string, @Req() req: Request) {
        if (!code) {
            throw new BadRequestException('Authorization code is required');
        }

        const userId = (req as any).user?.id;
        if (!userId) {
            throw new BadRequestException('User not authenticated');
        }

        const account = await this.oauthService.linkGoogleAccount(userId, code);
        return {
            success: true,
            message: 'Google 帳號已成功綁定',
            data: {
                googleId: account.googleId,
                googleEmail: account.googleEmail,
            },
        };
    }

    @Delete('link/google')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Unlink Google account from current user' })
    async unlinkGoogle(@Req() req: Request) {
        const userId = (req as any).user?.id;
        if (!userId) {
            throw new BadRequestException('User not authenticated');
        }

        await this.oauthService.unlinkGoogleAccount(userId);
        return {
            success: true,
            message: 'Google 帳號已成功解除綁定',
        };
    }
}
