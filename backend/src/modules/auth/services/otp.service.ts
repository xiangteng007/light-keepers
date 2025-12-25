import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { OtpCode } from '../entities/otp.entity';

/**
 * OTP 驗證碼服務
 * 處理驗證碼生成、驗證和管理
 */
@Injectable()
export class OtpService {
    private readonly logger = new Logger(OtpService.name);
    private readonly OTP_EXPIRY_MINUTES = 5;
    private readonly MAX_ATTEMPTS = 5;
    private readonly RESEND_COOLDOWN_SECONDS = 60;

    constructor(
        @InjectRepository(OtpCode)
        private readonly otpRepository: Repository<OtpCode>,
    ) { }

    /**
     * 生成並儲存 OTP
     */
    async generateOtp(target: string, targetType: 'phone' | 'email'): Promise<string> {
        // 檢查是否在冷卻期內
        const recentOtp = await this.otpRepository.findOne({
            where: {
                target,
                targetType,
                createdAt: MoreThan(new Date(Date.now() - this.RESEND_COOLDOWN_SECONDS * 1000)),
            },
            order: { createdAt: 'DESC' },
        });

        if (recentOtp) {
            const remainingSeconds = Math.ceil(
                (recentOtp.createdAt.getTime() + this.RESEND_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000
            );
            throw new BadRequestException(`請等待 ${remainingSeconds} 秒後再重新發送`);
        }

        // 生成 6 位數隨機驗證碼
        const code = this.generateRandomCode();

        // 設定過期時間
        const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

        // 儲存 OTP
        const otpEntity = this.otpRepository.create({
            target,
            targetType,
            code,
            expiresAt,
            used: false,
            attempts: 0,
        });

        await this.otpRepository.save(otpEntity);
        this.logger.log(`OTP generated for ${targetType}: ${this.maskTarget(target, targetType)}`);

        return code;
    }

    /**
     * 驗證 OTP
     */
    async verifyOtp(target: string, targetType: 'phone' | 'email', code: string): Promise<boolean> {
        const otpRecord = await this.otpRepository.findOne({
            where: {
                target,
                targetType,
                used: false,
                expiresAt: MoreThan(new Date()),
            },
            order: { createdAt: 'DESC' },
        });

        if (!otpRecord) {
            throw new BadRequestException('驗證碼不存在或已過期，請重新發送');
        }

        // 檢查嘗試次數
        if (otpRecord.attempts >= this.MAX_ATTEMPTS) {
            throw new BadRequestException('驗證次數過多，請重新發送驗證碼');
        }

        // 更新嘗試次數
        otpRecord.attempts += 1;

        if (otpRecord.code !== code) {
            await this.otpRepository.save(otpRecord);
            const remaining = this.MAX_ATTEMPTS - otpRecord.attempts;
            throw new BadRequestException(`驗證碼錯誤，剩餘 ${remaining} 次嘗試機會`);
        }

        // 驗證成功，標記為已使用
        otpRecord.used = true;
        await this.otpRepository.save(otpRecord);

        this.logger.log(`OTP verified for ${targetType}: ${this.maskTarget(target, targetType)}`);
        return true;
    }

    /**
     * 清理過期的 OTP 記錄
     */
    async cleanupExpiredOtps(): Promise<number> {
        const result = await this.otpRepository.delete({
            expiresAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)), // 保留 24 小時內的記錄便於查錯
        });
        return result.affected || 0;
    }

    /**
     * 生成 6 位數隨機驗證碼
     */
    private generateRandomCode(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * 遮蔽目標用於 log
     */
    private maskTarget(target: string, type: 'phone' | 'email'): string {
        if (type === 'phone') {
            return target.length > 4
                ? target.substring(0, 4) + '****' + target.substring(target.length - 2)
                : '****';
        }
        // Email
        const [localPart, domain] = target.split('@');
        if (localPart && domain) {
            const maskedLocal = localPart.length > 2
                ? localPart.substring(0, 2) + '***'
                : '***';
            return `${maskedLocal}@${domain}`;
        }
        return '***@***';
    }
}
