import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Donor, DonorType } from './donor.entity';
import { Donation, PaymentMethod, DonationStatus, DonationType } from './donation.entity';
import { Receipt, ReceiptStatus } from './receipt.entity';
import * as crypto from 'crypto';

// DTO 定義
export interface CreateDonorDto {
    type: DonorType;
    name: string;
    email?: string;
    phone?: string;
    identityNumber?: string;
    taxId?: string;
    address?: string;
    isAnonymous?: boolean;
    wantsReceipt?: boolean;
    wantsEmailReceipt?: boolean;
    accountId?: string;
}

export interface CreateDonationDto {
    donorId?: string;
    donor?: CreateDonorDto;
    amount: number;
    paymentMethod: PaymentMethod;
    donationType?: DonationType;
    projectName?: string;
    purpose?: string;
    notes?: string;
}

@Injectable()
export class DonationsService {
    private readonly logger = new Logger(DonationsService.name);

    // 加密金鑰 (實際應從環境變數讀取)
    private readonly encryptionKey = process.env.ENCRYPTION_KEY || 'light-keepers-secret-key-32chars!';

    constructor(
        @InjectRepository(Donor)
        private donorRepository: Repository<Donor>,
        @InjectRepository(Donation)
        private donationRepository: Repository<Donation>,
        @InjectRepository(Receipt)
        private receiptRepository: Repository<Receipt>,
    ) { }

    // ==================== 捐款人管理 ====================

    async createDonor(dto: CreateDonorDto): Promise<Donor> {
        const donorData: Partial<Donor> = {
            type: dto.type,
            name: dto.name,
            email: dto.email,
            phone: dto.phone,
            taxId: dto.taxId,
            address: dto.address,
            isAnonymous: dto.isAnonymous,
            wantsReceipt: dto.wantsReceipt,
            wantsEmailReceipt: dto.wantsEmailReceipt,
            accountId: dto.accountId,
        };

        if (dto.identityNumber) {
            donorData.identityNumber = this.encrypt(dto.identityNumber);
        }

        const donor = this.donorRepository.create(donorData);
        return this.donorRepository.save(donor);
    }

    async findDonorById(id: string): Promise<Donor> {
        const donor = await this.donorRepository.findOne({
            where: { id },
            relations: ['donations'],
        });
        if (!donor) throw new NotFoundException(`Donor ${id} not found`);
        return donor;
    }

    async findDonorByEmail(email: string): Promise<Donor | null> {
        return this.donorRepository.findOne({ where: { email } });
    }

    async findDonorByAccountId(accountId: string): Promise<Donor | null> {
        return this.donorRepository.findOne({ where: { accountId } });
    }

    async getAllDonors(options?: { limit?: number; offset?: number }): Promise<{ data: Donor[]; total: number }> {
        const [data, total] = await this.donorRepository.findAndCount({
            order: { totalDonationAmount: 'DESC' },
            take: options?.limit || 50,
            skip: options?.offset || 0,
        });
        return { data, total };
    }

    // ==================== 捐款處理 ====================

    async createDonation(dto: CreateDonationDto): Promise<Donation> {
        let donorId = dto.donorId;

        // 如果沒有 donorId 但有 donor 資料，先建立捐款人
        if (!donorId && dto.donor) {
            const donor = await this.createDonor(dto.donor);
            donorId = donor.id;
        }

        if (!donorId) {
            throw new Error('必須提供捐款人資料');
        }

        // 產生商家訂單編號
        const merchantTradeNo = this.generateMerchantTradeNo();

        const donation = this.donationRepository.create({
            donorId,
            amount: dto.amount,
            paymentMethod: dto.paymentMethod,
            donationType: dto.donationType || 'one_time',
            projectName: dto.projectName,
            purpose: dto.purpose,
            notes: dto.notes,
            merchantTradeNo,
            status: 'pending',
        });

        const saved = await this.donationRepository.save(donation);
        this.logger.log(`💰 新捐款建立: ${merchantTradeNo}, 金額: ${dto.amount}`);
        return saved;
    }

    async confirmPayment(merchantTradeNo: string, transactionId: string): Promise<Donation> {
        const donation = await this.donationRepository.findOne({
            where: { merchantTradeNo },
            relations: ['donor'],
        });

        if (!donation) throw new NotFoundException(`Donation ${merchantTradeNo} not found`);

        donation.status = 'paid';
        donation.transactionId = transactionId;
        donation.paidAt = new Date();

        await this.donationRepository.save(donation);

        // 更新捐款人統計
        await this.updateDonorStats(donation.donorId);

        // 自動開立收據
        if (donation.donor?.wantsReceipt) {
            await this.issueReceipt(donation.id);
        }

        this.logger.log(`✅ 捐款確認: ${merchantTradeNo}, 交易編號: ${transactionId}`);
        return donation;
    }

    async getDonation(id: string): Promise<Donation> {
        const donation = await this.donationRepository.findOne({
            where: { id },
            relations: ['donor', 'receipt'],
        });
        if (!donation) throw new NotFoundException(`Donation ${id} not found`);
        return donation;
    }

    async getDonations(options?: {
        status?: DonationStatus;
        donorId?: string;
        limit?: number;
        offset?: number;
    }): Promise<{ data: Donation[]; total: number }> {
        const qb = this.donationRepository.createQueryBuilder('donation')
            .leftJoinAndSelect('donation.donor', 'donor')
            .leftJoinAndSelect('donation.receipt', 'receipt')
            .orderBy('donation.createdAt', 'DESC');

        if (options?.status) {
            qb.andWhere('donation.status = :status', { status: options.status });
        }
        if (options?.donorId) {
            qb.andWhere('donation.donorId = :donorId', { donorId: options.donorId });
        }

        qb.take(options?.limit || 50);
        qb.skip(options?.offset || 0);

        const [data, total] = await qb.getManyAndCount();
        return { data, total };
    }

    // ==================== 收據管理 ====================

    async issueReceipt(donationId: string): Promise<Receipt> {
        const donation = await this.getDonation(donationId);

        if (donation.receiptId) {
            throw new Error('此捐款已開立收據');
        }

        const receiptNo = await this.generateReceiptNo();

        const receipt = this.receiptRepository.create({
            donationId,
            receiptNo,
            donorName: donation.donor.isAnonymous ? '善心人士' : donation.donor.name,
            donorIdentity: this.maskIdentity(donation.donor),
            amount: donation.amount,
            purpose: donation.purpose || '公益捐款',
            issuedAt: new Date(),
            year: new Date().getFullYear(),
            status: 'issued',
        });

        const saved = await this.receiptRepository.save(receipt);

        // 更新捐款紀錄
        donation.receiptId = saved.id;
        await this.donationRepository.save(donation);

        this.logger.log(`📄 收據開立: ${receiptNo}`);
        return saved;
    }

    async cancelReceipt(receiptId: string, reason: string): Promise<Receipt> {
        const receipt = await this.receiptRepository.findOne({ where: { id: receiptId } });
        if (!receipt) throw new NotFoundException(`Receipt ${receiptId} not found`);

        receipt.status = 'cancelled';
        receipt.cancelledAt = new Date();
        receipt.cancelReason = reason;

        this.logger.log(`❌ 收據作廢: ${receipt.receiptNo}, 原因: ${reason}`);
        return this.receiptRepository.save(receipt);
    }

    async getReceiptsByYear(year: number): Promise<Receipt[]> {
        return this.receiptRepository.find({
            where: { year, status: 'issued' as ReceiptStatus },
            order: { issuedAt: 'DESC' },
        });
    }

    async getReceiptById(receiptId: string): Promise<Receipt | null> {
        return this.receiptRepository.findOne({ where: { id: receiptId } });
    }

    // ==================== 統計 ====================

    async getStats(): Promise<{
        totalDonations: number;
        totalAmount: number;
        donorCount: number;
        todayAmount: number;
        monthAmount: number;
        byPaymentMethod: Record<string, number>;
    }> {
        const donations = await this.donationRepository.find({ where: { status: 'paid' } });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        const totalAmount = donations.reduce((sum, d) => sum + Number(d.amount), 0);
        const todayAmount = donations
            .filter(d => new Date(d.paidAt) >= today)
            .reduce((sum, d) => sum + Number(d.amount), 0);
        const monthAmount = donations
            .filter(d => new Date(d.paidAt) >= monthStart)
            .reduce((sum, d) => sum + Number(d.amount), 0);

        const byPaymentMethod: Record<string, number> = {};
        donations.forEach(d => {
            byPaymentMethod[d.paymentMethod] = (byPaymentMethod[d.paymentMethod] || 0) + Number(d.amount);
        });

        const donorCount = await this.donorRepository.count();

        return {
            totalDonations: donations.length,
            totalAmount,
            donorCount,
            todayAmount,
            monthAmount,
            byPaymentMethod,
        };
    }

    // ==================== 私有方法 ====================

    private generateMerchantTradeNo(): string {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `LK${timestamp}${random}`;
    }

    private async generateReceiptNo(): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `LK-${year}-`;

        // 取得今年最大流水號
        const lastReceipt = await this.receiptRepository
            .createQueryBuilder('receipt')
            .where('receipt.receiptNo LIKE :prefix', { prefix: `${prefix}%` })
            .orderBy('receipt.receiptNo', 'DESC')
            .getOne();

        let nextNum = 1;
        if (lastReceipt) {
            const lastNum = parseInt(lastReceipt.receiptNo.replace(prefix, ''), 10);
            nextNum = lastNum + 1;
        }

        return `${prefix}${nextNum.toString().padStart(6, '0')}`;
    }

    private async updateDonorStats(donorId: string): Promise<void> {
        const donations = await this.donationRepository.find({
            where: { donorId, status: 'paid' },
        });

        const totalAmount = donations.reduce((sum, d) => sum + Number(d.amount), 0);

        await this.donorRepository.update(donorId, {
            totalDonationCount: donations.length,
            totalDonationAmount: totalAmount,
        });
    }

    private maskIdentity(donor: Donor): string {
        if (donor.taxId) {
            return donor.taxId; // 統編不遮罩
        }
        if (donor.identityNumber) {
            const decrypted = this.decrypt(donor.identityNumber);
            return decrypted ? `${decrypted.charAt(0)}****${decrypted.slice(-4)}` : '';
        }
        return '';
    }

    private encrypt(text: string): string {
        const iv = crypto.randomBytes(16);
        const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    private decrypt(encrypted: string): string {
        try {
            const [ivHex, encryptedText] = encrypted.split(':');
            const iv = Buffer.from(ivHex, 'hex');
            const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch {
            return '';
        }
    }
}
