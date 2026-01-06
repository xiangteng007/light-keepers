import { Injectable, Logger } from '@nestjs/common';

export interface CommunityPost {
    id: string;
    authorId: string;
    authorName: string;
    type: 'experience' | 'question' | 'resource' | 'alert' | 'thank';
    title: string;
    content: string;
    tags: string[];
    attachments?: string[];
    likes: number;
    comments: number;
    isVerified: boolean;
    isPinned: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Comment {
    id: string;
    postId: string;
    authorId: string;
    authorName: string;
    content: string;
    likes: number;
    isExpert: boolean;
    createdAt: Date;
}

export interface KnowledgeArticle {
    id: string;
    title: string;
    category: 'earthquake' | 'typhoon' | 'flood' | 'fire' | 'first_aid' | 'evacuation' | 'equipment';
    content: string;
    summary: string;
    author: string;
    tags: string[];
    views: number;
    isOfficial: boolean;
    lastUpdated: Date;
}

export interface Organization {
    id: string;
    name: string;
    type: 'ngo' | 'government' | 'volunteer_group' | 'company';
    description: string;
    contactEmail: string;
    contactPhone: string;
    website?: string;
    regions: string[];
    capabilities: string[];
    isVerified: boolean;
    memberCount: number;
    createdAt: Date;
}

export interface Collaboration {
    id: string;
    title: string;
    description: string;
    initiatorOrgId: string;
    partnerOrgIds: string[];
    status: 'proposed' | 'active' | 'completed' | 'cancelled';
    startDate?: Date;
    endDate?: Date;
    resources: { type: string; quantity: number; provider: string }[];
    createdAt: Date;
}

@Injectable()
export class DisasterCommunityService {
    private readonly logger = new Logger(DisasterCommunityService.name);
    private posts: Map<string, CommunityPost> = new Map();
    private comments: Map<string, Comment[]> = new Map();
    private articles: Map<string, KnowledgeArticle> = new Map();
    private organizations: Map<string, Organization> = new Map();
    private collaborations: Map<string, Collaboration> = new Map();
    private userLikes: Map<string, Set<string>> = new Map();

    // ===== 社群貼文 =====

    createPost(data: Omit<CommunityPost, 'id' | 'likes' | 'comments' | 'isVerified' | 'isPinned' | 'createdAt' | 'updatedAt'>): CommunityPost {
        const post: CommunityPost = {
            ...data,
            id: `post-${Date.now()}`,
            likes: 0,
            comments: 0,
            isVerified: false,
            isPinned: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.posts.set(post.id, post);
        return post;
    }

    getPost(id: string): CommunityPost | undefined {
        return this.posts.get(id);
    }

    getPosts(options?: { type?: string; tags?: string[]; limit?: number; offset?: number }): CommunityPost[] {
        let result = Array.from(this.posts.values());

        if (options?.type) {
            result = result.filter(p => p.type === options.type);
        }
        if (options?.tags?.length) {
            result = result.filter(p => options.tags!.some(t => p.tags.includes(t)));
        }

        result.sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            return b.createdAt.getTime() - a.createdAt.getTime();
        });

        const offset = options?.offset || 0;
        const limit = options?.limit || 20;
        return result.slice(offset, offset + limit);
    }

    likePost(postId: string, userId: string): boolean {
        const post = this.posts.get(postId);
        if (!post) return false;

        let userLikes = this.userLikes.get(userId);
        if (!userLikes) {
            userLikes = new Set();
            this.userLikes.set(userId, userLikes);
        }

        if (userLikes.has(postId)) {
            userLikes.delete(postId);
            post.likes--;
        } else {
            userLikes.add(postId);
            post.likes++;
        }
        return true;
    }

    verifyPost(id: string, verified: boolean): CommunityPost | null {
        const post = this.posts.get(id);
        if (!post) return null;
        post.isVerified = verified;
        return post;
    }

    // ===== 留言 =====

    addComment(data: Omit<Comment, 'id' | 'likes' | 'isExpert' | 'createdAt'>): Comment {
        const comment: Comment = {
            ...data,
            id: `cmt-${Date.now()}`,
            likes: 0,
            isExpert: false,
            createdAt: new Date(),
        };

        const postComments = this.comments.get(data.postId) || [];
        postComments.push(comment);
        this.comments.set(data.postId, postComments);

        const post = this.posts.get(data.postId);
        if (post) post.comments++;

        return comment;
    }

    getComments(postId: string): Comment[] {
        return this.comments.get(postId) || [];
    }

    // ===== 知識庫 =====

    createArticle(data: Omit<KnowledgeArticle, 'id' | 'views' | 'lastUpdated'>): KnowledgeArticle {
        const article: KnowledgeArticle = {
            ...data,
            id: `article-${Date.now()}`,
            views: 0,
            lastUpdated: new Date(),
        };
        this.articles.set(article.id, article);
        return article;
    }

    getArticle(id: string): KnowledgeArticle | undefined {
        const article = this.articles.get(id);
        if (article) article.views++;
        return article;
    }

    searchArticles(query: string, category?: string): KnowledgeArticle[] {
        const q = query.toLowerCase();
        return Array.from(this.articles.values())
            .filter(a => (!category || a.category === category) &&
                (a.title.toLowerCase().includes(q) ||
                    a.content.toLowerCase().includes(q) ||
                    a.tags.some(t => t.toLowerCase().includes(q))))
            .sort((a, b) => b.views - a.views);
    }

    getPopularArticles(limit: number = 10): KnowledgeArticle[] {
        return Array.from(this.articles.values())
            .sort((a, b) => b.views - a.views)
            .slice(0, limit);
    }

    // ===== 組織 =====

    registerOrganization(data: Omit<Organization, 'id' | 'isVerified' | 'memberCount' | 'createdAt'>): Organization {
        const org: Organization = {
            ...data,
            id: `org-${Date.now()}`,
            isVerified: false,
            memberCount: 1,
            createdAt: new Date(),
        };
        this.organizations.set(org.id, org);
        return org;
    }

    getOrganization(id: string): Organization | undefined {
        return this.organizations.get(id);
    }

    searchOrganizations(options?: { type?: string; region?: string; capability?: string }): Organization[] {
        return Array.from(this.organizations.values())
            .filter(o => (!options?.type || o.type === options.type) &&
                (!options?.region || o.regions.includes(options.region)) &&
                (!options?.capability || o.capabilities.includes(options.capability)));
    }

    verifyOrganization(id: string): Organization | null {
        const org = this.organizations.get(id);
        if (!org) return null;
        org.isVerified = true;
        return org;
    }

    // ===== 跨組織協作 =====

    proposeCollaboration(data: Omit<Collaboration, 'id' | 'status' | 'createdAt'>): Collaboration {
        const collab: Collaboration = {
            ...data,
            id: `collab-${Date.now()}`,
            status: 'proposed',
            createdAt: new Date(),
        };
        this.collaborations.set(collab.id, collab);
        return collab;
    }

    getCollaboration(id: string): Collaboration | undefined {
        return this.collaborations.get(id);
    }

    getOrganizationCollaborations(orgId: string): Collaboration[] {
        return Array.from(this.collaborations.values())
            .filter(c => c.initiatorOrgId === orgId || c.partnerOrgIds.includes(orgId));
    }

    acceptCollaboration(id: string, orgId: string): Collaboration | null {
        const collab = this.collaborations.get(id);
        if (!collab) return null;
        if (!collab.partnerOrgIds.includes(orgId)) return null;
        collab.status = 'active';
        collab.startDate = new Date();
        return collab;
    }

    completeCollaboration(id: string): Collaboration | null {
        const collab = this.collaborations.get(id);
        if (!collab) return null;
        collab.status = 'completed';
        collab.endDate = new Date();
        return collab;
    }

    // ===== 統計 =====

    getCommunityStats(): {
        totalPosts: number;
        totalArticles: number;
        totalOrganizations: number;
        activeCollaborations: number;
        topContributors: { authorId: string; posts: number }[];
    } {
        const contributorMap = new Map<string, number>();
        this.posts.forEach(p => {
            contributorMap.set(p.authorId, (contributorMap.get(p.authorId) || 0) + 1);
        });

        return {
            totalPosts: this.posts.size,
            totalArticles: this.articles.size,
            totalOrganizations: this.organizations.size,
            activeCollaborations: Array.from(this.collaborations.values()).filter(c => c.status === 'active').length,
            topContributors: Array.from(contributorMap.entries())
                .map(([authorId, posts]) => ({ authorId, posts }))
                .sort((a, b) => b.posts - a.posts)
                .slice(0, 10),
        };
    }
}
