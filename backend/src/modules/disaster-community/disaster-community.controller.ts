import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DisasterCommunityService } from './disaster-community.service';

@ApiTags('Disaster Community')
@ApiBearerAuth()
@Controller('community')
export class DisasterCommunityController {
    constructor(private readonly service: DisasterCommunityService) { }

    @Post('posts')
    @ApiOperation({ summary: '發佈貼文' })
    createPost(@Body() dto: any) {
        return this.service.createPost(dto);
    }

    @Get('posts')
    @ApiOperation({ summary: '取得貼文列表' })
    getPosts(@Query('type') type?: string, @Query('limit') limit?: number, @Query('offset') offset?: number) {
        return this.service.getPosts({ type, limit, offset });
    }

    @Get('posts/:id')
    @ApiOperation({ summary: '取得貼文' })
    getPost(@Param('id') id: string) {
        return this.service.getPost(id);
    }

    @Post('posts/:id/like')
    @ApiOperation({ summary: '按讚' })
    likePost(@Param('id') id: string, @Body() dto: { userId: string }) {
        return { success: this.service.likePost(id, dto.userId) };
    }

    @Put('posts/:id/verify')
    @ApiOperation({ summary: '驗證貼文' })
    verifyPost(@Param('id') id: string, @Body() dto: { verified: boolean }) {
        return this.service.verifyPost(id, dto.verified);
    }

    @Post('posts/:postId/comments')
    @ApiOperation({ summary: '新增留言' })
    addComment(@Param('postId') postId: string, @Body() dto: any) {
        return this.service.addComment({ ...dto, postId });
    }

    @Get('posts/:postId/comments')
    @ApiOperation({ summary: '取得留言' })
    getComments(@Param('postId') postId: string) {
        return this.service.getComments(postId);
    }

    @Post('articles')
    @ApiOperation({ summary: '新增知識文章' })
    createArticle(@Body() dto: any) {
        return this.service.createArticle(dto);
    }

    @Get('articles/search')
    @ApiOperation({ summary: '搜尋文章' })
    searchArticles(@Query('q') query: string, @Query('category') category?: string) {
        return this.service.searchArticles(query, category);
    }

    @Get('articles/popular')
    @ApiOperation({ summary: '熱門文章' })
    getPopularArticles(@Query('limit') limit?: number) {
        return this.service.getPopularArticles(limit || 10);
    }

    @Get('articles/:id')
    @ApiOperation({ summary: '取得文章' })
    getArticle(@Param('id') id: string) {
        return this.service.getArticle(id);
    }

    @Post('organizations')
    @ApiOperation({ summary: '註冊組織' })
    registerOrganization(@Body() dto: any) {
        return this.service.registerOrganization(dto);
    }

    @Get('organizations')
    @ApiOperation({ summary: '搜尋組織' })
    searchOrganizations(@Query('type') type?: string, @Query('region') region?: string, @Query('capability') capability?: string) {
        return this.service.searchOrganizations({ type, region, capability });
    }

    @Get('organizations/:id')
    @ApiOperation({ summary: '取得組織' })
    getOrganization(@Param('id') id: string) {
        return this.service.getOrganization(id);
    }

    @Put('organizations/:id/verify')
    @ApiOperation({ summary: '驗證組織' })
    verifyOrganization(@Param('id') id: string) {
        return this.service.verifyOrganization(id);
    }

    @Post('collaborations')
    @ApiOperation({ summary: '提案協作' })
    proposeCollaboration(@Body() dto: any) {
        return this.service.proposeCollaboration(dto);
    }

    @Get('collaborations/:id')
    @ApiOperation({ summary: '取得協作' })
    getCollaboration(@Param('id') id: string) {
        return this.service.getCollaboration(id);
    }

    @Get('organizations/:orgId/collaborations')
    @ApiOperation({ summary: '組織協作列表' })
    getOrganizationCollaborations(@Param('orgId') orgId: string) {
        return this.service.getOrganizationCollaborations(orgId);
    }

    @Post('collaborations/:id/accept')
    @ApiOperation({ summary: '接受協作' })
    acceptCollaboration(@Param('id') id: string, @Body() dto: { orgId: string }) {
        return this.service.acceptCollaboration(id, dto.orgId);
    }

    @Post('collaborations/:id/complete')
    @ApiOperation({ summary: '完成協作' })
    completeCollaboration(@Param('id') id: string) {
        return this.service.completeCollaboration(id);
    }

    @Get('stats')
    @ApiOperation({ summary: '社群統計' })
    getCommunityStats() {
        return this.service.getCommunityStats();
    }
}
