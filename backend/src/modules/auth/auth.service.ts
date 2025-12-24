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
}

