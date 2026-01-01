import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { Announcement, AnnouncementCategory, AnnouncementStatus, AnnouncementPriority } from './announcements.entity';

export interface CreateAnnouncementDto {
    title: string;
    content: string;
    summary?: string;
    category?: AnnouncementCategory;
    priority?: AnnouncementPriority;
    isPinned?: boolean;
    publishAt?: Date;
    expireAt?: Date;
    attachments?: string[];
    coverImage?: string;
    tags?: string[];
    sendNotification?: boolean;
    authorId: string;
    authorName?: string;
}

export interface UpdateAnnouncementDto extends Partial<CreateAnnouncementDto> {
    status?: AnnouncementStatus;
}

export interface AnnouncementFilter {
    category?: AnnouncementCategory;
    status?: AnnouncementStatus;
    priority?: AnnouncementPriority;
    isPinned?: boolean;
    tag?: string;
    limit?: number;
    offset?: number;
}

@Injectable()
export class AnnouncementsService {
    private readonly logger = new Logger(AnnouncementsService.name);

    constructor(
        @InjectRepository(Announcement)
        private readonly announcementRepo: Repository<Announcement>,
    ) { }

    // 創建公告
    async create(dto: CreateAnnouncementDto): Promise<Announcement> {
        const announcement = this.announcementRepo.create({
            ...dto,
            status: 'draft',
        });

        const saved = await this.announcementRepo.save(announcement);
        this.logger.log(`Announcement created: ${saved.id} - ${saved.title}`);
        return saved;
    }

    // 取得公告列表（公開）
    async findPublished(filter: AnnouncementFilter = {}): Promise<Announcement[]> {
        const now = new Date();

        const query = this.announcementRepo.createQueryBuilder('a')
            .where('a.status = :status', { status: 'published' })
            .andWhere('(a.publishAt IS NULL OR a.publishAt <= :now)', { now })
            .andWhere('(a.expireAt IS NULL OR a.expireAt > :now)', { now });

        if (filter.category) {
            query.andWhere('a.category = :category', { category: filter.category });
        }

        if (filter.priority) {
            query.andWhere('a.priority = :priority', { priority: filter.priority });
        }

        if (filter.isPinned !== undefined) {
            query.andWhere('a.isPinned = :isPinned', { isPinned: filter.isPinned });
        }

        if (filter.tag) {
            query.andWhere('a.tags LIKE :tag', { tag: `%${filter.tag}%` });
        }

        // 排序：置頂優先 → 優先級 → 發布時間
        query.orderBy('a.isPinned', 'DESC')
            .addOrderBy('CASE WHEN a.priority = \'urgent\' THEN 0 WHEN a.priority = \'high\' THEN 1 ELSE 2 END', 'ASC')
            .addOrderBy('a.publishedAt', 'DESC');

        if (filter.limit) {
            query.take(filter.limit);
        }

        if (filter.offset) {
            query.skip(filter.offset);
        }

        return query.getMany();
    }

    // 取得所有公告（管理員）
    async findAll(filter: AnnouncementFilter = {}): Promise<Announcement[]> {
        const query = this.announcementRepo.createQueryBuilder('a');

        if (filter.status) {
            query.andWhere('a.status = :status', { status: filter.status });
        }

        if (filter.category) {
            query.andWhere('a.category = :category', { category: filter.category });
        }

        query.orderBy('a.createdAt', 'DESC');

        if (filter.limit) {
            query.take(filter.limit);
        }

        if (filter.offset) {
            query.skip(filter.offset);
        }

        return query.getMany();
    }

    // 取得單一公告
    async findOne(id: string): Promise<Announcement> {
        const announcement = await this.announcementRepo.findOne({
            where: { id },
            relations: ['author'],
        });

        if (!announcement) {
            throw new NotFoundException(`Announcement ${id} not found`);
        }

        return announcement;
    }

    // 更新公告
    async update(id: string, dto: UpdateAnnouncementDto): Promise<Announcement> {
        const announcement = await this.findOne(id);

        Object.assign(announcement, dto);

        const updated = await this.announcementRepo.save(announcement);
        this.logger.log(`Announcement updated: ${id}`);
        return updated;
    }

    // 發布公告
    async publish(id: string): Promise<Announcement> {
        const announcement = await this.findOne(id);

        if (announcement.status === 'published') {
            throw new BadRequestException('Announcement is already published');
        }

        announcement.status = 'published';
        announcement.publishedAt = new Date();

        const published = await this.announcementRepo.save(announcement);
        this.logger.log(`Announcement published: ${id}`);

        // TODO: 發送推播通知
        if (announcement.sendNotification && !announcement.notificationSent) {
            await this.sendNotification(announcement);
        }

        return published;
    }

    // 取消發布（存為草稿）
    async unpublish(id: string): Promise<Announcement> {
        const announcement = await this.findOne(id);
        announcement.status = 'draft';
        return this.announcementRepo.save(announcement);
    }

    // 封存公告
    async archive(id: string): Promise<Announcement> {
        const announcement = await this.findOne(id);
        announcement.status = 'archived';
        return this.announcementRepo.save(announcement);
    }

    // 置頂/取消置頂
    async togglePin(id: string): Promise<Announcement> {
        const announcement = await this.findOne(id);
        announcement.isPinned = !announcement.isPinned;
        return this.announcementRepo.save(announcement);
    }

    // 刪除公告
    async delete(id: string): Promise<void> {
        const result = await this.announcementRepo.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Announcement ${id} not found`);
        }
        this.logger.log(`Announcement deleted: ${id}`);
    }

    // 增加閱讀次數
    async incrementViewCount(id: string): Promise<void> {
        await this.announcementRepo.increment({ id }, 'viewCount', 1);
    }

    // 取得分類統計
    async getCategoryStats(): Promise<Record<AnnouncementCategory, number>> {
        const results = await this.announcementRepo
            .createQueryBuilder('a')
            .select('a.category', 'category')
            .addSelect('COUNT(*)', 'count')
            .where('a.status = :status', { status: 'published' })
            .groupBy('a.category')
            .getRawMany();

        const stats: Record<string, number> = {
            disaster: 0,
            event: 0,
            training: 0,
            maintenance: 0,
            general: 0,
        };

        for (const r of results) {
            stats[r.category] = parseInt(r.count, 10);
        }

        return stats as Record<AnnouncementCategory, number>;
    }

    // 發送推播通知（整合 FCM 和 LINE）
    private async sendNotification(announcement: Announcement): Promise<void> {
        // TODO: 實作推播通知邏輯
        // - FCM 推播
        // - LINE 推播
        this.logger.log(`Notification would be sent for announcement: ${announcement.id}`);

        announcement.notificationSent = true;
        await this.announcementRepo.save(announcement);
    }
}
