/**
 * 責信區塊鏈模組 (Integrity Ledger Module)
 * 模組 D: NestJS 模組註冊
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplyChainBlock, PublicAuditLog } from './entities/supply-chain-block.entity';
import { IntegrityLedgerService } from './ledger.service';
import { OfflineHashChainService } from './offline-hash-chain.service';
import { PublicAuditController } from './public-audit.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([SupplyChainBlock, PublicAuditLog]),
    ],
    controllers: [PublicAuditController],
    providers: [IntegrityLedgerService, OfflineHashChainService],
    exports: [IntegrityLedgerService, OfflineHashChainService],
})
export class IntegrityLedgerModule { }

