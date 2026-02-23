import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceBatch, BatchStatus } from './resource-batch.entity';
import { Resource, ControlLevel } from './resources.entity';
import { QrCodeService } from './qr-code.service';

/**
 * 批次管理服務（統一版，整合原 LotsService）
 * - 一般物資：批次追蹤
 * - 管制/醫療物資：QR Code + 批號 + 倉庫/儲位
 */
@Injectable()
export class LotsService {
    constructor(
        @InjectRepository(ResourceBatch)
        private readonly batchRepo: Repository<ResourceBatch>,

        @InjectRepository(Resource)
        private readonly resourceRepo: Repository<Resource>,

        private readonly qrCodeService: QrCodeService,
    ) { }

    /**
     * 創建批次（入庫時自動呼叫）
     * controlled/medical 物資自動產生 QR Code
     */
    async create(data: {
        resourceId: string;
        batchNo: string;
        expiresAt?: Date;
        manufacturedAt?: Date;
        quantity: number;
        warehouseId?: string;
        storageLocationId?: string;
        donationSourceId?: string;
        unitPrice?: number;
        location?: string;
        barcode?: string;
        photoUrl?: string;
        notes?: string;
    }): Promise<ResourceBatch> {
        const item = await this.resourceRepo.findOne({ where: { id: data.resourceId } });
        if (!item) {
            throw new NotFoundException('品項不存在');
        }

        const batch = this.batchRepo.create({
            ...data,
            status: 'active' as BatchStatus,
        });

        // 管制/醫療物資自動產生 QR Code
        if (item.controlLevel && item.controlLevel !== 'civil') {
            batch.qrValue = this.qrCodeService.generateQrValue('LOT', batch.id);
        }

        return this.batchRepo.save(batch);
    }

    /**
     * 查詢批次
     */
    async findAll(filters?: {
        resourceId?: string;
        warehouseId?: string;
        status?: BatchStatus;
    }): Promise<ResourceBatch[]> {
        const query = this.batchRepo.createQueryBuilder('batch')
            .leftJoinAndSelect('batch.resource', 'resource');

        if (filters?.resourceId) {
            query.andWhere('batch.resourceId = :resourceId', { resourceId: filters.resourceId });
        }

        if (filters?.warehouseId) {
            query.andWhere('batch.warehouseId = :warehouseId', { warehouseId: filters.warehouseId });
        }

        if (filters?.status) {
            query.andWhere('batch.status = :status', { status: filters.status });
        }

        query.orderBy('batch.expiresAt', 'ASC', 'NULLS LAST');
        return query.getMany();
    }

    /**
     * 查詢單一批次
     */
    async findOne(id: string): Promise<ResourceBatch> {
        const batch = await this.batchRepo.findOne({
            where: { id },
            relations: ['resource'],
        });

        if (!batch) {
            throw new NotFoundException('批次不存在');
        }

        return batch;
    }

    /**
     * 透過 QR Code 查詢批次
     */
    async findByQrCode(qrValue: string): Promise<ResourceBatch> {
        const verification = this.qrCodeService.verifyQrValue(qrValue);

        if (!verification.valid) {
            throw new BadRequestException(verification.error);
        }

        if (verification.type !== 'LOT') {
            throw new BadRequestException('此 QR Code 不是批次碼');
        }

        return this.findOne(verification.id!);
    }

    /**
     * 更新批次數量（出庫時扣除）
     */
    async updateQuantity(id: string, delta: number): Promise<ResourceBatch> {
        const batch = await this.findOne(id);

        batch.quantity += delta;

        if (batch.quantity < 0) {
            throw new BadRequestException('批次數量不足');
        }

        if (batch.quantity === 0) {
            batch.status = 'depleted';
        }

        return this.batchRepo.save(batch);
    }

    /**
     * 標記批次為過期
     */
    async markAsExpired(id: string): Promise<ResourceBatch> {
        const batch = await this.findOne(id);
        batch.status = 'expired';
        return this.batchRepo.save(batch);
    }

    /**
     * 批次產碼（資產入庫時）
     */
    async batchCreateForAssets(params: {
        resourceId: string;
        count: number;
        warehouseId?: string;
        storageLocationId?: string;
    }): Promise<ResourceBatch[]> {
        const batches: ResourceBatch[] = [];

        for (let i = 0; i < params.count; i++) {
            const batch = await this.create({
                resourceId: params.resourceId,
                batchNo: `AUTO-${Date.now()}-${i}`,
                quantity: 1,
                warehouseId: params.warehouseId,
                storageLocationId: params.storageLocationId,
            });
            batches.push(batch);
        }

        return batches;
    }

    /**
     * 記錄貼紙列印
     */
    async recordPrint(batchId: string, printBatchId: string): Promise<void> {
        const batch = await this.findOne(batchId);
        batch.labelsPrinted += 1;
        batch.lastPrintBatchId = printBatchId;
        await this.batchRepo.save(batch);
    }

    /**
     * 檢查即期批次（定期執行）
     */
    async checkExpiring(days: number = 30): Promise<ResourceBatch[]> {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() + days);

        return this.batchRepo.createQueryBuilder('batch')
            .where('batch.status = :status', { status: 'active' })
            .andWhere('batch.expiresAt IS NOT NULL')
            .andWhere('batch.expiresAt <= :threshold', { threshold: thresholdDate })
            .leftJoinAndSelect('batch.resource', 'resource')
            .orderBy('batch.expiresAt', 'ASC')
            .getMany();
    }

    // === 相容性別名（原 Lot 用的 field names） ===

    /** @deprecated Use resourceId */
    async findByItemId(itemId: string): Promise<ResourceBatch[]> {
        return this.findAll({ resourceId: itemId });
    }
}
