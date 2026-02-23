import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CommunityService } from './community.service';
import { CommunityPost, PostComment, PostLike } from './community.entity';

describe('CommunityService', () => {
    let service: CommunityService;
    let postRepo: any;
    let commentRepo: any;
    let likeRepo: any;

    const mockPost: Partial<CommunityPost> = {
        id: 'post-1',
        authorId: 'user-1',
        authorName: '王小明',
        title: '今天的防災心得',
        content: '分享一些防災知識...',
        category: 'share',
        status: 'active',
        likeCount: 5,
        commentCount: 2,
    };

    const mockComment: Partial<PostComment> = {
        id: 'comment-1',
        postId: 'post-1',
        authorId: 'user-2',
        authorName: '李大華',
        content: '很實用的分享！',
        status: 'active',
    };

    const mockLike: Partial<PostLike> = {
        id: 'like-1',
        postId: 'post-1',
        userId: 'user-2',
    };

    const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPost]),
        getCount: jest.fn().mockResolvedValue(2),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ authorId: 'user-1', authorName: '王小明', postCount: '10' }]),
    };

    beforeEach(async () => {
        Object.values(mockQb).forEach(fn => (fn as any).mockClear?.());
        mockQb.getMany.mockResolvedValue([mockPost]);
        mockQb.getCount.mockResolvedValue(2);
        mockQb.getRawMany.mockResolvedValue([{ authorId: 'user-1', authorName: '王小明', postCount: '10' }]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CommunityService,
                {
                    provide: getRepositoryToken(CommunityPost),
                    useValue: {
                        create: jest.fn().mockImplementation((dto) => ({ id: 'post-1', likeCount: 0, commentCount: 0, status: 'active', ...dto })),
                        save: jest.fn().mockImplementation((p) => Promise.resolve(p)),
                        findOne: jest.fn().mockResolvedValue(mockPost),
                        find: jest.fn().mockResolvedValue([mockPost]),
                        count: jest.fn().mockResolvedValue(10),
                        createQueryBuilder: jest.fn().mockReturnValue(mockQb),
                    },
                },
                {
                    provide: getRepositoryToken(PostComment),
                    useValue: {
                        create: jest.fn().mockImplementation((dto) => ({ id: 'comment-1', status: 'active', ...dto })),
                        save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
                        findOne: jest.fn().mockResolvedValue(mockComment),
                        find: jest.fn().mockResolvedValue([mockComment]),
                        count: jest.fn().mockResolvedValue(5),
                        remove: jest.fn().mockResolvedValue(undefined),
                    },
                },
                {
                    provide: getRepositoryToken(PostLike),
                    useValue: {
                        create: jest.fn().mockReturnValue(mockLike),
                        save: jest.fn().mockResolvedValue(mockLike),
                        findOne: jest.fn().mockResolvedValue(null),
                        count: jest.fn().mockResolvedValue(0),
                        remove: jest.fn().mockResolvedValue(undefined),
                    },
                },
            ],
        }).compile();

        service = module.get<CommunityService>(CommunityService);
        postRepo = module.get(getRepositoryToken(CommunityPost));
        commentRepo = module.get(getRepositoryToken(PostComment));
        likeRepo = module.get(getRepositoryToken(PostLike));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== Post CRUD =====
    describe('createPost', () => {
        it('should create a post', async () => {
            const dto = { authorId: 'user-1', authorName: '王小明', content: '防災心得...' };
            const result = await service.createPost(dto as any);
            expect(postRepo.create).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    describe('getPosts', () => {
        it('should return filtered posts', async () => {
            const result = await service.getPosts({ category: 'share' });
            expect(result).toBeDefined();
        });
    });

    describe('getPost', () => {
        it('should return post with comments', async () => {
            const result = await service.getPost('post-1');
            expect(result).toBeDefined();
        });

        it('should throw NotFoundException', async () => {
            postRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.getPost('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('updatePost', () => {
        it('should update own post', async () => {
            const result = await service.updatePost('post-1', 'user-1', { content: '更新內容' } as any);
            expect(postRepo.save).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should throw if not author', async () => {
            await expect(service.updatePost('post-1', 'other-user', { content: '...' } as any))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('deletePost', () => {
        it('should soft-delete own post', async () => {
            await service.deletePost('post-1', 'user-1');
            expect(postRepo.save).toHaveBeenCalled();
        });

        it('should allow admin to delete any post', async () => {
            await service.deletePost('post-1', 'admin-1', true);
            expect(postRepo.save).toHaveBeenCalled();
        });

        it('should throw if not author and not admin', async () => {
            await expect(service.deletePost('post-1', 'other-user'))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw NotFoundException', async () => {
            postRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.deletePost('nonexistent', 'user-1'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('pinPost', () => {
        it('should pin a post', async () => {
            const result = await service.pinPost('post-1', true);
            expect(result.isPinned).toBe(true);
        });
    });

    // ===== Comments =====
    describe('createComment', () => {
        it('should create comment and increment count', async () => {
            const dto = { postId: 'post-1', authorId: 'user-2', authorName: '李大華', content: '好文！' };
            const result = await service.createComment(dto as any);
            expect(commentRepo.create).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    describe('getComments', () => {
        it('should return comments for post', async () => {
            const result = await service.getComments('post-1');
            expect(result).toEqual([mockComment]);
        });
    });

    describe('deleteComment', () => {
        it('should delete own comment', async () => {
            commentRepo.findOne.mockResolvedValueOnce({
                ...mockComment, authorId: 'user-2',
                post: { ...mockPost, commentCount: 2 },
            });
            await service.deleteComment('comment-1', 'user-2');
            expect(commentRepo.save).toHaveBeenCalled();
        });

        it('should throw if not author and not admin', async () => {
            commentRepo.findOne.mockResolvedValueOnce({
                ...mockComment, authorId: 'user-2',
                post: { ...mockPost, commentCount: 2 },
            });
            await expect(service.deleteComment('comment-1', 'other-user'))
                .rejects.toThrow(BadRequestException);
        });
    });

    // ===== Likes =====
    describe('toggleLike', () => {
        it('should add like when not yet liked', async () => {
            likeRepo.findOne.mockResolvedValueOnce(null);
            const result = await service.toggleLike('post-1', 'user-2');
            expect(result.liked).toBe(true);
        });

        it('should remove like when already liked', async () => {
            likeRepo.findOne.mockResolvedValueOnce(mockLike);
            postRepo.findOne.mockResolvedValueOnce({ ...mockPost, likeCount: 5 });
            const result = await service.toggleLike('post-1', 'user-2');
            expect(result.liked).toBe(false);
        });

        it('should throw NotFoundException', async () => {
            postRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.toggleLike('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
        });
    });

    describe('hasLiked', () => {
        it('should return false when not liked', async () => {
            likeRepo.count.mockResolvedValueOnce(0);
            const result = await service.hasLiked('post-1', 'user-1');
            expect(result).toBe(false);
        });
    });

    // ===== Stats =====
    describe('getStats', () => {
        it('should return community statistics', async () => {
            const result = await service.getStats();
            expect(result).toHaveProperty('totalPosts');
            expect(result).toHaveProperty('totalComments');
            expect(result).toHaveProperty('todayPosts');
            expect(result).toHaveProperty('topContributors');
            expect(result.topContributors[0].postCount).toBe(10);
        });
    });
});
