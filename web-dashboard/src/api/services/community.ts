import api from '../client';

// ===== 社群牆 API =====

export type PostCategory = 'general' | 'help' | 'share' | 'event' | 'emergency' | 'volunteer';
export type PostStatus = 'active' | 'hidden' | 'deleted';

export interface CommunityPost {
    id: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    title?: string;
    content: string;
    category: PostCategory;
    images?: string[];
    link?: string;
    likeCount: number;
    commentCount: number;
    viewCount: number;
    status: PostStatus;
    isPinned: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PostComment {
    id: string;
    postId: string;
    parentId?: string;
    authorId: string;
    authorName: string;
    content: string;
    likeCount: number;
    status: 'active' | 'hidden' | 'deleted';
    createdAt: string;
}

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

// 取得貼文列表
export const getCommunityPosts = (params?: { category?: PostCategory; limit?: number; offset?: number }) =>
    api.get<{ success: boolean; data: CommunityPost[]; count: number }>('/community/posts', { params });

// 取得單一貼文
export const getCommunityPost = (id: string) =>
    api.get<{ success: boolean; data: CommunityPost }>(`/community/posts/${id}`);

// 建立貼文
export const createCommunityPost = (data: CreatePostDto) =>
    api.post<{ success: boolean; message: string; data: CommunityPost }>('/community/posts', data);

// 更新貼文
export const updateCommunityPost = (id: string, data: Partial<CreatePostDto> & { authorId: string }) =>
    api.patch<{ success: boolean; data: CommunityPost }>(`/community/posts/${id}`, data);

// 刪除貼文
export const deleteCommunityPost = (id: string, authorId: string, isAdmin = false) =>
    api.delete(`/community/posts/${id}`, { params: { authorId, isAdmin } });

// 置頂貼文
export const pinCommunityPost = (id: string, isPinned: boolean) =>
    api.patch<{ success: boolean; data: CommunityPost }>(`/community/posts/${id}/pin`, { isPinned });

// 取得貼文評論
export const getPostComments = (postId: string) =>
    api.get<{ success: boolean; data: PostComment[]; count: number }>(`/community/posts/${postId}/comments`);

// 新增評論
export const createPostComment = (postId: string, data: { authorId: string; authorName: string; content: string; parentId?: string }) =>
    api.post<{ success: boolean; message: string; data: PostComment }>(`/community/posts/${postId}/comments`, data);

// 刪除評論
export const deletePostComment = (id: string, authorId: string, isAdmin = false) =>
    api.delete(`/community/comments/${id}`, { params: { authorId, isAdmin } });

// 切換按讚
export const togglePostLike = (postId: string, userId: string) =>
    api.post<{ success: boolean; data: { liked: boolean; likeCount: number } }>(`/community/posts/${postId}/like`, { userId });

// 檢查是否已按讚
export const checkPostLiked = (postId: string, userId: string) =>
    api.get<{ success: boolean; data: { liked: boolean } }>(`/community/posts/${postId}/like/${userId}`);

// 社群統計
export const getCommunityStats = () =>
    api.get<{ success: boolean; data: { totalPosts: number; totalComments: number; todayPosts: number; topContributors: { authorId: string; authorName: string; postCount: number }[] } }>('/community/stats');

// ===== 志工排行榜與表揚 API =====

export interface VolunteerLeaderboardEntry {
    volunteerId: string;
    volunteerName: string;
    avatar?: string;
    totalHours: number;
    eventCount: number;
    lastActivityDate?: string;
}

export interface VolunteerRecognition {
    id: string;
    volunteerId: string;
    volunteerName: string;
    title: string;
    reason: string;
    badgeType: 'gold' | 'silver' | 'bronze' | 'special';
    awardedAt: string;
    awardedBy?: string;
}

// 取得志工排行榜
export const getVolunteerLeaderboard = (params?: { period?: string; limit?: number }) =>
    api.get<{ success: boolean; data: VolunteerLeaderboardEntry[] }>('/volunteers/leaderboard', { params });

// 取得表揚記錄
export const getVolunteerRecognitions = (params?: { limit?: number }) =>
    api.get<{ success: boolean; data: VolunteerRecognition[] }>('/volunteers/recognitions', { params });

// 頒發表揚（管理員）
export const createRecognition = (data: { volunteerId: string; title: string; reason: string; badgeType: string; awardedBy?: string }) =>
    api.post<{ success: boolean; data: VolunteerRecognition }>('/volunteers/recognitions', data);

// ===== 備份管理 API =====

export interface BackupInfo {
    id: string;
    description?: string;
    modules: string[];
    size?: number;
    createdBy?: string;
    createdAt: string;
}

// 取得備份列表
export const getBackups = () =>
    api.get<{ success: boolean; data: BackupInfo[] }>('/backups');

// 建立備份
export const createBackup = (data: { modules: string[]; description?: string }) =>
    api.post<{ success: boolean; data: BackupInfo }>('/backups', data);

// 下載備份
export const downloadBackup = (id: string) =>
    api.get<any>(`/backups/${id}/download`);

// 還原備份
export const restoreBackup = (id: string) =>
    api.post<{ success: boolean; message: string }>(`/backups/${id}/restore`);

// 刪除備份
export const deleteBackup = (id: string) =>
    api.delete(`/backups/${id}`);
