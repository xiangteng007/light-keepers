import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DispatchOrder, DispatchStatus, DispatchPriority } from './dispatch-order.entity';
import { Resource } from './resources.entity';
import { ResourcesService } from './resources.service';

interface DispatchItem {
    itemId: string;
    itemName: string;
    quantity: number;
    pickedQuantity?: number;
}

export interface CreateDispatchDto {
    destination: string;
    contactName?: string;
    contactPhone?: string;
    items: DispatchItem[];
    priority?: DispatchPriority;
    notes?: string;
    requesterName: string;
    requesterId?: string;
    sourceWarehouseId?: string;
}

@Injectable()
export class DispatchService {
    private readonly logger = new Logger(DispatchService.name);

    constructor(
        @InjectRepository(DispatchOrder)
        private dispatchRepo: Repository<DispatchOrder>,
        @InjectRepository(Resource)
        private resourceRepo: Repository<Resource>,
        private resourcesService: ResourcesService,
    ) { }

    // 產生訂單編號
    private generateOrderNo(): string {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `DSP-${dateStr}-${random}`;
    }

    // 建立調度單
    async create(dto: CreateDispatchDto): Promise<DispatchOrder> {
        const order = this.dispatchRepo.create({
            orderNo: this.generateOrderNo(),
            status: 'pending',
            priority: dto.priority || 'normal',
            destination: dto.destination,
            contactName: dto.contactName,
            contactPhone: dto.contactPhone,
            items: JSON.stringify(dto.items),
            requesterName: dto.requesterName,
            requesterId: dto.requesterId,
            sourceWarehouseId: dto.sourceWarehouseId,
            notes: dto.notes,
        });
        const saved = await this.dispatchRepo.save(order);
        this.logger.log(`📋 Created dispatch order: ${saved.orderNo}`);
        return saved;
    }

    // 取得所有調度單
    async findAll(status?: DispatchStatus): Promise<DispatchOrder[]> {
        const where = status ? { status } : {};
        return this.dispatchRepo.find({
            where,
            order: { createdAt: 'DESC' },
            take: 100,
        });
    }

    // 取得單筆調度單
    async findById(id: string): Promise<DispatchOrder> {
        const order = await this.dispatchRepo.findOne({ where: { id } });
        if (!order) throw new NotFoundException(`Dispatch order ${id} not found`);
        return order;
    }

    // 審核通過
    async approve(id: string, approverName: string, approverId?: string): Promise<DispatchOrder> {
        const order = await this.findById(id);
        if (order.status !== 'pending') {
            throw new BadRequestException('只能審核待審核的調度單');
        }
        order.status = 'approved';
        order.approverName = approverName;
        order.approverId = approverId;
        order.approvedAt = new Date();
        await this.dispatchRepo.save(order);
        this.logger.log(`✅ Approved dispatch order: ${order.orderNo}`);
        return order;
    }

    // 駁回
    async reject(id: string, reason: string, approverName: string): Promise<DispatchOrder> {
        const order = await this.findById(id);
        if (order.status !== 'pending') {
            throw new BadRequestException('只能駁回待審核的調度單');
        }
        order.status = 'rejected';
        order.rejectReason = reason;
        order.approverName = approverName;
        await this.dispatchRepo.save(order);
        this.logger.log(`❌ Rejected dispatch order: ${order.orderNo}`);
        return order;
    }

    // 開始配貨
    async startPicking(id: string, pickerName: string, pickerId?: string): Promise<DispatchOrder> {
        const order = await this.findById(id);
        if (order.status !== 'approved') {
            throw new BadRequestException('只能對已審核的調度單進行配貨');
        }
        order.status = 'picking';
        order.pickerName = pickerName;
        order.pickerId = pickerId;
        await this.dispatchRepo.save(order);
        this.logger.log(`📦 Started picking: ${order.orderNo}`);
        return order;
    }

    // 完成配貨 (扣庫存)
    async completePicking(id: string, pickedItems: DispatchItem[], operatorName: string): Promise<DispatchOrder> {
        const order = await this.findById(id);
        if (order.status !== 'picking') {
            throw new BadRequestException('調度單不在配貨中狀態');
        }

        // 扣除庫存
        for (const item of pickedItems) {
            if (item.pickedQuantity && item.pickedQuantity > 0) {
                await this.resourcesService.deductStock(
                    item.itemId,
                    item.pickedQuantity,
                    operatorName,
                    `調度出庫: ${order.orderNo}`
                );
            }
        }

        order.status = 'delivering';
        order.items = JSON.stringify(pickedItems);
        order.pickedAt = new Date();
        await this.dispatchRepo.save(order);
        this.logger.log(`📤 Picking completed: ${order.orderNo}`);
        return order;
    }

    // 完成送達
    async complete(id: string): Promise<DispatchOrder> {
        const order = await this.findById(id);
        if (order.status !== 'delivering') {
            throw new BadRequestException('調度單不在配送中狀態');
        }
        order.status = 'completed';
        order.deliveredAt = new Date();
        await this.dispatchRepo.save(order);
        this.logger.log(`🎉 Dispatch completed: ${order.orderNo}`);
        return order;
    }

    // 取消
    async cancel(id: string, reason: string): Promise<DispatchOrder> {
        const order = await this.findById(id);
        if (['completed', 'cancelled'].includes(order.status)) {
            throw new BadRequestException('無法取消已完成或已取消的調度單');
        }
        order.status = 'cancelled';
        order.rejectReason = reason;
        await this.dispatchRepo.save(order);
        this.logger.log(`🚫 Cancelled dispatch order: ${order.orderNo}`);
        return order;
    }

    // 統計
    async getStats(): Promise<{
        pending: number;
        inProgress: number;
        completed: number;
    }> {
        const all = await this.dispatchRepo.find();
        return {
            pending: all.filter(o => o.status === 'pending').length,
            inProgress: all.filter(o => ['approved', 'picking', 'delivering'].includes(o.status)).length,
            completed: all.filter(o => o.status === 'completed').length,
        };
    }

    // 解析 items JSON
    parseItems(order: DispatchOrder): DispatchItem[] {
        try {
            return JSON.parse(order.items || '[]');
        } catch {
            return [];
        }
    }
}
