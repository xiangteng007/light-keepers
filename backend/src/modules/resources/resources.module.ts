import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from './resources.entity';
import { ResourceTransaction } from './resource-transaction.entity';
import { DonationSource } from './donation-source.entity';
import { ResourceBatch } from './resource-batch.entity';
import { Warehouse } from './warehouse.entity';
import { StorageLocation } from './storage-location.entity';
import { Asset } from './asset.entity';
import { AssetTransaction } from './asset-transaction.entity';
import { DispatchOrder } from './dispatch-order.entity';
import { InventoryAudit } from './inventory-audit.entity';
// 📋 Phase 1: 新增實體
import { Lot } from './lot.entity';
import { SensitiveReadLog } from './sensitive-read-log.entity';
import { LabelPrintLog } from './label-print-log.entity';
import { LabelTemplate } from './label-template.entity';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { WarehousesController } from './warehouses.controller';
import { WarehousesService } from './warehouses.service';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
// 📋 Phase 2: 核心服務
import { QrCodeService } from './qr-code.service';
import { AuditLogService } from './audit-log.service';
import { SensitiveController } from './sensitive.controller';
import { SensitiveService } from './sensitive.service';
// 📋 Phase 3: QR/貼紙系統
import { LabelTemplatesController } from './label-templates.controller';
import { LabelTemplatesService } from './label-templates.service';
import { LotsService } from './lots.service';
import { LabelPrintController } from './label-print.controller';
import { LabelPrintService } from './label-print.service';
// 📋 Phase 4: 覆核系統
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Resource,
            ResourceTransaction,  // 📊 異動紀錄
            DonationSource,       // 🎁 捐贈來源
            ResourceBatch,        // 📦 批次管理
            Warehouse,            // 🏭 倉庫/據點
            StorageLocation,      // 📍 儲位
            Asset,                // 🔧 資產/器材
            AssetTransaction,     // 📋 資產借出歸還紀錄
            DispatchOrder,        // 🚚 調度單
            InventoryAudit,       // 📊 盤點作業
            // 📋 Phase 1: 新增實體
            Lot,                  // 🏷️ 批次（controlled/medical）
            SensitiveReadLog,     // 🔐 敏感資料讀取稽核
            LabelPrintLog,        // 🖨️ 貼紙列印稽核
            LabelTemplate,        // 📄 貼紙模板
        ]),
    ],
    controllers: [
        ResourcesController,
        WarehousesController,
        AssetsController,
        DispatchController,
        AuditController,
        SensitiveController,      // 📋 Phase 2: 敏感資料讀取 API
        LabelTemplatesController, // 📋 Phase 3: 貼紙模板管理
        LabelPrintController,     // 📋 Phase 3: 貼紙列印 API
        ApprovalController,       // 📋 Phase 4: 覆核管理 API
    ],
    providers: [
        ResourcesService,
        WarehousesService,
        AssetsService,
        DispatchService,
        AuditService,
        // 📋 Phase 2: 核心服務
        QrCodeService,
        AuditLogService,
        SensitiveService,
        // 📋 Phase 3: QR/貼紙系統
        LabelTemplatesService,
        LotsService,
        LabelPrintService,
        // 📋 Phase 4: 覆核系統
        ApprovalService,
    ],
    exports: [ResourcesService, WarehousesService, AssetsService, DispatchService, AuditService, QrCodeService, AuditLogService, SensitiveService, LabelTemplatesService, LotsService, LabelPrintService, ApprovalService],
})
export class ResourcesModule { }
