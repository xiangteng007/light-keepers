import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Skill, SkillCategory } from './skill.entity';

export interface CreateSkillDto {
    code: string;
    name: string;
    category: SkillCategory;
    description?: string;
    sortOrder?: number;
}

export interface UpdateSkillDto {
    name?: string;
    category?: SkillCategory;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
}

@Injectable()
export class SkillService {
    private readonly logger = new Logger(SkillService.name);

    constructor(
        @InjectRepository(Skill)
        private skillRepository: Repository<Skill>,
    ) { }

    // 取得所有專長
    async findAll(activeOnly: boolean = true): Promise<Skill[]> {
        const query: any = {};
        if (activeOnly) {
            query.isActive = true;
        }
        return this.skillRepository.find({
            where: query,
            order: { category: 'ASC', sortOrder: 'ASC' },
        });
    }

    // 依分類取得專長
    async findByCategory(category: SkillCategory): Promise<Skill[]> {
        return this.skillRepository.find({
            where: { category, isActive: true },
            order: { sortOrder: 'ASC' },
        });
    }

    // 取得單一專長
    async findOne(id: string): Promise<Skill> {
        const skill = await this.skillRepository.findOne({ where: { id } });
        if (!skill) {
            throw new NotFoundException(`Skill ${id} not found`);
        }
        return skill;
    }

    // 依代碼查詢
    async findByCode(code: string): Promise<Skill | null> {
        return this.skillRepository.findOne({ where: { code } });
    }

    // 建立專長
    async create(dto: CreateSkillDto): Promise<Skill> {
        const existing = await this.findByCode(dto.code);
        if (existing) {
            throw new Error(`Skill code ${dto.code} already exists`);
        }

        const skill = this.skillRepository.create({
            ...dto,
            isActive: true,
        });
        const saved = await this.skillRepository.save(skill);
        this.logger.log(`Created skill: ${saved.name} (${saved.code})`);
        return saved;
    }

    // 更新專長
    async update(id: string, dto: UpdateSkillDto): Promise<Skill> {
        const skill = await this.findOne(id);
        Object.assign(skill, dto);
        const updated = await this.skillRepository.save(skill);
        this.logger.log(`Updated skill: ${updated.name}`);
        return updated;
    }

    // 停用專長
    async deactivate(id: string): Promise<Skill> {
        return this.update(id, { isActive: false });
    }

    // 啟用專長
    async activate(id: string): Promise<Skill> {
        return this.update(id, { isActive: true });
    }

    // 取得專長分類列表
    getCategories(): { code: SkillCategory; name: string }[] {
        return [
            { code: 'water', name: '水域救援' },
            { code: 'mountain', name: '山域搜救' },
            { code: 'medical', name: '醫護' },
            { code: 'mechanical', name: '機械工程' },
            { code: 'communication', name: '通訊' },
            { code: 'drone', name: '無人機' },
            { code: 'other', name: '其他' },
        ];
    }

    // 初始化預設專長（Seed）
    async seedDefaultSkills(): Promise<void> {
        const defaultSkills: Partial<Skill>[] = [
            { code: 'WATER_RESCUE', name: '水域救援', category: 'water', sortOrder: 1 },
            { code: 'DIVING', name: '潛水', category: 'water', sortOrder: 2 },
            { code: 'BOAT_OPERATION', name: '船艇操作', category: 'water', sortOrder: 3 },
            { code: 'MOUNTAIN_SAR', name: '山域搜救', category: 'mountain', sortOrder: 10 },
            { code: 'ROPE_RESCUE', name: '繩索救援', category: 'mountain', sortOrder: 11 },
            { code: 'EMT', name: 'EMT 緊急醫療', category: 'medical', sortOrder: 20 },
            { code: 'FIRST_AID', name: '急救', category: 'medical', sortOrder: 21 },
            { code: 'CPR_AED', name: 'CPR / AED', category: 'medical', sortOrder: 22 },
            { code: 'DRONE_PILOT', name: '無人機操作', category: 'drone', sortOrder: 50 },
            { code: 'RADIO', name: '無線電通訊', category: 'communication', sortOrder: 40 },
        ];

        for (const skillData of defaultSkills) {
            const existing = await this.findByCode(skillData.code!);
            if (!existing) {
                await this.skillRepository.save(
                    this.skillRepository.create({ ...skillData, isActive: true })
                );
                this.logger.log(`Seeded skill: ${skillData.name}`);
            }
        }
    }
}
