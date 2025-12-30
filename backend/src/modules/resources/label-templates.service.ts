import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LabelTemplate } from './label-template.entity';

/**
 * 貼紙模板服務
 * 管理貼紙模板的 CRUD（僅幹部可編輯）
 */
@Injectable()
export class LabelTemplatesService {
    constructor(
        @InjectRepository(LabelTemplate)
        private readonly templateRepo: Repository<LabelTemplate>,
    ) { }

    /**
     * 創建貼紙模板（幹部專用）
     */
    async create(data: {
        name: string;
        description?: string;
        targetTypes: string[];
        controlLevels: string[];
        width: number;
        height: number;
        layoutConfig: Record<string, any>;
        createdBy: string;
    }): Promise<LabelTemplate> {
        const template = this.templateRepo.create(data);
        return this.templateRepo.save(template);
    }

    /**
     * 查詢所有模板
     */
    async findAll(filters?: {
        isActive?: boolean;
        targetType?: string;
        controlLevel?: string;
    }): Promise<LabelTemplate[]> {
        const query = this.templateRepo.createQueryBuilder('template');

        if (filters?.isActive !== undefined) {
            query.andWhere('template.isActive = :isActive', { isActive: filters.isActive });
        }

        if (filters?.targetType) {
            query.andWhere('JSON_CONTAINS(template.targetTypes, :targetType)', {
                targetType: JSON.stringify([filters.targetType]),
            });
        }

        if (filters?.controlLevel) {
            query.andWhere('JSON_CONTAINS(template.controlLevels, :controlLevel)', {
                controlLevel: JSON.stringify([filters.controlLevel]),
            });
        }

        query.orderBy('template.createdAt', 'DESC');
        return query.getMany();
    }

    /**
     * 查詢單一模板
     */
    async findOne(id: string): Promise<LabelTemplate> {
        const template = await this.templateRepo.findOne({ where: { id } });
        if (!template) {
            throw new NotFoundException('貼紙模板不存在');
        }
        return template;
    }

    /**
     * 更新模板（幹部專用）
     */
    async update(id: string, data: Partial<LabelTemplate>): Promise<LabelTemplate> {
        const template = await this.findOne(id);
        Object.assign(template, data);
        return this.templateRepo.save(template);
    }

    /**
     * 啟用/停用模板
     */
    async setActive(id: string, isActive: boolean): Promise<LabelTemplate> {
        const template = await this.findOne(id);
        template.isActive = isActive;
        return this.templateRepo.save(template);
    }

    /**
     * 刪除模板（軟刪除）
     */
    async delete(id: string): Promise<void> {
        await this.setActive(id, false);
    }

    /**
     * 取得適用的模板（依類型與管控等級）
     */
    async getApplicableTemplates(params: {
        targetType: 'lot' | 'asset' | 'bin';
        controlLevel: 'controlled' | 'medical' | 'asset';
    }): Promise<LabelTemplate[]> {
        return this.findAll({
            isActive: true,
            targetType: params.targetType,
            controlLevel: params.controlLevel,
        });
    }

    /**
     * 初始化預設模板（系統安裝時）
     */
    async seedDefaultTemplates(adminUid: string): Promise<void> {
        const existing = await this.templateRepo.count();
        if (existing > 0) {
            return; // 已有模板，跳過
        }

        // 預設模板 1: 40x30mm 藥品標籤
        await this.create({
            name: '40x30mm 藥品標籤',
            description: '適用於 controlled/medical 品項',
            targetTypes: ['lot'],
            controlLevels: ['controlled', 'medical'],
            width: 40,
            height: 30,
            layoutConfig: {
                qr: { x: 2, y: 2, size: 26 },
                title: { x: 30, y: 2, fontSize: 10, fontWeight: 'bold' },
                lotNumber: { x: 30, y: 12, fontSize: 8 },
                expiryDate: { x: 30, y: 20, fontSize: 8 },
            },
            createdBy: adminUid,
        });

        // 預設模板 2: 60x40mm 資產標籤
        await this.create({
            name: '60x40mm 資產標籤',
            description: '適用於資產/器材',
            targetTypes: ['asset'],
            controlLevels: ['asset'],
            width: 60,
            height: 40,
            layoutConfig: {
                qr: { x: 2, y: 2, size: 36 },
                assetNo: { x: 40, y: 2, fontSize: 12, fontWeight: 'bold' },
                itemName: { x: 40, y: 14, fontSize: 10 },
                warehouse: { x: 40, y: 26, fontSize: 8 },
            },
            createdBy: adminUid,
        });
    }
}
