import { Test, TestingModule } from '@nestjs/testing';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { CoreJwtGuard, UnifiedRolesGuard, ResourceOwnerGuard } from '../shared/guards';

describe('CommunityController', () => {
    let controller: CommunityController;
    let service: jest.Mocked<Partial<CommunityService>>;

    const mockPost = { id: 'p1', title: '防災知識分享', authorId: 'u1' };
    const mockComment = { id: 'c1', content: '好文章', postId: 'p1' };

    beforeEach(async () => {
        service = {
            getPosts: jest.fn().mockResolvedValue([mockPost]),
            getPost: jest.fn().mockResolvedValue(mockPost),
            createPost: jest.fn().mockResolvedValue(mockPost),
            updatePost: jest.fn().mockResolvedValue({ ...mockPost, title: '更新分享' }),
            deletePost: jest.fn().mockResolvedValue(undefined),
            pinPost: jest.fn().mockResolvedValue({ ...mockPost, isPinned: true }),
            getComments: jest.fn().mockResolvedValue([mockComment]),
            createComment: jest.fn().mockResolvedValue(mockComment),
            deleteComment: jest.fn().mockResolvedValue(undefined),
            toggleLike: jest.fn().mockResolvedValue({ liked: true, likeCount: 5 }),
            hasLiked: jest.fn().mockResolvedValue(true),
            getStats: jest.fn().mockResolvedValue({ totalPosts: 100 }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [CommunityController],
            providers: [{ provide: CommunityService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .overrideGuard(ResourceOwnerGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<CommunityController>(CommunityController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('getPosts returns posts list', async () => {
        const result = await controller.getPosts();
        expect(result.success).toBe(true);
        expect(result.count).toBe(1);
    });

    it('getPost returns single post', async () => {
        const result = await controller.getPost('p1');
        expect(result.data).toEqual(mockPost);
    });

    it('createPost creates new post', async () => {
        const result = await controller.createPost({ title: '測試' } as any);
        expect(result.message).toContain('發布');
    });

    it('updatePost updates post', async () => {
        const req = { user: { sub: 'u1' } };
        const result = await controller.updatePost('p1', { title: '更新' }, req);
        expect(result.message).toContain('更新');
    });

    it('deletePost deletes post', async () => {
        const req = { user: { sub: 'u1', roleLevel: 3 } };
        const result = await controller.deletePost('p1', req);
        expect(result.message).toContain('刪除');
    });

    it('pinPost pins post', async () => {
        const result = await controller.pinPost('p1', { isPinned: true });
        expect(result.message).toContain('置頂');
    });

    it('getComments returns comments', async () => {
        const result = await controller.getComments('p1');
        expect(result.count).toBe(1);
    });

    it('createComment creates comment', async () => {
        const result = await controller.createComment('p1', { content: '好文' } as any);
        expect(result.message).toContain('評論');
    });

    it('toggleLike toggles like', async () => {
        const req = { user: { sub: 'u1' } };
        const result = await controller.toggleLike('p1', req);
        expect(result.message).toContain('按讚');
    });

    it('hasLiked checks like status', async () => {
        const result = await controller.hasLiked('p1', 'u1');
        expect(result.data.liked).toBe(true);
    });

    it('getStats returns community stats', async () => {
        const result = await controller.getStats();
        expect(result.success).toBe(true);
    });
});
