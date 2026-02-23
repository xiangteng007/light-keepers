import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Resource, ResourceCategory, ResourceStatus } from './resources.entity';
import { ResourceTransaction, TransactionType } from './resource-transaction.entity';
import { DonationSource, DonorType } from './donation-source.entity';
import { ResourceBatch } from './resource-batch.entity';

export interface CreateResourceDto {
    name: string;
    category: ResourceCategory;
    description?: string;
    quantity: number;
    unit?: string;
    minQuantity?: number;
    location?: string;
    expiresAt?: Date;
    photoUrl?: string;
    barcode?: string;
}

export interface TransactionDto {
    resourceId: string;
    type: TransactionType;
    quantity: number;
    operatorName: string;
    operatorId?: string;
    fromLocation?: string;
    toLocation?: string;
    notes?: string;
    referenceNo?: string;
    // Phase 4: 領用人資訊 (controlled/medical 必填)
    recipientName?: string;
    recipientPhone?: string;
    recipientIdNo?: string;
    recipientOrg?: string;
    purpose?: string;
    // A4: 任務/事件串接
    taskId?: string;
    eventId?: string;
}

export interface CreateDonationSourceDto {
    name: string;
    type: DonorType;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    taxId?: string;
    notes?: string;
    needsReceipt?: boolean;
}

@Injectable()
export class ResourcesService {
    private readonly logger = new Logger(ResourcesService.name);

    constructor(
        @InjectRepository(Resource)
        private resourcesRepository: Repository<Resource>,
        @InjectRepository(ResourceTransaction)
        private transactionRepository: Repository<ResourceTransaction>,
        @InjectRepository(DonationSource)
        private donationSourceRepository: Repository<DonationSource>,
        @InjectRepository(ResourceBatch)
        private batchRepository: Repository<ResourceBatch>,
    ) { }

    // ==================== 基本 CRUD ====================

    async create(dto: CreateResourceDto): Promise<Resource> {
        const resource = this.resourcesRepository.create({
            ...dto,
            status: this.calculateStatus(dto.quantity, dto.minQuantity || 10),
        });
        return this.resourcesRepository.save(resource);
    }

    async findAll(category?: ResourceCategory): Promise<Resource[]> {
        const where = category ? { category } : {};
        return this.resourcesRepository.find({
            where,
            order: { category: 'ASC', name: 'ASC' },
        });
    }

    async findOne(id: string): Promise<Resource> {
        const resource = await this.resourcesRepository.findOne({ where: { id } });
        if (!resource) throw new NotFoundException(`Resource ${id} not found`);
        return resource;
    }

    async update(id: string, dto: Partial<CreateResourceDto>): Promise<Resource> {
        await this.resourcesRepository.update(id, dto);
        return this.findOne(id);
    }

    async delete(id: string): Promise<void> {
        await this.resourcesRepository.delete(id);
    }

    // ==================== 📊 異動紀錄 (功能1) ====================

    /**
     * 記錄物資異動 (Phase 4: 增加 controlled/medical 驗證)
     */
    async recordTransaction(dto: TransactionDto): Promise<ResourceTransaction> {
        const resource = await this.findOne(dto.resourceId);
        const beforeQuantity = resource.quantity;

        // Phase 4: controlled/medical 出庫驗證
        const needsApproval = dto.type === 'out' &&
            (resource.controlLevel === 'controlled' || resource.controlLevel === 'medical');

        if (needsApproval) {
            // 領用人信息必填檢查
            if (!dto.recipientName || dto.recipientName.trim().length === 0) {
                throw new BadRequestException(`${resource.controlLevel} 品項出庫必須填寫領用人姓名`);
            }
            if (!dto.purpose || dto.purpose.trim().length < 5) {
                throw new BadRequestException(`${resource.controlLevel} 品項出庫必須填寫用途說明（至少 5 個字）`);
            }
        }

        // 計算新數量
        let afterQuantity = beforeQuantity;
        if (dto.type === 'in' || dto.type === 'donate') {
            afterQuantity = beforeQuantity + dto.quantity;
        } else if (dto.type === 'out') {
            // Phase 4: controlled/medical 不立即扣庫存，等待覆核
            if (!needsApproval) {
                afterQuantity = Math.max(0, beforeQuantity - dto.quantity);
            } else {
                // 待覆核，不改變 afterQuantity
                afterQuantity = beforeQuantity;
            }
        } else if (dto.type === 'expired') {
            afterQuantity = Math.max(0, beforeQuantity - dto.quantity);
        } else if (dto.type === 'adjust') {
            afterQuantity = dto.quantity; // 直接設定
        }

        // 更新物資數量（除非待覆核）
        if (!needsApproval || dto.type !== 'out') {
            resource.quantity = afterQuantity;
            resource.status = this.calculateStatus(afterQuantity, resource.minQuantity);
            if (dto.toLocation) resource.location = dto.toLocation;
            await this.resourcesRepository.save(resource);
        }

        // 建立異動紀錄
        const transaction = this.transactionRepository.create({
            resourceId: dto.resourceId,
            type: dto.type,
            quantity: dto.quantity,
            beforeQuantity,
            afterQuantity,
            operatorName: dto.operatorName,
            operatorId: dto.operatorId,
            fromLocation: dto.fromLocation,
            toLocation: dto.toLocation,
            notes: dto.notes,
            referenceNo: dto.referenceNo,
            // Phase 4: 領用人資訊
            recipientName: dto.recipientName,
            recipientPhone: dto.recipientPhone,
            recipientIdNo: dto.recipientIdNo,
            recipientOrg: dto.recipientOrg,
            purpose: dto.purpose,
            // Phase 4: 覆核狀態
            approvalStatus: needsApproval ? 'pending' : undefined,
            // A4: 任務/事件串接
            taskId: dto.taskId,
            eventId: dto.eventId,
        });

        const logAction = needsApproval ? '🕒 待覆核' : dto.type;
        this.logger.log(`📦 ${logAction}: ${resource.name} ${beforeQuantity} → ${afterQuantity} by ${dto.operatorName}`);

        return this.transactionRepository.save(transaction);
    }

    /**
     * 入庫
     */
    async addStock(id: string, quantity: number, operatorName: string, notes?: string): Promise<Resource> {
        await this.recordTransaction({
            resourceId: id,
            type: 'in',
            quantity,
            operatorName,
            notes,
        });
        return this.findOne(id);
    }

    /**
     * 出庫
     */
    async deductStock(id: string, quantity: number, operatorName: string, notes?: string): Promise<Resource> {
        await this.recordTransaction({
            resourceId: id,
            type: 'out',
            quantity,
            operatorName,
            notes,
        });
        return this.findOne(id);
    }

    /**
     * 取得異動紀錄
     */
    async getTransactions(resourceId?: string): Promise<ResourceTransaction[]> {
        const where = resourceId ? { resourceId } : {};
        return this.transactionRepository.find({
            where,
            order: { createdAt: 'DESC' },
            take: 100,
        });
    }

    /**
     * 刪除交易紀錄 (僅系統擁有者)
     */
    async deleteTransaction(transactionId: string): Promise<void> {
        const transaction = await this.transactionRepository.findOne({ where: { id: transactionId } });
        if (!transaction) {
            throw new NotFoundException(`Transaction ${transactionId} not found`);
        }
        await this.transactionRepository.delete(transactionId);
        this.logger.log(`🗑️ Deleted transaction: ${transactionId}`);
    }

    // ==================== 🎁 捐贈來源管理 (功能2) ====================

    async createDonationSource(dto: CreateDonationSourceDto): Promise<DonationSource> {
        const source = this.donationSourceRepository.create(dto);
        return this.donationSourceRepository.save(source);
    }

    async getAllDonationSources(): Promise<DonationSource[]> {
        return this.donationSourceRepository.find({ order: { donationCount: 'DESC' } });
    }

    async recordDonation(
        resourceId: string,
        quantity: number,
        donationSourceId: string,
        operatorName: string,
        estimatedValue?: number,
    ): Promise<ResourceTransaction> {
        // 更新捐贈者統計
        const source = await this.donationSourceRepository.findOne({ where: { id: donationSourceId } });
        if (source) {
            source.donationCount += 1;
            source.totalDonationValue = Number(source.totalDonationValue) + (estimatedValue || 0);
            await this.donationSourceRepository.save(source);
        }

        // 記錄捐贈入庫
        return this.recordTransaction({
            resourceId,
            type: 'donate',
            quantity,
            operatorName,
            referenceNo: donationSourceId,
            notes: `捐贈來源: ${source?.name || 'Unknown'}`,
        });
    }

    // ==================== 🔄 調撥功能 (功能3) ====================

    async transferResource(
        resourceId: string,
        quantity: number,
        fromLocation: string,
        toLocation: string,
        operatorName: string,
    ): Promise<ResourceTransaction> {
        return this.recordTransaction({
            resourceId,
            type: 'transfer',
            quantity,
            operatorName,
            fromLocation,
            toLocation,
            notes: `調撥: ${fromLocation} → ${toLocation}`,
        });
    }

    // ==================== 📦 批次管理 (功能5) ====================

    async createBatch(dto: {
        resourceId: string;
        batchNo: string;
        quantity: number;
        expiresAt?: Date;
        manufacturedAt?: Date;
        donationSourceId?: string;
        unitPrice?: number;
        location?: string;
        barcode?: string;
        photoUrl?: string;
        notes?: string;
    }): Promise<ResourceBatch> {
        const batch = this.batchRepository.create(dto);
        const saved = await this.batchRepository.save(batch);

        // 同步更新主物資數量
        const resource = await this.findOne(dto.resourceId);
        resource.quantity += dto.quantity;
        resource.status = this.calculateStatus(resource.quantity, resource.minQuantity);
        await this.resourcesRepository.save(resource);

        return saved;
    }

    async getBatches(resourceId: string): Promise<ResourceBatch[]> {
        return this.batchRepository.find({
            where: { resourceId },
            order: { expiresAt: 'ASC' },
        });
    }

    async getExpiringBatches(days = 30): Promise<ResourceBatch[]> {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        return this.batchRepository.find({
            where: { expiresAt: LessThanOrEqual(futureDate) },
            order: { expiresAt: 'ASC' },
        });
    }

    // ==================== 📊 統計 ====================

    async getStats(): Promise<{
        total: number;
        byCategory: Record<string, number>;
        lowStock: number;
        expiringSoon: number;
    }> {
        const all = await this.resourcesRepository.find();
        const byCategory: Record<string, number> = {};
        let lowStock = 0;

        for (const r of all) {
            byCategory[r.category] = (byCategory[r.category] || 0) + 1;
            if (r.status === 'low' || r.status === 'depleted') lowStock++;
        }

        const expiring = await this.getExpiringSoon(30);

        return {
            total: all.length,
            byCategory,
            lowStock,
            expiringSoon: expiring.length,
        };
    }

    async getLowStock(): Promise<Resource[]> {
        return this.resourcesRepository.find({
            where: [{ status: 'low' }, { status: 'depleted' }],
        });
    }

    async getExpiringSoon(days = 30): Promise<Resource[]> {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        return this.resourcesRepository.find({
            where: { expiresAt: LessThanOrEqual(futureDate) },
        });
    }

    // ==================== 📱 條碼查詢 (功能4) ====================

    async findByBarcode(barcode: string): Promise<Resource | null> {
        return this.resourcesRepository.findOne({ where: { barcode } });
    }

    // ==================== 內部方法 ====================

    private calculateStatus(quantity: number, minQuantity: number): ResourceStatus {
        if (quantity === 0) return 'depleted';
        if (quantity < minQuantity) return 'low';
        return 'available';
    }

    /**
     * 批量重新計算所有物資狀態
     */
    async recalculateAllStatus(): Promise<{ updated: number }> {
        const all = await this.resourcesRepository.find();
        let updated = 0;

        for (const resource of all) {
            const newStatus = this.calculateStatus(resource.quantity, resource.minQuantity);
            if (resource.status !== newStatus) {
                resource.status = newStatus;
                await this.resourcesRepository.save(resource);
                updated++;
                this.logger.log(`🔄 Recalculated: ${resource.name} → ${newStatus}`);
            }
        }

        return { updated };
    }

    // ==================== 📋 A4: 任務/事件串接 ====================

    /**
     * 依任務 ID 查詢物資異動（出庫/入庫等）
     */
    async findByTask(taskId: string): Promise<ResourceTransaction[]> {
        return this.transactionRepository.find({
            where: { taskId },
            relations: ['resource'],
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * 依事件 ID 彙總資源消耗
     */
    async getUsageByEvent(eventId: string): Promise<{
        totalIn: number;
        totalOut: number;
        netChange: number;
        byCategory: Record<string, { in: number; out: number }>;
        transactions: ResourceTransaction[];
    }> {
        const transactions = await this.transactionRepository.find({
            where: { eventId },
            relations: ['resource'],
            order: { createdAt: 'ASC' },
        });

        let totalIn = 0;
        let totalOut = 0;
        const byCategory: Record<string, { in: number; out: number }> = {};

        for (const tx of transactions) {
            const cat = tx.resource?.category || 'unknown';
            if (!byCategory[cat]) byCategory[cat] = { in: 0, out: 0 };

            if (tx.type === 'in' || tx.type === 'donate') {
                totalIn += tx.quantity;
                byCategory[cat].in += tx.quantity;
            } else if (tx.type === 'out' || tx.type === 'expired') {
                totalOut += tx.quantity;
                byCategory[cat].out += tx.quantity;
            }
        }

        return {
            totalIn,
            totalOut,
            netChange: totalIn - totalOut,
            byCategory,
            transactions,
        };
    }
}
