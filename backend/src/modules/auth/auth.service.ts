import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Account, Role, PagePermission } from '../accounts/entities';
import { RegisterDto, LoginDto, TokenResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
        @InjectRepository(PagePermission)
        private readonly pagePermissionRepository: Repository<PagePermission>,
        private readonly jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto): Promise<TokenResponseDto> {
        // 驗證 email 或 phone 必須存在
        if (!dto.email && !dto.phone) {
            throw new ConflictException('Email 或手機號碼為必填');
        }

        // 檢查是否已存在
        const existing = await this.accountRepository.findOne({
            where: [
                { email: dto.email },
                { phone: dto.phone },
            ].filter(w => Object.values(w).some(v => v)),
        });

        if (existing) {
            throw new ConflictException('帳號已存在');
        }

        // 密碼加密
        const passwordHash = await bcrypt.hash(dto.password, 10);

        // 取得預設角色（volunteer）
        const volunteerRole = await this.roleRepository.findOne({
            where: { name: 'volunteer' },
        });

        // 建立帳號
        const account = this.accountRepository.create({
            email: dto.email,
            phone: dto.phone,
            passwordHash,
            displayName: dto.displayName,
            roles: volunteerRole ? [volunteerRole] : [],
        });

        await this.accountRepository.save(account);

        return this.generateTokenResponse(account);
    }

    async login(dto: LoginDto): Promise<TokenResponseDto> {
        const account = await this.accountRepository.findOne({
            where: [
                { email: dto.email },
                { phone: dto.phone },
            ].filter(w => Object.values(w).some(v => v)),
            relations: ['roles'],
        });

        if (!account) {
            throw new UnauthorizedException('帳號或密碼錯誤');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, account.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('帳號或密碼錯誤');
        }

        // 更新最後登入時間
        account.lastLoginAt = new Date();
        await this.accountRepository.save(account);

        return this.generateTokenResponse(account);
    }

    async validateToken(token: string): Promise<Account | null> {
        try {
            const payload = this.jwtService.verify(token);
            return this.accountRepository.findOne({
                where: { id: payload.sub },
                relations: ['roles'],
            });
        } catch {
            return null;
        }
    }

    /**
     * LINE Login Callback - 用 authorization code 換取 access token
     */
    async exchangeLineCode(code: string, redirectUri: string): Promise<TokenResponseDto | { needsRegistration: true; lineProfile: { userId: string; displayName: string; pictureUrl?: string } }> {
        const clientId = process.env.LINE_CLIENT_ID;
        const clientSecret = process.env.LINE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new UnauthorizedException('LINE Login 尚未設定');
        }

        // 用 code 換取 access token
        const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                client_id: clientId,
                client_secret: clientSecret,
            }),
        });

        if (!tokenResponse.ok) {
            const error = await tokenResponse.text();
            console.error('LINE token exchange failed:', error);
            throw new UnauthorizedException('LINE 登入失敗');
        }

        const tokenData = await tokenResponse.json();
        const lineAccessToken = tokenData.access_token;

        // 使用取得的 access token 進行登入
        return this.loginWithLine(lineAccessToken);
    }

    /**
     * LINE Login - 驗證 LINE Access Token 並獲取用戶資訊
     */
    async verifyLineToken(accessToken: string): Promise<{ userId: string; displayName: string; pictureUrl?: string }> {
        const response = await fetch('https://api.line.me/v2/profile', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw new UnauthorizedException('LINE Token 驗證失敗');
        }

        const profile = await response.json();
        return {
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
        };
    }

    /**
     * LINE Login - 使用 LINE 帳號登入
     */
    async loginWithLine(lineAccessToken: string): Promise<TokenResponseDto | { needsRegistration: true; lineProfile: { userId: string; displayName: string; pictureUrl?: string } }> {
        // 驗證 LINE Token
        const lineProfile = await this.verifyLineToken(lineAccessToken);

        // 查找已綁定的帳號
        const account = await this.accountRepository.findOne({
            where: { lineUserId: lineProfile.userId },
            relations: ['roles'],
        });

        if (account) {
            // 已綁定 - 直接登入
            account.lastLoginAt = new Date();
            await this.accountRepository.save(account);
            return this.generateTokenResponse(account);
        }

        // 未綁定 - 返回需要註冊/綁定
        return {
            needsRegistration: true,
            lineProfile,
        };
    }

    /**
     * 綁定 LINE 帳號到現有帳號
     */
    async bindLineAccount(accountId: string, lineUserId: string, lineDisplayName: string): Promise<void> {
        // 檢查 LINE 是否已被其他帳號綁定
        const existing = await this.accountRepository.findOne({ where: { lineUserId } });
        if (existing && existing.id !== accountId) {
            throw new ConflictException('此 LINE 帳號已被其他帳號綁定');
        }

        await this.accountRepository.update(accountId, {
            lineUserId,
            lineDisplayName,
        });
    }

    /**
     * 使用 LINE 註冊新帳號
     */
    async registerWithLine(lineAccessToken: string, displayName: string, email?: string, phone?: string): Promise<TokenResponseDto> {
        const lineProfile = await this.verifyLineToken(lineAccessToken);

        // 檢查 LINE 是否已綁定
        const existingLine = await this.accountRepository.findOne({ where: { lineUserId: lineProfile.userId } });
        if (existingLine) {
            throw new ConflictException('此 LINE 帳號已註冊');
        }

        // 取得預設角色
        const volunteerRole = await this.roleRepository.findOne({ where: { name: 'volunteer' } });

        // 建立帳號
        const account = this.accountRepository.create({
            email: email || undefined,
            phone: phone || undefined,
            passwordHash: '', // LINE 登入不需要密碼
            displayName: displayName || lineProfile.displayName,
            avatarUrl: lineProfile.pictureUrl,
            lineUserId: lineProfile.userId,
            lineDisplayName: lineProfile.displayName,
            roles: volunteerRole ? [volunteerRole] : [],
        });

        await this.accountRepository.save(account);
        return this.generateTokenResponse(account);
    }

    /**
     * 獲取頁面權限配置
     */
    async getPagePermissions(): Promise<PagePermission[]> {
        return this.pagePermissionRepository.find({
            where: { isVisible: true },
            order: { sortOrder: 'ASC' },
        });
    }

    /**
     * 獲取所有角色
     */
    async getAllRoles(): Promise<Role[]> {
        return this.roleRepository.find({
            order: { level: 'ASC' },
        });
    }

    // =========================================
    // Google OAuth 相關方法
    // =========================================

    /**
     * Google OAuth Callback - 用 authorization code 換取 access token
     */
    async exchangeGoogleCode(code: string, redirectUri: string): Promise<TokenResponseDto | { needsRegistration: true; googleProfile: { id: string; email: string; name: string; picture?: string } }> {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new UnauthorizedException('Google Login 尚未設定');
        }

        // 用 code 換取 access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                client_id: clientId,
                client_secret: clientSecret,
            }),
        });

        if (!tokenResponse.ok) {
            const error = await tokenResponse.text();
            console.error('Google token exchange failed:', error);
            throw new UnauthorizedException('Google 登入失敗');
        }

        const tokenData = await tokenResponse.json();
        const googleAccessToken = tokenData.access_token;

        // 使用取得的 access token 進行登入
        return this.loginWithGoogle(googleAccessToken);
    }

    /**
     * Google Login - 驗證 Google Access Token 並獲取用戶資訊
     */
    async verifyGoogleToken(accessToken: string): Promise<{ id: string; email: string; name: string; picture?: string }> {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw new UnauthorizedException('Google Token 驗證失敗');
        }

        const profile = await response.json();
        return {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
        };
    }

    /**
     * Google Login - 使用 Google 帳號登入
     */
    async loginWithGoogle(googleAccessToken: string): Promise<TokenResponseDto | { needsRegistration: true; googleProfile: { id: string; email: string; name: string; picture?: string } }> {
        // 驗證 Google Token
        const googleProfile = await this.verifyGoogleToken(googleAccessToken);

        // 查找已綁定的帳號 (優先用 Google ID，其次用 email)
        let account = await this.accountRepository.findOne({
            where: { googleId: googleProfile.id },
            relations: ['roles'],
        });

        // 如果沒有綁定 Google ID，嘗試用 email 查找
        if (!account && googleProfile.email) {
            account = await this.accountRepository.findOne({
                where: { email: googleProfile.email },
                relations: ['roles'],
            });

            // 如果找到，自動綁定 Google ID
            if (account) {
                account.googleId = googleProfile.id;
                account.googleEmail = googleProfile.email;
                if (!account.avatarUrl && googleProfile.picture) {
                    account.avatarUrl = googleProfile.picture;
                }
                await this.accountRepository.save(account);
            }
        }

        if (account) {
            // 已綁定 - 直接登入
            account.lastLoginAt = new Date();
            await this.accountRepository.save(account);
            return this.generateTokenResponse(account);
        }

        // 未綁定 - 返回需要註冊/綁定
        return {
            needsRegistration: true,
            googleProfile,
        };
    }

    /**
     * 綁定 Google 帳號到現有帳號
     */
    async bindGoogleAccount(accountId: string, googleId: string, googleEmail: string): Promise<void> {
        // 檢查 Google 是否已被其他帳號綁定
        const existing = await this.accountRepository.findOne({ where: { googleId } });
        if (existing && existing.id !== accountId) {
            throw new ConflictException('此 Google 帳號已被其他帳號綁定');
        }

        await this.accountRepository.update(accountId, {
            googleId,
            googleEmail,
        });
    }

    /**
     * 使用 Google 註冊新帳號
     */
    async registerWithGoogle(googleAccessToken: string, displayName?: string): Promise<TokenResponseDto> {
        const googleProfile = await this.verifyGoogleToken(googleAccessToken);

        // 檢查 Google 是否已綁定
        const existingGoogle = await this.accountRepository.findOne({ where: { googleId: googleProfile.id } });
        if (existingGoogle) {
            throw new ConflictException('此 Google 帳號已註冊');
        }

        // 檢查 email 是否已存在
        if (googleProfile.email) {
            const existingEmail = await this.accountRepository.findOne({ where: { email: googleProfile.email } });
            if (existingEmail) {
                throw new ConflictException('此 Email 已有帳號，請直接登入');
            }
        }

        // 取得預設角色
        const volunteerRole = await this.roleRepository.findOne({ where: { name: 'volunteer' } });

        // 建立帳號
        const account = this.accountRepository.create({
            email: googleProfile.email || undefined,
            passwordHash: '', // Google 登入不需要密碼
            displayName: displayName || googleProfile.name,
            avatarUrl: googleProfile.picture,
            googleId: googleProfile.id,
            googleEmail: googleProfile.email,
            roles: volunteerRole ? [volunteerRole] : [],
        });

        await this.accountRepository.save(account);
        return this.generateTokenResponse(account);
    }

    private generateTokenResponse(account: Account): TokenResponseDto {
        const roles = account.roles || [];
        const roleLevel = roles.length > 0 ? Math.max(...roles.map(r => (r as any).level || 0)) : 0;

        const payload = {
            sub: account.id,
            email: account.email,
            roles: roles.map(r => r.name),
            roleLevel,
        };

        const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });

        return {
            accessToken,
            expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
            user: {
                id: account.id,
                email: account.email,
                phone: account.phone,
                displayName: account.displayName,
                roles: roles.map(r => r.name),
                roleLevel,
                roleDisplayName: (roles.find(r => (r as any).level === roleLevel) as any)?.displayName || '登記志工',
            },
        };
    }

    // =========================================
    // 個人資料管理
    // =========================================

    /**
     * 更新個人資料
     */
    async updateProfile(accountId: string, data: { displayName?: string; avatarUrl?: string }): Promise<{
        id: string;
        displayName: string;
        avatarUrl: string;
    }> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });
        if (!account) {
            throw new UnauthorizedException('帳號不存在');
        }

        if (data.displayName !== undefined) {
            account.displayName = data.displayName;
        }

        if (data.avatarUrl !== undefined) {
            account.avatarUrl = data.avatarUrl;
        }

        await this.accountRepository.save(account);

        return {
            id: account.id,
            displayName: account.displayName,
            avatarUrl: account.avatarUrl,
        };
    }

    /**
     * 變更密碼
     */
    async changePassword(accountId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });
        if (!account) {
            throw new UnauthorizedException('帳號不存在');
        }

        // 驗證舊密碼
        const isValid = await bcrypt.compare(currentPassword, account.passwordHash);
        if (!isValid) {
            throw new UnauthorizedException('目前密碼不正確');
        }

        // 更新密碼
        account.passwordHash = await bcrypt.hash(newPassword, 10);
        await this.accountRepository.save(account);

        return { success: true };
    }

    /**
     * 更新通知偏好設定
     */
    async updatePreferences(accountId: string, data: {
        alertNotifications?: boolean;
        taskNotifications?: boolean;
        trainingNotifications?: boolean;
    }): Promise<{
        alertNotifications: boolean;
        taskNotifications: boolean;
        trainingNotifications: boolean;
    }> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });
        if (!account) {
            throw new UnauthorizedException('帳號不存在');
        }

        if (data.alertNotifications !== undefined) {
            account.prefAlertNotifications = data.alertNotifications;
        }

        if (data.taskNotifications !== undefined) {
            account.prefTaskNotifications = data.taskNotifications;
        }

        if (data.trainingNotifications !== undefined) {
            account.prefTrainingNotifications = data.trainingNotifications;
        }

        await this.accountRepository.save(account);

        return {
            alertNotifications: account.prefAlertNotifications,
            taskNotifications: account.prefTaskNotifications,
            trainingNotifications: account.prefTrainingNotifications,
        };
    }

    /**
     * 獲取通知偏好設定
     */
    async getPreferences(accountId: string): Promise<{
        alertNotifications: boolean;
        taskNotifications: boolean;
        trainingNotifications: boolean;
    }> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });
        if (!account) {
            throw new UnauthorizedException('帳號不存在');
        }

        return {
            alertNotifications: account.prefAlertNotifications ?? true,
            taskNotifications: account.prefTaskNotifications ?? true,
            trainingNotifications: account.prefTrainingNotifications ?? true,
        };
    }
}

