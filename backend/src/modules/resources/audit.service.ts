import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryAudit, AuditType, AuditStatus } from './inventory-audit.entity';
import { Resource } from './resources.entity';
import { Asset } from './asset.entity';
import { ResourcesService } from './resources.service';

interface AuditItem {
    itemId: string;
    itemName: string;
    systemQty: number;
    actualQty: number;
    difference: number;
    notes?: string;
}

interface AuditAsset {
    assetId: string;
    assetNo: string;
    scanned: boolean;
    missingNote?: string;
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(
        @InjectRepository(InventoryAudit)
        private auditRepo: Repository<InventoryAudit>,
        @InjectRepository(Resource)
        private resourceRepo: Repository<Resource>,
        @InjectRepository(Asset)
        private assetRepo: Repository<Asset>,
        private resourcesService: ResourcesService,
    ) { }

    // 開始耗材盤點
    async startConsumableAudit(dto: {
        auditorName: string;
        auditorId?: string;
        warehouseId?: string;
        locationId?: string;
    }): Promise<InventoryAudit> {
        // 取得系統庫存
        const resources = await this.resourceRepo.find();
        const items: AuditItem[] = resources.map(r => ({
            itemId: r.id,
            itemName: r.name,
            systemQty: r.quantity,
            actualQty: 0, // 待填
            difference: 0,
        }));

        const audit = this.auditRepo.create({
            type: 'consumable',
            status: 'in_progress',
            warehouseId: dto.warehouseId,
            locationId: dto.locationId,
            items: JSON.stringify(items),
            auditorName: dto.auditorName,
            auditorId: dto.auditorId,
            startedAt: new Date(),
        });
        const saved = await this.auditRepo.save(audit);
        this.logger.log(`📊 Started consumable audit: ${saved.id}`);
        return saved;
    }

    // 開始資產盤點
    async startAssetAudit(dto: {
        auditorName: string;
        auditorId?: string;
        warehouseId?: string;
        locationId?: string;
    }): Promise<InventoryAudit> {
        // 取得在庫資產清單
        const assets = await this.assetRepo.find({
            where: { status: 'in_stock' },
            relations: ['item'],
        });
        const auditAssets: AuditAsset[] = assets.map(a => ({
            assetId: a.id,
            assetNo: a.assetNo,
            scanned: false,
        }));

        const audit = this.auditRepo.create({
            type: 'asset',
            status: 'in_progress',
            warehouseId: dto.warehouseId,
            locationId: dto.locationId,
            assets: JSON.stringify(auditAssets),
            auditorName: dto.auditorName,
            auditorId: dto.auditorId,
            startedAt: new Date(),
        });
        const saved = await this.auditRepo.save(audit);
        this.logger.log(`📊 Started asset audit: ${saved.id}`);
        return saved;
    }

    // 取得盤點作業
    async findAll(status?: AuditStatus): Promise<InventoryAudit[]> {
        const where = status ? { status } : {};
        return this.auditRepo.find({
            where,
            order: { createdAt: 'DESC' },
            take: 50,
        });
    }

    async findById(id: string): Promise<InventoryAudit> {
        const audit = await this.auditRepo.findOne({ where: { id } });
        if (!audit) throw new NotFoundException(`Audit ${id} not found`);
        return audit;
    }

    // 更新耗材盤點數量
    async updateConsumableCount(id: string, itemId: string, actualQty: number, notes?: string): Promise<InventoryAudit> {
        const audit = await this.findById(id);
        if (audit.type !== 'consumable' || audit.status !== 'in_progress') {
            throw new BadRequestException('無法更新此盤點');
        }

        const items: AuditItem[] = JSON.parse(audit.items || '[]');
        const item = items.find(i => i.itemId === itemId);
        if (item) {
            item.actualQty = actualQty;
            item.difference = actualQty - item.systemQty;
            if (notes) item.notes = notes;
        }

        audit.items = JSON.stringify(items);
        await this.auditRepo.save(audit);
        return audit;
    }

    // 掃描資產
    async scanAsset(id: string, assetId: string): Promise<InventoryAudit> {
        const audit = await this.findById(id);
        if (audit.type !== 'asset' || audit.status !== 'in_progress') {
            throw new BadRequestException('無法更新此盤點');
        }

        const assets: AuditAsset[] = JSON.parse(audit.assets || '[]');
        const asset = assets.find(a => a.assetId === assetId);
        if (asset) {
            asset.scanned = true;
        }

        audit.assets = JSON.stringify(assets);
        await this.auditRepo.save(audit);
        return audit;
    }

    // 標記資產遺失
    async markAssetMissing(id: string, assetId: string, note: string): Promise<InventoryAudit> {
        const audit = await this.findById(id);
        if (audit.type !== 'asset' || audit.status !== 'in_progress') {
            throw new BadRequestException('無法更新此盤點');
        }

        const assets: AuditAsset[] = JSON.parse(audit.assets || '[]');
        const asset = assets.find(a => a.assetId === assetId);
        if (asset) {
            asset.scanned = false;
            asset.missingNote = note;
        }

        audit.assets = JSON.stringify(assets);
        await this.auditRepo.save(audit);
        return audit;
    }

    // 完成盤點
    async complete(id: string, reviewerName: string, reviewerId?: string, applyDifference = false): Promise<InventoryAudit> {
        const audit = await this.findById(id);
        if (audit.status !== 'in_progress') {
            throw new BadRequestException('盤點不在進行中');
        }

        // 計算差異
        let gainCount = 0;
        let lossCount = 0;

        if (audit.type === 'consumable') {
            const items: AuditItem[] = JSON.parse(audit.items || '[]');
            for (const item of items) {
                if (item.difference > 0) gainCount++;
                if (item.difference < 0) lossCount++;

                // 套用差異
                if (applyDifference && item.difference !== 0) {
                    await this.resourcesService.recordTransaction({
                        resourceId: item.itemId,
                        type: 'adjust',
                        quantity: item.actualQty,
                        operatorName: reviewerName,
                        notes: `盤點調整: ${item.systemQty} → ${item.actualQty}`,
                    });
                }
            }
        } else {
            const assets: AuditAsset[] = JSON.parse(audit.assets || '[]');
            for (const asset of assets) {
                if (!asset.scanned && asset.missingNote) {
                    lossCount++;
                    // 標記資產遺失
                    if (applyDifference) {
                        await this.assetRepo.update(asset.assetId, { status: 'lost', internalNote: asset.missingNote });
                    }
                }
            }
        }

        audit.status = 'completed';
        audit.reviewerName = reviewerName;
        audit.reviewerId = reviewerId;
        audit.gainCount = gainCount;
        audit.lossCount = lossCount;
        audit.completedAt = new Date();
        await this.auditRepo.save(audit);

        this.logger.log(`✅ Audit completed: ${id}, +${gainCount}/-${lossCount}`);
        return audit;
    }

    // 取消盤點
    async cancel(id: string): Promise<InventoryAudit> {
        const audit = await this.findById(id);
        if (audit.status !== 'in_progress') {
            throw new BadRequestException('只能取消進行中的盤點');
        }
        audit.status = 'cancelled';
        await this.auditRepo.save(audit);
        this.logger.log(`🚫 Audit cancelled: ${id}`);
        return audit;
    }

    // 解析 items/assets
    parseItems(audit: InventoryAudit): AuditItem[] {
        try {
            return JSON.parse(audit.items || '[]');
        } catch {
            return [];
        }
    }

    parseAssets(audit: InventoryAudit): AuditAsset[] {
        try {
            return JSON.parse(audit.assets || '[]');
        } catch {
            return [];
        }
    }
}
