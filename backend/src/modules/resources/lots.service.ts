import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lot } from './lot.entity';
import { Resource, ControlLevel } from './resources.entity';
import { QrCodeService } from './qr-code.service';

/**
 * 批次管理服務（僅適用 controlled/medical）
 */
@Injectable()
export class LotsService {
    constructor(
        @InjectRepository(Lot)
        private readonly lotRepo: Repository<Lot>,

        @InjectRepository(Resource)
        private readonly resourceRepo: Repository<Resource>,

        private readonly qrCodeService: QrCodeService,
    ) { }

    /**
     * 創建批次（入庫時自動呼叫）
     */
    async create(data: {
        itemId: string;
        lotNumber: string;
        expiryDate?: Date;
        quantity: number;
        warehouseId: string;
        locationId?: string;
    }): Promise<Lot> {
        // 檢查品項是否為 controlled/medical
        const item = await this.resourceRepo.findOne({ where: { id: data.itemId } });
        if (!item) {
            throw new NotFoundException('品項不存在');
        }

        if (item.controlLevel === 'civil') {
            throw new BadRequestException('民生物品不可產生批次與 QR Code');
        }

        // 產生 QR Code
        const lot = this.lotRepo.create(data);
        lot.qrValue = this.qrCodeService.generateQrValue('LOT', lot.id);

        return this.lotRepo.save(lot);
    }

    /**
     * 查詢批次
     */
    async findAll(filters?: {
        itemId?: string;
        warehouseId?: string;
        status?: 'active' | 'depleted' | 'expired';
    }): Promise<Lot[]> {
        const query = this.lotRepo.createQueryBuilder('lot')
            .leftJoinAndSelect('lot.item', 'item');

        if (filters?.itemId) {
            query.andWhere('lot.itemId = :itemId', { itemId: filters.itemId });
        }

        if (filters?.warehouseId) {
            query.andWhere('lot.warehouseId = :warehouseId', { warehouseId: filters.warehouseId });
        }

        if (filters?.status) {
            query.andWhere('lot.status = :status', { status: filters.status });
        }

        query.orderBy('lot.expiryDate', 'ASC', 'NULLS LAST');
        return query.getMany();
    }

    /**
     * 查詢單一批次
     */
    async findOne(id: string): Promise<Lot> {
        const lot = await this.lotRepo.findOne({
            where: { id },
            relations: ['item'],
        });

        if (!lot) {
            throw new NotFoundException('批次不存在');
        }

        return lot;
    }

    /**
     * 透過 QR Code 查詢批次
     */
    async findByQrCode(qrValue: string): Promise<Lot> {
        // 驗證 QR Code
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
    async updateQuantity(id: string, delta: number): Promise<Lot> {
        const lot = await this.findOne(id);

        lot.quantity += delta;

        if (lot.quantity < 0) {
            throw new BadRequestException('批次數量不足');
        }

        if (lot.quantity === 0) {
            lot.status = 'depleted';
        }

        return this.lotRepo.save(lot);
    }

    /**
     * 標記批次為過期
     */
    async markAsExpired(id: string): Promise<Lot> {
        const lot = await this.findOne(id);
        lot.status = 'expired';
        return this.lotRepo.save(lot);
    }

    /**
     * 批次產碼（資產入庫時）
     */
    async batchCreateForAssets(params: {
        itemId: string;
        count: number;
        warehouseId: string;
        locationId?: string;
    }): Promise<Lot[]> {
        const lots: Lot[] = [];

        for (let i = 0; i < params.count; i++) {
            const lot = await this.create({
                itemId: params.itemId,
                lotNumber: `AUTO-${Date.now()}-${i}`,
                quantity: 1,
                warehouseId: params.warehouseId,
                locationId: params.locationId,
            });
            lots.push(lot);
        }

        return lots;
    }

    /**
     * 記錄貼紙列印
     */
    async recordPrint(lotId: string, printBatchId: string): Promise<void> {
        const lot = await this.findOne(lotId);
        lot.labelsPrinted += 1;
        lot.lastPrintBatchId = printBatchId;
        await this.lotRepo.save(lot);
    }

    /**
     * 檢查即期批次（定期執行）
     */
    async checkExpiring(days: number = 30): Promise<Lot[]> {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() + days);

        return this.lotRepo.createQueryBuilder('lot')
            .where('lot.status = :status', { status: 'active' })
            .andWhere('lot.expiryDate IS NOT NULL')
            .andWhere('lot.expiryDate <= :threshold', { threshold: thresholdDate })
            .leftJoinAndSelect('lot.item', 'item')
            .orderBy('lot.expiryDate', 'ASC')
            .getMany();
    }
}
