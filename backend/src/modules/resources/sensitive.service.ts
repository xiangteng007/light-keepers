import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource } from './resources.entity';
import { ResourceTransaction } from './resource-transaction.entity';
import { AssetTransaction } from './asset-transaction.entity';
import { AuditLogService } from './audit-log.service';
import { AuditTargetType } from './sensitive-read-log.entity';

/**
 * 敏感資料服務
 * 處理敏感資料讀取權限檢查與稽核
 */
@Injectable()
export class SensitiveService {
    constructor(
        @InjectRepository(Resource)
        private readonly resourceRepo: Repository<Resource>,

        @InjectRepository(ResourceTransaction)
        private readonly resourceTxRepo: Repository<ResourceTransaction>,

        @InjectRepository(AssetTransaction)
        private readonly assetTxRepo: Repository<AssetTransaction>,

        private readonly auditLogService: AuditLogService,
    ) { }

    /**
     * 讀取敏感資料（核心方法）
     * 1. 檢查權限
     * 2. 讀取敏感資料
     * 3. 寫入稽核日誌
     * 4. 回傳資料
     */
    async readSensitiveData(params: {
        actorUid: string;
        actorRole: string;
        targetType: AuditTargetType;
        targetId: string;
        fieldsAccessed: string[];
        uiContext: string;
        reasonCode?: string;
        reasonText?: string;
        ip?: string;
        deviceInfo?: Record<string, any>;
    }): Promise<{ data: any; auditLogId: string }> {
        const { actorUid, actorRole, targetType, targetId, fieldsAccessed } = params;

        try {
            // 1. 檢查權限
            await this.checkPermission(actorRole, targetType, targetId, fieldsAccessed);

            // 2. 讀取敏感資料
            const sensitiveData = await this.fetchSensitiveData(targetType, targetId, fieldsAccessed);

            // 3. 寫入稽核日誌（成功）
            const auditLogId = await this.auditLogService.logSensitiveRead({
                ...params,
                result: 'success',
            });

            // 4. 回傳資料
            return {
                data: sensitiveData,
                auditLogId,
            };
        } catch (error) {
            // 寫入稽核日誌（失敗）
            await this.auditLogService.logSensitiveRead({
                ...params,
                result: 'denied',
            });

            throw error;
        }
    }

    /**
     * 檢查讀取權限
     * @private
     */
    private async checkPermission(
        actorRole: string,
        targetType: AuditTargetType,
        targetId: string,
        fieldsAccessed: string[],
    ): Promise<void> {
        // 幹部：全可見
        if (actorRole === '幹部' || actorRole === 'admin') {
            return;
        }

        // 倉管：僅高單價資產的借用人資訊可見
        if (actorRole === '倉管' || actorRole === 'warehouse') {
            if (targetType === 'asset_transaction') {
                const assetTx = await this.assetTxRepo.findOne({
                    where: { id: targetId },
                    relations: ['asset'],
                });

                if (!assetTx) {
                    throw new NotFoundException('資產交易不存在');
                }

                // TODO: 檢查資產是否為高單價（從 system_settings 讀取門檻）
                const highValueThreshold = 50000;
                // @ts-ignore - asset.acquisitionValue 待實作
                if (assetTx.asset?.acquisitionValue && assetTx.asset.acquisitionValue > highValueThreshold) {
                    // 僅允許讀取 borrowerName, borrowerPhone, borrowerOrg
                    const allowedFields = ['borrowerName', 'borrowerPhone', 'borrowerOrg'];
                    const forbidden = fieldsAccessed.filter(f => !allowedFields.includes(f));
                    if (forbidden.length > 0) {
                        throw new ForbiddenException(`倉管不可讀取欄位：${forbidden.join(', ')}`);
                    }
                    return;
                }
            }
            throw new ForbiddenException('倉管僅可查看高單價資產的借用人資訊');
        }

        // 調度：需幹部開啟權限（從 system_settings 檢查）
        if (actorRole === '調度' || actorRole === 'dispatcher') {
            // TODO: 從 system_settings 檢查 dispatchCanReadSensitive
            const dispatchCanReadSensitive = false; // 預設不可
            if (dispatchCanReadSensitive && targetType === 'transaction') {
                return;
            }
            throw new ForbiddenException('調度無權限讀取敏感資訊（需幹部開啟權限）');
        }

        // 其他角色：無權限
        throw new ForbiddenException('權限不足');
    }

    /**
     * 實際讀取敏感資料
     * @private
     */
    private async fetchSensitiveData(
        targetType: AuditTargetType,
        targetId: string,
        fieldsAccessed: string[],
    ): Promise<Record<string, any>> {
        switch (targetType) {
            case 'transaction':
                return this.fetchTransactionSensitive(targetId, fieldsAccessed);

            case 'asset_transaction':
                return this.fetchAssetTransactionSensitive(targetId, fieldsAccessed);

            case 'donor':
                return this.fetchDonorSensitive(targetId, fieldsAccessed);

            default:
                throw new NotFoundException('不支援的目標類型');
        }
    }

    /**
     * 讀取出庫交易敏感資料
     * @private
     */
    private async fetchTransactionSensitive(
        txId: string,
        fieldsAccessed: string[],
    ): Promise<Record<string, any>> {
        // TODO: 未來改為讀取 resource_transactions_sensitive 表
        // 目前從 ResourceTransaction 讀取（Phase 1 暫時方案）
        const tx = await this.resourceTxRepo.findOne({ where: { id: txId } });

        if (!tx) {
            throw new NotFoundException('交易不存在');
        }

        const sensitiveData: Record<string, any> = {};

        // 根據 fieldsAccessed 回傳對應欄位
        // @ts-ignore - 敏感欄位待實作
        if (fieldsAccessed.includes('recipientName')) sensitiveData.recipientName = tx.recipientName;
        // @ts-ignore
        if (fieldsAccessed.includes('recipientPhone')) sensitiveData.recipientPhone = tx.recipientPhone;
        // @ts-ignore
        if (fieldsAccessed.includes('recipientIdNo')) sensitiveData.recipientIdNo = tx.recipientIdNo;
        // @ts-ignore
        if (fieldsAccessed.includes('recipientOrg')) sensitiveData.recipientOrg = tx.recipientOrg;

        return sensitiveData;
    }

    /**
     * 讀取資產交易敏感資料
     * @private
     */
    private async fetchAssetTransactionSensitive(
        txId: string,
        fieldsAccessed: string[],
    ): Promise<Record<string, any>> {
        // TODO: 未來改為讀取 asset_transactions_sensitive 表
        const tx = await this.assetTxRepo.findOne({ where: { id: txId } });

        if (!tx) {
            throw new NotFoundException('資產交易不存在');
        }

        const sensitiveData: Record<string, any> = {};

        // @ts-ignore
        if (fieldsAccessed.includes('borrowerName')) sensitiveData.borrowerName = tx.borrowerName;
        // @ts-ignore
        if (fieldsAccessed.includes('borrowerPhone')) sensitiveData.borrowerPhone = tx.borrowerPhone;
        // @ts-ignore
        if (fieldsAccessed.includes('borrowerIdNo')) sensitiveData.borrowerIdNo = tx.borrowerIdNo;
        // @ts-ignore
        if (fieldsAccessed.includes('borrowerOrg')) sensitiveData.borrowerOrg = tx.borrowerOrg;

        return sensitiveData;
    }

    /**
     * 讀取捐贈者敏感資料
     * @private
     */
    private async fetchDonorSensitive(
        donorId: string,
        fieldsAccessed: string[],
    ): Promise<Record<string, any>> {
        // TODO: 從 DonationSource 讀取
        return {};
    }

    /**
     * 查詢稽核日誌（代理到 AuditLogService）
     */
    async queryAuditLogs(filters: any) {
        return this.auditLogService.querySensitiveReadLogs(filters);
    }

    /**
     * 查詢特定目標的讀取日誌
     */
    async getReadLogsByTarget(targetType: AuditTargetType, targetId: string) {
        return this.auditLogService.getReadLogsByTarget(targetType, targetId);
    }
}
