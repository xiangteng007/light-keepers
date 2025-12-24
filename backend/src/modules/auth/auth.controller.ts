import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getProfile(@Request() req: { user: { id: string; email?: string; phone?: string; displayName?: string; lineUserId?: string; roles?: { name: string; level: number; displayName: string }[] } }) {
        const roles = req.user.roles || [];
        const roleLevel = roles.length > 0 ? Math.max(...roles.map(r => r.level || 0)) : 0;

        return {
            id: req.user.id,
            email: req.user.email,
            phone: req.user.phone,
            displayName: req.user.displayName,
            lineLinked: !!req.user.lineUserId,
            roles: roles.map(r => r.name),
            roleLevel,
            roleDisplayName: roles.find(r => r.level === roleLevel)?.displayName || '一般民眾',
        };
    }

    /**
     * 獲取頁面權限配置
     * 公開 API，用於前端判斷頁面可見性
     */
    @Get('permissions')
    async getPermissions() {
        return this.authService.getPagePermissions();
    }

    /**
     * LINE OAuth Callback
     * 前端重導向回來時，用 authorization code 換取 access token
     */
    @Post('line/callback')
    async lineCallback(@Body() body: { code: string; redirectUri: string }) {
        return this.authService.exchangeLineCode(body.code, body.redirectUri);
    }

    /**
     * LINE 登入
     * 前端透過 LINE SDK 取得 access token 後呼叫此 API
     */
    @Post('line/login')
    async loginWithLine(@Body() body: { accessToken: string }) {
        return this.authService.loginWithLine(body.accessToken);
    }

    /**
     * LINE 註冊新帳號
     * 若 LINE 帳號未綁定，使用此 API 建立新帳號
     */
    @Post('line/register')
    async registerWithLine(@Body() body: { accessToken: string; displayName: string; email?: string; phone?: string }) {
        return this.authService.registerWithLine(body.accessToken, body.displayName, body.email, body.phone);
    }

    /**
     * 綁定 LINE 帳號
     * 已登入用戶綁定 LINE 帳號
     */
    @Post('line/bind')
    @UseGuards(JwtAuthGuard)
    async bindLine(@Request() req: { user: { id: string } }, @Body() body: { accessToken: string }) {
        const lineProfile = await this.authService.verifyLineToken(body.accessToken);
        await this.authService.bindLineAccount(req.user.id, lineProfile.userId, lineProfile.displayName);
        return { success: true, lineDisplayName: lineProfile.displayName };
    }

    // =========================================
    // Google OAuth 端點
    // =========================================

    /**
     * Google OAuth Callback
     * 前端重導向回來時，用 authorization code 換取 access token
     */
    @Post('google/callback')
    async googleCallback(@Body() body: { code: string; redirectUri: string }) {
        return this.authService.exchangeGoogleCode(body.code, body.redirectUri);
    }

    /**
     * Google 登入
     * 前端透過 Google SDK 取得 access token 後呼叫此 API
     */
    @Post('google/login')
    async loginWithGoogle(@Body() body: { accessToken: string }) {
        return this.authService.loginWithGoogle(body.accessToken);
    }

    /**
     * Google 註冊新帳號
     * 若 Google 帳號未綁定，使用此 API 建立新帳號
     */
    @Post('google/register')
    async registerWithGoogle(@Body() body: { accessToken: string; displayName?: string }) {
        return this.authService.registerWithGoogle(body.accessToken, body.displayName);
    }

    /**
     * 綁定 Google 帳號
     * 已登入用戶綁定 Google 帳號
     */
    @Post('google/bind')
    @UseGuards(JwtAuthGuard)
    async bindGoogle(@Request() req: { user: { id: string } }, @Body() body: { accessToken: string }) {
        const googleProfile = await this.authService.verifyGoogleToken(body.accessToken);
        await this.authService.bindGoogleAccount(req.user.id, googleProfile.id, googleProfile.email);
        return { success: true, googleEmail: googleProfile.email };
    }
}



