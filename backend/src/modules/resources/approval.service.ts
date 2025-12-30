import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceTransaction } from './resource-transaction.entity';
import { Resource } from './resources.entity';

/**
 * 覆核服務 (Phase 4)
 * 處理 controlled/medical 品項的出庫覆核
 */
@Injectable()
export class ApprovalService {
    constructor(
        @InjectRepository(ResourceTransaction)
        private readonly transactionRepo: Repository<ResourceTransaction>,

        @InjectRepository(Resource)
        private readonly resourceRepo: Repository<Resource>,
    ) { }

    /**
     * 查詢待覆核出庫單
     */
    async getPendingApprovals(filters?: {
        controlLevel?: 'controlled' | 'medical';
        limit?: number;
        offset?: number;
    }): Promise<{ transactions: ResourceTransaction[]; total: number }> {
        const query = this.transactionRepo.createQueryBuilder('tx')
            .leftJoinAndSelect('tx.resource', 'resource')
            .where('tx.type = :type', { type: 'out' })
            .andWhere('tx.approvalStatus = :status', { status: 'pending' });

        if (filters?.controlLevel) {
            query.andWhere('resource.controlLevel = :controlLevel', {
                controlLevel: filters.controlLevel,
            });
        }

        query.orderBy('tx.createdAt', 'ASC');

        if (filters?.limit) {
            query.take(filters.limit);
        }
        if (filters?.offset) {
            query.skip(filters.offset);
        }

        const [transactions, total] = await query.getManyAndCount();
        return { transactions, total };
    }

    /**
     * 覆核通過
     */
    async approve(params: {
        transactionId: string;
        approverUid: string;
        approverName: string;
    }): Promise<ResourceTransaction> {
        const transaction = await this.transactionRepo.findOne({
            where: { id: params.transactionId },
            relations: ['resource'],
        });

        if (!transaction) {
            throw new NotFoundException('交易不存在');
        }

        if (transaction.approvalStatus !== 'pending') {
            throw new BadRequestException(`此單據已${transaction.approvalStatus === 'approved' ? '通過' : '拒絕'}覆核`);
        }

        // 檢查庫存是否足夠（覆核時才真正扣庫存）
        if (transaction.resource.quantity < transaction.quantity) {
            throw new BadRequestException(
                `當前庫存不足（可用：${transaction.resource.quantity}，需求：${transaction.quantity}）`
            );
        }

        // 更新交易狀態
        transaction.approvalStatus = 'approved';
        transaction.approvedBy = params.approverUid;
        transaction.approvedByName = params.approverName;
        transaction.approvedAt = new Date();

        // 真正扣除庫存
        transaction.resource.quantity -= transaction.quantity;
        transaction.afterQuantity = transaction.resource.quantity;

        // 儲存
        await this.resourceRepo.save(transaction.resource);
        return this.transactionRepo.save(transaction);
    }

    /**
     * 覆核拒絕
     */
    async reject(params: {
        transactionId: string;
        approverUid: string;
        approverName: string;
        rejectReason: string;
    }): Promise<ResourceTransaction> {
        if (!params.rejectReason || params.rejectReason.length < 5) {
            throw new BadRequestException('拒絕原因必須至少 5 個字');
        }

        const transaction = await this.transactionRepo.findOne({
            where: { id: params.transactionId },
        });

        if (!transaction) {
            throw new NotFoundException('交易不存在');
        }

        if (transaction.approvalStatus !== 'pending') {
            throw new BadRequestException(`此單據已${transaction.approvalStatus === 'approved' ? '通過' : '拒絕'}覆核`);
        }

        // 更新交易狀態
        transaction.approvalStatus = 'rejected';
        transaction.approvedBy = params.approverUid;
        transaction.approvedByName = params.approverName;
        transaction.approvedAt = new Date();
        transaction.rejectReason = params.rejectReason;

        return this.transactionRepo.save(transaction);
    }

    /**
     * 查詢單據詳情（含覆核狀態）
     */
    async getTransactionDetail(transactionId: string): Promise<ResourceTransaction> {
        const transaction = await this.transactionRepo.findOne({
            where: { id: transactionId },
            relations: ['resource'],
        });

        if (!transaction) {
            throw new NotFoundException('交易不存在');
        }

        return transaction;
    }
}
