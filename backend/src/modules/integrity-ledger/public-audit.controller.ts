/**
 * 公開責信查詢 Controller
 * 模組 D: 無需登入的物資流向查詢
 */

import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IntegrityLedgerService } from './ledger.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicAuditLog } from './entities/supply-chain-block.entity';
import { Request } from 'express';

@ApiTags('transparency')
@Controller('api/public/transparency')
export class PublicAuditController {
    constructor(
        private readonly ledgerService: IntegrityLedgerService,
        @InjectRepository(PublicAuditLog)
        private auditLogRepository: Repository<PublicAuditLog>,
    ) { }

    @Get('search')
    @ApiOperation({ summary: '透過收據編號查詢物資流向' })
    @ApiResponse({ status: 200, description: '成功取得物資履歷' })
    async searchByReceipt(
        @Query('receipt') receiptNumber: string,
        @Req() req: Request,
    ) {
        // 記錄查詢
        await this.auditLogRepository.save({
            receiptNumber,
            queryIp: req.ip,
            userAgent: req.headers['user-agent'],
        });

        const blocks = await this.ledgerService.getByReceiptNumber(receiptNumber);

        if (blocks.length === 0) {
            return {
                success: false,
                message: '查無此收據編號',
            };
        }

        // 組裝時間線
        const timeline = blocks.map(block => ({
            time: block.timestamp,
            action: this.translateAction(block.action),
            location: block.metadata?.targetLocation || block.metadata?.sourceLocation,
            actor: block.actorName,
            quantity: block.metadata?.quantity,
            unit: block.metadata?.unit,
            verified: block.isValid,
        }));

        // 最終位置
        const lastBlock = blocks[blocks.length - 1];
        const finalDestination = lastBlock.metadata?.targetLocation;

        return {
            success: true,
            data: {
                receiptNumber,
                resourceName: blocks[0].resourceName,
                totalSteps: blocks.length,
                timeline,
                finalDestination,
                chainVerified: blocks.every(b => b.isValid),
                lastUpdate: lastBlock.timestamp,
            },
        };
    }

    @Get('resource/:resourceId')
    @ApiOperation({ summary: '取得資源完整履歷' })
    async getResourceHistory(@Param('resourceId') resourceId: string) {
        const history = await this.ledgerService.getResourceHistory(resourceId);

        if (!history) {
            return {
                success: false,
                message: '查無此資源紀錄',
            };
        }

        return {
            success: true,
            data: history,
        };
    }

    @Get('validate/:resourceId')
    @ApiOperation({ summary: '驗證資源區塊鏈完整性' })
    async validateChain(@Param('resourceId') resourceId: string) {
        const result = await this.ledgerService.validateChain(resourceId);

        return {
            success: true,
            data: {
                ...result,
                message: result.isValid
                    ? '✅ 區塊鏈完整性驗證通過'
                    : '⚠️ 發現不一致的區塊',
            },
        };
    }

    @Get('stats')
    @ApiOperation({ summary: '取得責信系統統計' })
    async getStats() {
        const stats = await this.ledgerService.getStats();

        return {
            success: true,
            data: stats,
        };
    }

    @Get('recent')
    @ApiOperation({ summary: '取得最近的物資異動' })
    async getRecentActivity(@Query('limit') limit?: string) {
        const blocks = await this.ledgerService.getRecentBlocks(
            parseInt(limit || '20')
        );

        return {
            success: true,
            data: blocks.map(block => ({
                id: block.id,
                time: block.timestamp,
                resourceName: block.resourceName,
                action: this.translateAction(block.action),
                actor: block.actorName,
                location: block.metadata?.targetLocation,
                verified: block.isValid,
            })),
        };
    }

    private translateAction(action: string): string {
        const translations: Record<string, string> = {
            DONATION_IN: '捐贈入庫',
            PURCHASE_IN: '採購入庫',
            WAREHOUSE_OUT: '倉庫出庫',
            DISTRIBUTION: '發放給災民',
            TRANSFER: '據點調撥',
            EXPIRED: '過期報廢',
            DAMAGED: '損壞報廢',
        };
        return translations[action] || action;
    }
}
