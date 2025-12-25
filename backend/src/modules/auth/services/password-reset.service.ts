import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { Account } from '../../accounts/entities';

/**
 * 密碼重設服務
 * 處理忘記密碼和重設密碼流程
 */
@Injectable()
export class PasswordResetService {
    private readonly logger = new Logger(PasswordResetService.name);
    private readonly TOKEN_EXPIRY_HOURS = 1;

    constructor(
        @InjectRepository(PasswordResetToken)
        private readonly tokenRepository: Repository<PasswordResetToken>,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
        private readonly configService: ConfigService,
    ) { }

    /**
     * 為帳號建立密碼重設 Token
     */
    async createResetToken(accountId: string): Promise<string> {
        // 產生隨機 token
        const token = crypto.randomBytes(32).toString('hex');

        // 設定過期時間
        const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

        // 儲存 token
        const tokenEntity = this.tokenRepository.create({
            accountId,
            token,
            expiresAt,
            used: false,
        });

        await this.tokenRepository.save(tokenEntity);
        this.logger.log(`Password reset token created for account: ${accountId}`);

        return token;
    }

    /**
     * 產生重設密碼的完整 URL
     */
    generateResetUrl(token: string): string {
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://light-keepers-dashboard.vercel.app';
        return `${frontendUrl}/reset-password?token=${token}`;
    }

    /**
     * 驗證並使用重設 Token
     */
    async verifyAndResetPassword(token: string, newPassword: string): Promise<void> {
        // 查找有效的 token
        const tokenRecord = await this.tokenRepository.findOne({
            where: {
                token,
                used: false,
                expiresAt: MoreThan(new Date()),
            },
        });

        if (!tokenRecord) {
            throw new BadRequestException('重設連結無效或已過期，請重新申請');
        }

        // 查找帳號
        const account = await this.accountRepository.findOne({
            where: { id: tokenRecord.accountId },
        });

        if (!account) {
            throw new NotFoundException('帳號不存在');
        }

        // 更新密碼
        account.passwordHash = await bcrypt.hash(newPassword, 10);
        await this.accountRepository.save(account);

        // 標記 token 為已使用
        tokenRecord.used = true;
        await this.tokenRepository.save(tokenRecord);

        this.logger.log(`Password reset successful for account: ${tokenRecord.accountId}`);
    }

    /**
     * 透過 Email 或手機查找帳號
     */
    async findAccountByEmailOrPhone(email?: string, phone?: string): Promise<Account | null> {
        if (!email && !phone) {
            throw new BadRequestException('請提供 Email 或手機號碼');
        }

        const whereConditions = [];
        if (email) whereConditions.push({ email });
        if (phone) whereConditions.push({ phone });

        return this.accountRepository.findOne({
            where: whereConditions,
        });
    }

    /**
     * 清理過期的重設 Token
     */
    async cleanupExpiredTokens(): Promise<number> {
        const result = await this.tokenRepository.delete({
            expiresAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
        });
        return result.affected || 0;
    }
}
