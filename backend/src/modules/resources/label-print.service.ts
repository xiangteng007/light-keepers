import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lot } from './lot.entity';
import { Asset } from './asset.entity';
import { Resource } from './resources.entity';
import { LabelTemplate } from './label-template.entity';
import { AuditLogService } from './audit-log.service';

/**
 * 貼紙列印服務
 * 負責產生貼紙資料、記錄列印、作廢/重印
 */
@Injectable()
export class LabelPrintService {
    constructor(
        @InjectRepository(Lot)
        private readonly lotRepo: Repository<Lot>,

        @InjectRepository(Asset)
        private readonly assetRepo: Repository<Asset>,

        @InjectRepository(Resource)
        private readonly resourceRepo: Repository<Resource>,

        @InjectRepository(LabelTemplate)
        private readonly templateRepo: Repository<LabelTemplate>,

        private readonly auditLogService: AuditLogService,
    ) { }

    /**
     * 產生貼紙資料（批次）
     */
    async generateLabelData(params: {
        lotId: string;
        templateId: string;
        actorUid: string;
        actorRole: string;
    }): Promise<{
        labelData: any;
        printBatchId: string;
    }> {
        const lot = await this.lotRepo.findOne({
            where: { id: params.lotId },
            relations: ['item'],
        });

        if (!lot) {
            throw new BadRequestException('批次不存在');
        }

        // 檢查是否為 civil（防呆）
        if (lot.item.controlLevel === 'civil') {
            throw new BadRequestException('民生物品不可產生系統 QR/貼紙');
        }

        const template = await this.templateRepo.findOne({
            where: { id: params.templateId },
        });

        if (!template) {
            throw new BadRequestException('貼紙模板不存在');
        }

        // 檢查模板是否適用
        if (!template.targetTypes.includes('lot')) {
            throw new BadRequestException('此模板不適用於批次');
        }

        if (!template.controlLevels.includes(lot.item.controlLevel)) {
            throw new BadRequestException(`此模板不適用於 ${lot.item.controlLevel} 品項`);
        }

        // 記錄列印稽核
        const printBatchId = await this.auditLogService.logLabelPrint({
            actorUid: params.actorUid,
            actorRole: params.actorRole,
            action: 'print',
            targetType: 'lot',
            targetIds: [params.lotId],
            controlLevel: lot.item.controlLevel,
            templateId: params.templateId,
            labelCount: 1,
        });

        // 更新 lot 的列印記錄
        lot.labelsPrinted += 1;
        lot.lastPrintBatchId = printBatchId;
        await this.lotRepo.save(lot);

        // 組裝貼紙資料
        const labelData = {
            template: {
                width: template.width,
                height: template.height,
                layoutConfig: template.layoutConfig,
            },
            data: {
                qrValue: lot.qrValue,
                itemName: lot.item.name,
                lotNumber: lot.lotNumber,
                expiryDate: lot.expiryDate,
                warehouse: lot.warehouseId, // TODO: 關聯查詢倉庫名稱
            },
        };

        return {
            labelData,
            printBatchId,
        };
    }

    /**
     * 批次產生貼紙資料（資產入庫時）
     */
    async batchGenerateLabelData(params: {
        assetIds: string[];
        templateId: string;
        actorUid: string;
        actorRole: string;
    }): Promise<{
        labelsData: any[];
        printBatchId: string;
    }> {
        const assets = await this.assetRepo.find({
            where: params.assetIds.map(id => ({ id })),
            relations: ['item'],
        });

        if (assets.length === 0) {
            throw new BadRequestException('資產不存在');
        }

        // 檢查是否為資產化品項
        for (const asset of assets) {
            if (!asset.item.isAssetized) {
                throw new BadRequestException(`品項 ${asset.item.name} 未資產化`);
            }
        }

        const template = await this.templateRepo.findOne({
            where: { id: params.templateId },
        });

        if (!template || !template.targetTypes.includes('asset')) {
            throw new BadRequestException('貼紙模板不適用於資產');
        }

        // 記錄列印稽核
        const printBatchId = await this.auditLogService.logLabelPrint({
            actorUid: params.actorUid,
            actorRole: params.actorRole,
            action: 'print',
            targetType: 'asset',
            targetIds: params.assetIds,
            controlLevel: 'asset',
            templateId: params.templateId,
            labelCount: assets.length,
        });

        // 更新資產的列印記錄
        for (const asset of assets) {
            asset.labelsPrinted = (asset.labelsPrinted || 0) + 1;
            asset.lastPrintBatchId = printBatchId;
        }
        await this.assetRepo.save(assets);

        // 組裝貼紙資料
        const labelsData = assets.map((asset) => ({
            template: {
                width: template.width,
                height: template.height,
                layoutConfig: template.layoutConfig,
            },
            data: {
                qrValue: asset.qrValue,
                assetNo: asset.assetNo,
                itemName: asset.item.name,
                serialNo: asset.serialNo,
                warehouse: asset.warehouseId, // TODO: 關聯查詢倉庫名稱
            },
        }));

        return {
            labelsData,
            printBatchId,
        };
    }

    /**
     * 重新列印（不作廢原 QR）
     */
    async reprintLabel(params: {
        targetType: 'lot' | 'asset';
        targetId: string;
        templateId: string;
        actorUid: string;
        actorRole: string;
    }): Promise<{ labelData: any; printBatchId: string }> {
        // 記錄重印稽核
        const printBatchId = await this.auditLogService.logLabelPrint({
            actorUid: params.actorUid,
            actorRole: params.actorRole,
            action: 'reprint',
            targetType: params.targetType,
            targetIds: [params.targetId],
            controlLevel: params.targetType === 'lot' ? 'controlled' : 'asset', // TODO: 動態取得
            templateId: params.templateId,
            labelCount: 1,
        });

        // 根據類型產生標籤資料
        if (params.targetType === 'lot') {
            return this.generateLabelData({
                lotId: params.targetId,
                templateId: params.templateId,
                actorUid: params.actorUid,
                actorRole: params.actorRole,
            });
        } else {
            const result = await this.batchGenerateLabelData({
                assetIds: [params.targetId],
                templateId: params.templateId,
                actorUid: params.actorUid,
                actorRole: params.actorRole,
            });
            return {
                labelData: result.labelsData[0],
                printBatchId: result.printBatchId,
            };
        }
    }

    /**
     * 作廢貼紙（記錄作廢原因）
     */
    async revokeLabel(params: {
        targetType: 'lot' | 'asset';
        targetId: string;
        revokeReason: string;
        actorUid: string;
        actorRole: string;
    }): Promise<void> {
        if (!params.revokeReason || params.revokeReason.length < 5) {
            throw new BadRequestException('作廢原因必須至少 5 個字');
        }

        // 記錄作廢稽核
        await this.auditLogService.logLabelPrint({
            actorUid: params.actorUid,
            actorRole: params.actorRole,
            action: 'revoke',
            targetType: params.targetType,
            targetIds: [params.targetId],
            controlLevel: params.targetType === 'lot' ? 'controlled' : 'asset',
            templateId: '00000000-0000-0000-0000-000000000000', // 作廢不需要模板
            labelCount: 0,
            revokeReason: params.revokeReason,
        });

        // TODO: 標記原 QR 為作廢（若需要完整實作）
        // 目前僅記錄稽核，不實際刪除或修改 QR
    }

    /**
     * 查詢列印歷史
     */
    async getPrintHistory(params: {
        targetType: 'lot' | 'asset';
        targetId: string;
    }) {
        return this.auditLogService.queryLabelPrintLogs({
            targetType: params.targetType,
        });
    }
}
