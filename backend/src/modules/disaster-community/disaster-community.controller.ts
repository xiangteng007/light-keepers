import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DisasterCommunityService } from './disaster-community.service';
import { CoreJwtGuard } from '../shared/guards/core-jwt.guard';
import { UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards/unified-roles.guard';

@ApiTags('Disaster Community')
@Controller('community')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@ApiBearerAuth()
export class DisasterCommunityController {
    constructor(private readonly service: DisasterCommunityService) { }

    @Post('posts')
    @ApiOperation({ summary: '發佈貼文' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    createPost(@Body() dto: any) {
        return this.service.createPost(dto);
    }

    @Get('posts')
    @ApiOperation({ summary: '取得貼文列表' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getPosts(@Query('type') type?: string, @Query('limit') limit?: number, @Query('offset') offset?: number) {
        return this.service.getPosts({ type, limit, offset });
    }

    @Get('posts/:id')
    @ApiOperation({ summary: '取得貼文' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getPost(@Param('id') id: string) {
        return this.service.getPost(id);
    }

    @Post('posts/:id/like')
    @ApiOperation({ summary: '按讚' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    likePost(@Param('id') id: string, @Body() dto: { userId: string }) {
        return { success: this.service.likePost(id, dto.userId) };
    }

    @Put('posts/:id/verify')
    @ApiOperation({ summary: '驗證貼文' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    verifyPost(@Param('id') id: string, @Body() dto: { verified: boolean }) {
        return this.service.verifyPost(id, dto.verified);
    }

    @Post('posts/:postId/comments')
    @ApiOperation({ summary: '新增留言' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    addComment(@Param('postId') postId: string, @Body() dto: any) {
        return this.service.addComment({ ...dto, postId });
    }

    @Get('posts/:postId/comments')
    @ApiOperation({ summary: '取得留言' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getComments(@Param('postId') postId: string) {
        return this.service.getComments(postId);
    }

    @Post('articles')
    @ApiOperation({ summary: '新增知識文章' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    createArticle(@Body() dto: any) {
        return this.service.createArticle(dto);
    }

    @Get('articles/search')
    @ApiOperation({ summary: '搜尋文章' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    searchArticles(@Query('q') query: string, @Query('category') category?: string) {
        return this.service.searchArticles(query, category);
    }

    @Get('articles/popular')
    @ApiOperation({ summary: '熱門文章' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getPopularArticles(@Query('limit') limit?: number) {
        return this.service.getPopularArticles(limit || 10);
    }

    @Get('articles/:id')
    @ApiOperation({ summary: '取得文章' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getArticle(@Param('id') id: string) {
        return this.service.getArticle(id);
    }

    @Post('organizations')
    @ApiOperation({ summary: '註冊組織' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    registerOrganization(@Body() dto: any) {
        return this.service.registerOrganization(dto);
    }

    @Get('organizations')
    @ApiOperation({ summary: '搜尋組織' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    searchOrganizations(@Query('type') type?: string, @Query('region') region?: string, @Query('capability') capability?: string) {
        return this.service.searchOrganizations({ type, region, capability });
    }

    @Get('organizations/:id')
    @ApiOperation({ summary: '取得組織' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getOrganization(@Param('id') id: string) {
        return this.service.getOrganization(id);
    }

    @Put('organizations/:id/verify')
    @ApiOperation({ summary: '驗證組織' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    verifyOrganization(@Param('id') id: string) {
        return this.service.verifyOrganization(id);
    }

    @Post('collaborations')
    @ApiOperation({ summary: '提案協作' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    proposeCollaboration(@Body() dto: any) {
        return this.service.proposeCollaboration(dto);
    }

    @Get('collaborations/:id')
    @ApiOperation({ summary: '取得協作' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getCollaboration(@Param('id') id: string) {
        return this.service.getCollaboration(id);
    }

    @Get('organizations/:orgId/collaborations')
    @ApiOperation({ summary: '組織協作列表' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getOrganizationCollaborations(@Param('orgId') orgId: string) {
        return this.service.getOrganizationCollaborations(orgId);
    }

    @Post('collaborations/:id/accept')
    @ApiOperation({ summary: '接受協作' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    acceptCollaboration(@Param('id') id: string, @Body() dto: { orgId: string }) {
        return this.service.acceptCollaboration(id, dto.orgId);
    }

    @Post('collaborations/:id/complete')
    @ApiOperation({ summary: '完成協作' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    completeCollaboration(@Param('id') id: string) {
        return this.service.completeCollaboration(id);
    }

    @Get('stats')
    @ApiOperation({ summary: '社群統計' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getCommunityStats() {
        return this.service.getCommunityStats();
    }
}
