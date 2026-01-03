import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { CommunityService, CreatePostDto, CreateCommentDto, PostFilter } from './community.service';
import { PostCategory } from './community.entity';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS, ResourceOwnerGuard, ResourceOwner } from '../shared/guards';

@Controller('community')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.VOLUNTEER)
export class CommunityController {
    constructor(private readonly communityService: CommunityService) { }

    // ===== 貼文 =====

    // 取得貼文列表
    @Get('posts')
    async getPosts(
        @Query('category') category?: PostCategory,
        @Query('authorId') authorId?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const filter: PostFilter = {
            category,
            authorId,
            limit: limit ? parseInt(limit, 10) : 20,
            offset: offset ? parseInt(offset, 10) : undefined,
        };

        const posts = await this.communityService.getPosts(filter);
        return {
            success: true,
            data: posts,
            count: posts.length,
        };
    }

    // 取得單一貼文
    @Get('posts/:id')
    async getPost(@Param('id') id: string) {
        const post = await this.communityService.getPost(id);
        return {
            success: true,
            data: post,
        };
    }

    // 建立貼文
    @Post('posts')
    async createPost(@Body() dto: CreatePostDto) {
        const post = await this.communityService.createPost(dto);
        return {
            success: true,
            message: '貼文已發布',
            data: post,
        };
    }

    // 更新貼文 - 🔐 使用 JWT 用戶身份防止 IDOR
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard, ResourceOwnerGuard)
    @ResourceOwner({ entity: 'CommunityPost', ownerField: 'authorId', bypassLevel: ROLE_LEVELS.OFFICER })
    @Patch('posts/:id')
    async updatePost(
        @Param('id') id: string,
        @Body() dto: Partial<CreatePostDto>,
        @Request() req: { user: { sub: string } },
    ) {
        // 使用 JWT 中的用戶 ID，而非客戶端提供的 authorId
        const post = await this.communityService.updatePost(id, req.user.sub, dto);
        return {
            success: true,
            message: '貼文已更新',
            data: post,
        };
    }

    // 刪除貼文 - 🔐 使用 JWT 用戶身份防止 IDOR
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard, ResourceOwnerGuard)
    @ResourceOwner({ entity: 'CommunityPost', ownerField: 'authorId', bypassLevel: ROLE_LEVELS.OFFICER })
    @Delete('posts/:id')
    async deletePost(
        @Param('id') id: string,
        @Request() req: { user: { sub: string; roleLevel: number } },
    ) {
        // 使用 JWT 中的用戶 ID 和角色等級
        const isAdmin = req.user.roleLevel >= ROLE_LEVELS.OFFICER;
        await this.communityService.deletePost(id, req.user.sub, isAdmin);
        return {
            success: true,
            message: '貼文已刪除',
        };
    }

    // 置頂貼文
    @Patch('posts/:id/pin')
    async pinPost(
        @Param('id') id: string,
        @Body() dto: { isPinned: boolean },
    ) {
        const post = await this.communityService.pinPost(id, dto.isPinned);
        return {
            success: true,
            message: dto.isPinned ? '已置頂' : '已取消置頂',
            data: post,
        };
    }

    // ===== 評論 =====

    // 取得貼文評論
    @Get('posts/:postId/comments')
    async getComments(@Param('postId') postId: string) {
        const comments = await this.communityService.getComments(postId);
        return {
            success: true,
            data: comments,
            count: comments.length,
        };
    }

    // 新增評論
    @Post('posts/:postId/comments')
    async createComment(
        @Param('postId') postId: string,
        @Body() dto: Omit<CreateCommentDto, 'postId'>,
    ) {
        const comment = await this.communityService.createComment({
            ...dto,
            postId,
        });
        return {
            success: true,
            message: '評論已發布',
            data: comment,
        };
    }

    // 刪除評論 - 🔐 使用 JWT 用戶身份防止 IDOR
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard, ResourceOwnerGuard)
    @ResourceOwner({ entity: 'PostComment', ownerField: 'authorId', bypassLevel: ROLE_LEVELS.OFFICER })
    @Delete('comments/:id')
    async deleteComment(
        @Param('id') id: string,
        @Request() req: { user: { sub: string; roleLevel: number } },
    ) {
        const isAdmin = req.user.roleLevel >= ROLE_LEVELS.OFFICER;
        await this.communityService.deleteComment(id, req.user.sub, isAdmin);
        return {
            success: true,
            message: '評論已刪除',
        };
    }

    // ===== 按讚 =====

    // 切換按讚 - 🔐 使用 JWT 用戶身份
    @Post('posts/:postId/like')
    async toggleLike(
        @Param('postId') postId: string,
        @Request() req: { user: { sub: string } },
    ) {
        // 使用 JWT 中的用戶 ID，而非客戶端提供的 userId
        const result = await this.communityService.toggleLike(postId, req.user.sub);
        return {
            success: true,
            message: result.liked ? '已按讚' : '已取消按讚',
            data: result,
        };
    }

    // 檢查是否已按讚
    @Get('posts/:postId/like/:userId')
    async hasLiked(
        @Param('postId') postId: string,
        @Param('userId') userId: string,
    ) {
        const liked = await this.communityService.hasLiked(postId, userId);
        return {
            success: true,
            data: { liked },
        };
    }

    // ===== 統計 =====

    @Get('stats')
    async getStats() {
        const stats = await this.communityService.getStats();
        return {
            success: true,
            data: stats,
        };
    }
}
