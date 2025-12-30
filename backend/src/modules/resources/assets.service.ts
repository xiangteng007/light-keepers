import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset, AssetStatus } from './asset.entity';
import { AssetTransaction, AssetTransactionType } from './asset-transaction.entity';
import { StorageLocation } from './storage-location.entity';
import { Resource } from './resources.entity';

export interface CreateAssetDto {
    itemId: string;
    assetNo: string;
    serialNo?: string;
    barcode?: string;
    locationId?: string;
    purchaseDate?: Date;
    unitPrice?: number;
    warrantyExpiry?: Date;
    internalNote?: string;
}

export interface BorrowAssetDto {
    borrowerName: string;
    borrowerOrg?: string;
    borrowerContact?: string;
    purpose?: string;
    expectedReturnDate: Date;
    operatorName: string;
    operatorId?: string;
}

export interface ReturnAssetDto {
    returnCondition: 'normal' | 'damaged' | 'missing_parts' | 'needs_repair';
    conditionNote?: string;
    toLocationId: string;
    operatorName: string;
    operatorId?: string;
    attachments?: string[];
}

@Injectable()
export class AssetsService {
    private readonly logger = new Logger(AssetsService.name);

    constructor(
        @InjectRepository(Asset)
        private assetRepo: Repository<Asset>,
        @InjectRepository(AssetTransaction)
        private transactionRepo: Repository<AssetTransaction>,
        @InjectRepository(StorageLocation)
        private locationRepo: Repository<StorageLocation>,
        @InjectRepository(Resource)
        private resourceRepo: Repository<Resource>,
    ) { }

    // ==================== 資產 CRUD ====================

    async create(dto: CreateAssetDto): Promise<Asset> {
        // 驗證品項存在
        const item = await this.resourceRepo.findOne({ where: { id: dto.itemId } });
        if (!item) throw new NotFoundException(`Item ${dto.itemId} not found`);

        const asset = this.assetRepo.create({
            ...dto,
            status: 'in_stock',
            barcode: dto.barcode || `AST:${dto.assetNo}`,
        });
        const saved = await this.assetRepo.save(asset);
        this.logger.log(`🔧 Created asset: ${saved.assetNo}`);
        return saved;
    }

    async findAll(status?: AssetStatus): Promise<Asset[]> {
        const where = status ? { status } : {};
        return this.assetRepo.find({
            where,
            relations: ['item', 'location', 'location.warehouse'],
            order: { assetNo: 'ASC' },
        });
    }

    async findById(id: string): Promise<Asset> {
        const asset = await this.assetRepo.findOne({
            where: { id },
            relations: ['item', 'location', 'location.warehouse'],
        });
        if (!asset) throw new NotFoundException(`Asset ${id} not found`);
        return asset;
    }

    async findByAssetNo(assetNo: string): Promise<Asset | null> {
        return this.assetRepo.findOne({
            where: { assetNo },
            relations: ['item', 'location', 'location.warehouse'],
        });
    }

    async findByBarcode(barcode: string): Promise<Asset | null> {
        return this.assetRepo.findOne({
            where: { barcode },
            relations: ['item', 'location', 'location.warehouse'],
        });
    }

    async update(id: string, dto: Partial<Asset>): Promise<Asset> {
        await this.assetRepo.update(id, dto);
        return this.findById(id);
    }

    // ==================== 借出/歸還 ====================

    async borrowAsset(assetId: string, dto: BorrowAssetDto): Promise<Asset> {
        const asset = await this.findById(assetId);

        // 驗證狀態
        if (asset.status !== 'in_stock') {
            throw new BadRequestException(`資產狀態為「${this.getStatusLabel(asset.status)}」，無法借出`);
        }

        // 更新資產狀態
        asset.status = 'borrowed';
        asset.borrowerName = dto.borrowerName;
        asset.borrowerOrg = dto.borrowerOrg;
        asset.borrowerContact = dto.borrowerContact;
        asset.borrowDate = new Date();
        asset.expectedReturnDate = dto.expectedReturnDate;
        asset.borrowPurpose = dto.purpose;
        asset.locationId = undefined; // 清除儲位
        await this.assetRepo.save(asset);

        // 記錄交易
        await this.transactionRepo.save({
            assetId,
            type: 'borrow' as AssetTransactionType,
            borrowerName: dto.borrowerName,
            borrowerOrg: dto.borrowerOrg,
            borrowerContact: dto.borrowerContact,
            purpose: dto.purpose,
            expectedReturnDate: dto.expectedReturnDate,
            fromLocationId: asset.locationId,
            operatorName: dto.operatorName,
            operatorId: dto.operatorId,
        });

        this.logger.log(`📤 Asset borrowed: ${asset.assetNo} by ${dto.borrowerName}`);
        return asset;
    }

    async returnAsset(assetId: string, dto: ReturnAssetDto): Promise<Asset> {
        const asset = await this.findById(assetId);

        // 驗證狀態
        if (asset.status !== 'borrowed') {
            throw new BadRequestException(`資產狀態為「${this.getStatusLabel(asset.status)}」，無法歸還`);
        }

        // 驗證儲位
        const toLocation = await this.locationRepo.findOne({ where: { id: dto.toLocationId } });
        if (!toLocation) throw new NotFoundException(`Location ${dto.toLocationId} not found`);

        // 判斷歸還後狀態
        let newStatus: AssetStatus = 'in_stock';
        if (dto.returnCondition === 'needs_repair') {
            newStatus = 'maintenance';
        }

        // 更新資產狀態
        asset.status = newStatus;
        asset.locationId = dto.toLocationId;
        asset.returnCondition = dto.returnCondition;
        asset.damageNote = dto.conditionNote;
        if (dto.attachments) {
            asset.attachments = dto.attachments;
        }
        // 清除借用資訊
        asset.borrowerName = undefined;
        asset.borrowerOrg = undefined;
        asset.borrowerContact = undefined;
        asset.borrowDate = undefined;
        asset.expectedReturnDate = undefined;
        asset.borrowPurpose = undefined;
        await this.assetRepo.save(asset);

        // 記錄交易
        await this.transactionRepo.save({
            assetId,
            type: 'return' as AssetTransactionType,
            actualReturnDate: new Date(),
            returnCondition: dto.returnCondition,
            conditionNote: dto.conditionNote,
            toLocationId: dto.toLocationId,
            operatorName: dto.operatorName,
            operatorId: dto.operatorId,
            attachments: dto.attachments,
        });

        this.logger.log(`📥 Asset returned: ${asset.assetNo} to ${toLocation.fullPath}`);
        return asset;
    }

    // ==================== 其他操作 ====================

    async markMaintenance(assetId: string, notes: string, operatorName: string): Promise<Asset> {
        const asset = await this.findById(assetId);
        if (asset.status === 'borrowed') {
            throw new BadRequestException('借出中的資產需先歸還才能送修');
        }

        asset.status = 'maintenance';
        asset.internalNote = notes;
        await this.assetRepo.save(asset);

        await this.transactionRepo.save({
            assetId,
            type: 'maintenance_in' as AssetTransactionType,
            notes,
            operatorName,
            fromLocationId: asset.locationId,
        });

        this.logger.log(`🔧 Asset in maintenance: ${asset.assetNo}`);
        return asset;
    }

    async completeMaintenance(assetId: string, toLocationId: string, notes: string, operatorName: string): Promise<Asset> {
        const asset = await this.findById(assetId);
        if (asset.status !== 'maintenance') {
            throw new BadRequestException('資產不在維修狀態');
        }

        asset.status = 'in_stock';
        asset.locationId = toLocationId;
        asset.internalNote = notes;
        asset.damageNote = undefined;
        asset.returnCondition = undefined;
        await this.assetRepo.save(asset);

        await this.transactionRepo.save({
            assetId,
            type: 'maintenance_out' as AssetTransactionType,
            notes,
            operatorName,
            toLocationId,
        });

        this.logger.log(`✅ Asset maintenance completed: ${asset.assetNo}`);
        return asset;
    }

    async dispose(assetId: string, reason: string, operatorName: string): Promise<Asset> {
        const asset = await this.findById(assetId);
        if (asset.status === 'borrowed') {
            throw new BadRequestException('借出中的資產無法報廢');
        }

        asset.status = 'disposed';
        asset.internalNote = reason;
        asset.locationId = undefined;
        await this.assetRepo.save(asset);

        await this.transactionRepo.save({
            assetId,
            type: 'dispose' as AssetTransactionType,
            notes: reason,
            operatorName,
        });

        this.logger.log(`🗑️ Asset disposed: ${asset.assetNo}`);
        return asset;
    }

    async reportLost(assetId: string, notes: string, operatorName: string): Promise<Asset> {
        const asset = await this.findById(assetId);

        asset.status = 'lost';
        asset.internalNote = notes;
        asset.locationId = undefined;
        await this.assetRepo.save(asset);

        await this.transactionRepo.save({
            assetId,
            type: 'report_lost' as AssetTransactionType,
            notes,
            operatorName,
        });

        this.logger.log(`⚠️ Asset reported lost: ${asset.assetNo}`);
        return asset;
    }

    // ==================== 統計與查詢 ====================

    async getTransactions(assetId?: string): Promise<AssetTransaction[]> {
        const where = assetId ? { assetId } : {};
        return this.transactionRepo.find({
            where,
            relations: ['asset', 'fromLocation', 'toLocation'],
            order: { createdAt: 'DESC' },
            take: 100,
        });
    }

    async getStats(): Promise<{
        total: number;
        byStatus: Record<string, number>;
        overdue: number;
    }> {
        const all = await this.assetRepo.find();
        const now = new Date();

        const byStatus: Record<string, number> = {};
        let overdue = 0;

        for (const asset of all) {
            byStatus[asset.status] = (byStatus[asset.status] || 0) + 1;
            if (asset.status === 'borrowed' && asset.expectedReturnDate && asset.expectedReturnDate < now) {
                overdue++;
            }
        }

        return { total: all.length, byStatus, overdue };
    }

    async getOverdueAssets(): Promise<Asset[]> {
        const now = new Date();
        const borrowed = await this.assetRepo.find({
            where: { status: 'borrowed' },
            relations: ['item'],
        });
        return borrowed.filter(a => a.expectedReturnDate && a.expectedReturnDate < now);
    }

    // ==================== 輔助方法 ====================

    private getStatusLabel(status: AssetStatus): string {
        const labels: Record<AssetStatus, string> = {
            in_stock: '在庫',
            borrowed: '借出中',
            maintenance: '維修中',
            disposed: '已報廢',
            lost: '遺失',
        };
        return labels[status] || status;
    }

    /**
     * 過濾敏感資訊（用於志工頁面）
     */
    sanitizeForPublic(asset: Asset): Partial<Asset> {
        return {
            id: asset.id,
            itemId: asset.itemId,
            item: asset.item,
            assetNo: asset.assetNo,
            barcode: asset.barcode,
            status: asset.status,
            location: asset.location,
            locationId: asset.locationId,
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt,
            // 隱藏敏感欄位: borrowerName, borrowerOrg, borrowerContact, unitPrice, attachments, internalNote, damageNote
        };
    }
}
