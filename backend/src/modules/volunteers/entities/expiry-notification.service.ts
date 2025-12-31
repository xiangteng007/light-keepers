import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { VolunteerCertificate } from './volunteer-certificate.entity';
import { VolunteerInsurance } from './volunteer-insurance.entity';
import { VolunteerVehicle } from './volunteer-vehicle.entity';

export interface ExpiringItem {
    type: 'certificate' | 'insurance' | 'vehicle_insurance';
    id: string;
    volunteerId: string;
    volunteerName?: string;
    name: string;
    expiresAt: Date;
    daysUntilExpiry: number;
}

export interface NotificationResult {
    sent: number;
    failed: number;
    items: ExpiringItem[];
}

@Injectable()
export class ExpiryNotificationService {
    private readonly logger = new Logger(ExpiryNotificationService.name);

    constructor(
        @InjectRepository(VolunteerCertificate)
        private certificateRepository: Repository<VolunteerCertificate>,
        @InjectRepository(VolunteerInsurance)
        private insuranceRepository: Repository<VolunteerInsurance>,
        @InjectRepository(VolunteerVehicle)
        private vehicleRepository: Repository<VolunteerVehicle>,
    ) { }

    /**
     * 取得所有即將到期的項目
     */
    async getExpiringItems(daysAhead: number = 30): Promise<ExpiringItem[]> {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        const items: ExpiringItem[] = [];

        // 1. 檢查證照到期
        const certificates = await this.certificateRepository
            .createQueryBuilder('cert')
            .leftJoinAndSelect('cert.volunteer', 'volunteer')
            .where('cert.expiresAt IS NOT NULL')
            .andWhere('cert.expiresAt >= :now', { now })
            .andWhere('cert.expiresAt <= :futureDate', { futureDate })
            .getMany();

        for (const cert of certificates) {
            if (!cert.expiresAt) continue;
            const daysUntil = this.calculateDaysUntil(cert.expiresAt);
            items.push({
                type: 'certificate',
                id: cert.id,
                volunteerId: cert.volunteerId,
                volunteerName: cert.volunteer?.name,
                name: cert.certificateName,
                expiresAt: cert.expiresAt,
                daysUntilExpiry: daysUntil,
            });
        }

        // 2. 檢查保險到期
        const insurances = await this.insuranceRepository
            .createQueryBuilder('ins')
            .leftJoinAndSelect('ins.volunteer', 'volunteer')
            .where('ins.isActive = true')
            .andWhere('ins.validTo >= :now', { now })
            .andWhere('ins.validTo <= :futureDate', { futureDate })
            .getMany();

        for (const ins of insurances) {
            const daysUntil = this.calculateDaysUntil(ins.validTo);
            items.push({
                type: 'insurance',
                id: ins.id,
                volunteerId: ins.volunteerId,
                volunteerName: ins.volunteer?.name,
                name: `${ins.insuranceCompany} - ${ins.insuranceType}`,
                expiresAt: ins.validTo,
                daysUntilExpiry: daysUntil,
            });
        }

        // 3. 檢查車輛保險到期
        const vehicles = await this.vehicleRepository
            .createQueryBuilder('vehicle')
            .leftJoinAndSelect('vehicle.volunteer', 'volunteer')
            .where('vehicle.isActive = true')
            .andWhere('vehicle.insuranceExpiresAt IS NOT NULL')
            .andWhere('vehicle.insuranceExpiresAt >= :now', { now })
            .andWhere('vehicle.insuranceExpiresAt <= :futureDate', { futureDate })
            .getMany();

        for (const vehicle of vehicles) {
            const daysUntil = this.calculateDaysUntil(vehicle.insuranceExpiresAt!);
            items.push({
                type: 'vehicle_insurance',
                id: vehicle.id,
                volunteerId: vehicle.volunteerId,
                volunteerName: vehicle.volunteer?.name,
                name: `車輛 ${vehicle.licensePlate} 保險`,
                expiresAt: vehicle.insuranceExpiresAt!,
                daysUntilExpiry: daysUntil,
            });
        }

        // 按到期日排序
        items.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

        return items;
    }

    /**
     * 取得特定志工的即將到期項目
     */
    async getExpiringItemsForVolunteer(volunteerId: string, daysAhead: number = 30): Promise<ExpiringItem[]> {
        const allItems = await this.getExpiringItems(daysAhead);
        return allItems.filter(item => item.volunteerId === volunteerId);
    }

    /**
     * 取得今日需發送通知的項目 (7天、3天、1天)
     */
    async getTodayNotifications(): Promise<ExpiringItem[]> {
        const items = await this.getExpiringItems(7);
        // 只回傳 7天、3天、1天 到期的項目
        return items.filter(item =>
            item.daysUntilExpiry === 7 ||
            item.daysUntilExpiry === 3 ||
            item.daysUntilExpiry === 1 ||
            item.daysUntilExpiry === 0
        );
    }

    /**
     * 發送 LINE 到期提醒 (整合 LINE Bot)
     */
    async sendLineNotifications(): Promise<NotificationResult> {
        const items = await this.getTodayNotifications();
        let sent = 0;
        let failed = 0;

        for (const item of items) {
            try {
                // TODO: 呼叫 LINE Bot API 發送訊息
                // 這裡需要整合 LINE Messaging API
                const message = this.formatExpiryMessage(item);
                this.logger.log(`[LINE] Would send to ${item.volunteerId}: ${message}`);

                // await this.lineService.sendMessage(item.volunteerId, message);
                sent++;
            } catch (error) {
                this.logger.error(`Failed to send notification for ${item.id}:`, error);
                failed++;
            }
        }

        return { sent, failed, items };
    }

    /**
     * 格式化到期提醒訊息
     */
    private formatExpiryMessage(item: ExpiringItem): string {
        const typeLabels = {
            certificate: '證照',
            insurance: '保險',
            vehicle_insurance: '車輛保險',
        };

        const urgency = item.daysUntilExpiry === 0
            ? '🚨 今日到期'
            : item.daysUntilExpiry <= 3
                ? '⚠️ 即將到期'
                : '📅 提醒';

        return `${urgency}\n\n` +
            `您的${typeLabels[item.type]}「${item.name}」將於 ${item.daysUntilExpiry} 天後到期\n` +
            `到期日：${item.expiresAt.toLocaleDateString('zh-TW')}\n\n` +
            `請盡快辦理續期，以確保任務出勤時的保障。`;
    }

    private calculateDaysUntil(date: Date): number {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const target = new Date(date);
        target.setHours(0, 0, 0, 0);
        return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
}
