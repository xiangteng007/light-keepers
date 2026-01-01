import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunityPost, PostComment, PostLike, PostCategory, PostStatus } from './community.entity';

export interface CreatePostDto {
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    title?: string;
    content: string;
    category?: PostCategory;
    images?: string[];
    link?: string;
}

export interface CreateCommentDto {
    postId: string;
    parentId?: string;
    authorId: string;
    authorName: string;
    content: string;
}

export interface PostFilter {
    category?: PostCategory;
    authorId?: string;
    limit?: number;
    offset?: number;
}

@Injectable()
export class CommunityService {
    private readonly logger = new Logger(CommunityService.name);

    constructor(
        @InjectRepository(CommunityPost)
        private readonly postRepo: Repository<CommunityPost>,
        @InjectRepository(PostComment)
        private readonly commentRepo: Repository<PostComment>,
        @InjectRepository(PostLike)
        private readonly likeRepo: Repository<PostLike>,
    ) { }

    // ===== 貼文 CRUD =====

    async createPost(dto: CreatePostDto): Promise<CommunityPost> {
        const post = this.postRepo.create({
            ...dto,
            status: 'active',
        });

        const saved = await this.postRepo.save(post);
        this.logger.log(`Post created: ${saved.id} by ${dto.authorName}`);
        return saved;
    }

    async getPosts(filter: PostFilter = {}): Promise<CommunityPost[]> {
        const query = this.postRepo.createQueryBuilder('p')
            .where('p.status = :status', { status: 'active' });

        if (filter.category) {
            query.andWhere('p.category = :category', { category: filter.category });
        }

        if (filter.authorId) {
            query.andWhere('p.authorId = :authorId', { authorId: filter.authorId });
        }

        query.orderBy('p.isPinned', 'DESC')
            .addOrderBy('p.createdAt', 'DESC');

        if (filter.limit) query.take(filter.limit);
        if (filter.offset) query.skip(filter.offset);

        return query.getMany();
    }

    async getPost(id: string): Promise<CommunityPost> {
        const post = await this.postRepo.findOne({
            where: { id },
            relations: ['comments'],
        });

        if (!post) {
            throw new NotFoundException('Post not found');
        }

        // 增加瀏覽數
        post.viewCount++;
        await this.postRepo.save(post);

        return post;
    }

    async updatePost(id: string, authorId: string, dto: Partial<CreatePostDto>): Promise<CommunityPost> {
        const post = await this.postRepo.findOne({ where: { id } });

        if (!post) {
            throw new NotFoundException('Post not found');
        }

        if (post.authorId !== authorId) {
            throw new BadRequestException('Cannot edit others post');
        }

        Object.assign(post, dto);
        return this.postRepo.save(post);
    }

    async deletePost(id: string, authorId: string, isAdmin = false): Promise<void> {
        const post = await this.postRepo.findOne({ where: { id } });

        if (!post) {
            throw new NotFoundException('Post not found');
        }

        if (!isAdmin && post.authorId !== authorId) {
            throw new BadRequestException('Cannot delete others post');
        }

        post.status = 'deleted';
        await this.postRepo.save(post);
    }

    async pinPost(id: string, isPinned: boolean): Promise<CommunityPost> {
        const post = await this.postRepo.findOne({ where: { id } });
        if (!post) throw new NotFoundException('Post not found');

        post.isPinned = isPinned;
        return this.postRepo.save(post);
    }

    // ===== 評論 =====

    async createComment(dto: CreateCommentDto): Promise<PostComment> {
        const post = await this.postRepo.findOne({ where: { id: dto.postId } });
        if (!post) throw new NotFoundException('Post not found');

        const comment = this.commentRepo.create({
            ...dto,
            status: 'active',
        });

        const saved = await this.commentRepo.save(comment);

        // 更新貼文評論數
        post.commentCount++;
        await this.postRepo.save(post);

        return saved;
    }

    async getComments(postId: string): Promise<PostComment[]> {
        return this.commentRepo.find({
            where: { postId, status: 'active' },
            order: { createdAt: 'ASC' },
        });
    }

    async deleteComment(id: string, authorId: string, isAdmin = false): Promise<void> {
        const comment = await this.commentRepo.findOne({
            where: { id },
            relations: ['post'],
        });

        if (!comment) {
            throw new NotFoundException('Comment not found');
        }

        if (!isAdmin && comment.authorId !== authorId) {
            throw new BadRequestException('Cannot delete others comment');
        }

        comment.status = 'deleted';
        await this.commentRepo.save(comment);

        // 更新貼文評論數
        comment.post.commentCount = Math.max(0, comment.post.commentCount - 1);
        await this.postRepo.save(comment.post);
    }

    // ===== 按讚 =====

    async toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
        const post = await this.postRepo.findOne({ where: { id: postId } });
        if (!post) throw new NotFoundException('Post not found');

        const existing = await this.likeRepo.findOne({
            where: { postId, userId },
        });

        if (existing) {
            // 取消按讚
            await this.likeRepo.remove(existing);
            post.likeCount = Math.max(0, post.likeCount - 1);
            await this.postRepo.save(post);
            return { liked: false, likeCount: post.likeCount };
        } else {
            // 按讚
            const like = this.likeRepo.create({ postId, userId });
            await this.likeRepo.save(like);
            post.likeCount++;
            await this.postRepo.save(post);
            return { liked: true, likeCount: post.likeCount };
        }
    }

    async hasLiked(postId: string, userId: string): Promise<boolean> {
        const like = await this.likeRepo.findOne({ where: { postId, userId } });
        return !!like;
    }

    // ===== 統計 =====

    async getStats(): Promise<{
        totalPosts: number;
        totalComments: number;
        todayPosts: number;
        topContributors: { authorId: string; authorName: string; postCount: number }[];
    }> {
        const [totalPosts, totalComments] = await Promise.all([
            this.postRepo.count({ where: { status: 'active' } }),
            this.commentRepo.count({ where: { status: 'active' } }),
        ]);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayPosts = await this.postRepo
            .createQueryBuilder('p')
            .where('p.createdAt >= :today', { today })
            .andWhere('p.status = :status', { status: 'active' })
            .getCount();

        const topContributorsRaw = await this.postRepo
            .createQueryBuilder('p')
            .select('p.authorId', 'authorId')
            .addSelect('p.authorName', 'authorName')
            .addSelect('COUNT(*)', 'postCount')
            .where('p.status = :status', { status: 'active' })
            .groupBy('p.authorId, p.authorName')
            .orderBy('postCount', 'DESC')
            .limit(5)
            .getRawMany();

        return {
            totalPosts,
            totalComments,
            todayPosts,
            topContributors: topContributorsRaw.map(r => ({
                authorId: r.authorId,
                authorName: r.authorName,
                postCount: parseInt(r.postCount, 10),
            })),
        };
    }
}
