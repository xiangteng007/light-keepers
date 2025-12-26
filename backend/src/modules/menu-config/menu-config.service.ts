import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuConfig } from './menu-config.entity';

export interface MenuConfigItem {
    id: string;
    label: string;
    order: number;
}

@Injectable()
export class MenuConfigService {
    constructor(
        @InjectRepository(MenuConfig)
        private menuConfigRepository: Repository<MenuConfig>,
    ) { }

    async getAll(): Promise<MenuConfig[]> {
        return this.menuConfigRepository.find({
            order: { order: 'ASC' },
        });
    }

    async updateAll(items: MenuConfigItem[]): Promise<MenuConfig[]> {
        // Use upsert to insert or update each item
        const entities = items.map((item, index) => ({
            id: item.id,
            label: item.label,
            order: item.order ?? index,
        }));

        await this.menuConfigRepository.upsert(entities, ['id']);

        return this.getAll();
    }

    async getById(id: string): Promise<MenuConfig | null> {
        return this.menuConfigRepository.findOne({ where: { id } });
    }
}
