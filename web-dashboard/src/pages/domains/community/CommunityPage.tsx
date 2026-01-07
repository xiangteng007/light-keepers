/**
 * 社群牆頁�?
 * Community Wall Page
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
    getCommunityPosts,
    createCommunityPost,
    togglePostLike,
    getPostComments,
    createPostComment,
    getCommunityStats,
    type CommunityPost,
    type PostComment,
    type PostCategory,
} from '../api/services';
import {
    MessageSquare,
    Heart,
    Eye,
    Send,
    Plus,
    Pin,
    Filter,
    TrendingUp,
    Users,
    X,
} from 'lucide-react';
import './CommunityPage.css';

// 分類標籤
const CATEGORY_OPTIONS: { value: PostCategory; label: string; emoji: string }[] = [
    { value: 'general', label: '一般討�?, emoji: '💬' },
    { value: 'help', label: '求助', emoji: '🆘' },
    { value: 'share', label: '分享', emoji: '📢' },
    { value: 'event', label: '活動', emoji: '📅' },
    { value: 'emergency', label: '緊�?, emoji: '🚨' },
    { value: 'volunteer', label: '志工', emoji: '🙋' },
];

export default function CommunityPage() {
    const { user } = useAuth();

    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<PostCategory | 'all'>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
    const [stats, setStats] = useState<{
        totalPosts: number;
        totalComments: number;
        todayPosts: number;
        topContributors: { authorId: string; authorName: string; postCount: number }[];
    } | null>(null);

    // 載入貼文
    const loadPosts = async () => {
        try {
            setLoading(true);
            const params: { category?: PostCategory; limit?: number } = { limit: 50 };
            if (selectedCategory !== 'all') {
                params.category = selectedCategory;
            }
            const res = await getCommunityPosts(params);
            setPosts(res.data.data || []);
        } catch (error) {
            console.error('Failed to load posts:', error);
        } finally {
            setLoading(false);
        }
    };

    // 載入統計
    const loadStats = async () => {
        try {
            const res = await getCommunityStats();
            setStats(res.data.data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    useEffect(() => {
        loadPosts();
        loadStats();
    }, [selectedCategory]);

    // 按讚
    const handleLike = async (postId: string) => {
        if (!user) return;
        try {
            const res = await togglePostLike(postId, user.id);
            if (res.data.success) {
                setPosts(prev => prev.map(p =>
                    p.id === postId
                        ? { ...p, likeCount: res.data.data.likeCount }
                        : p
                ));
            }
        } catch (error) {
            console.error('Failed to toggle like:', error);
        }
    };

    // 取得分類資訊
    const getCategoryInfo = (category: PostCategory) => {
        return CATEGORY_OPTIONS.find(c => c.value === category) || CATEGORY_OPTIONS[0];
    };

    // 格式化時�?
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '剛剛';
        if (minutes < 60) return `${minutes} 分鐘前`;
        if (hours < 24) return `${hours} 小時前`;
        if (days < 7) return `${days} 天前`;
        return date.toLocaleDateString('zh-TW');
    };

    return (
        <div className="community-page">
            {/* 頁面標題 */}
            <header className="community-header">
                <div className="community-header__title">
                    <h1>💬 社群�?/h1>
                    <p>與志工夥伴交流、分享經�?/p>
                </div>
                <button
                    className="community-header__create-btn"
                    onClick={() => setShowCreateModal(true)}
                >
                    <Plus size={18} />
                    發表貼文
                </button>
            </header>

            {/* 統計卡片 */}
            {stats && (
                <div className="community-stats">
                    <div className="stat-card">
                        <MessageSquare size={20} />
                        <div className="stat-card__content">
                            <span className="stat-card__value">{stats.totalPosts}</span>
                            <span className="stat-card__label">總貼�?/span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <TrendingUp size={20} />
                        <div className="stat-card__content">
                            <span className="stat-card__value">{stats.todayPosts}</span>
                            <span className="stat-card__label">今日新增</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <Users size={20} />
                        <div className="stat-card__content">
                            <span className="stat-card__value">{stats.topContributors?.length || 0}</span>
                            <span className="stat-card__label">活躍貢獻�?/span>
                        </div>
                    </div>
                </div>
            )}

            {/* 分類篩選 */}
            <div className="community-filter">
                <Filter size={16} />
                <button
                    className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('all')}
                >
                    全部
                </button>
                {CATEGORY_OPTIONS.map(cat => (
                    <button
                        key={cat.value}
                        className={`filter-btn ${selectedCategory === cat.value ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(cat.value)}
                    >
                        {cat.emoji} {cat.label}
                    </button>
                ))}
            </div>

            {/* 貼文列表 */}
            <div className="posts-list">
                {loading ? (
                    <div className="posts-loading">載入�?..</div>
                ) : posts.length === 0 ? (
                    <div className="posts-empty">
                        <MessageSquare size={48} />
                        <p>目前沒有貼文</p>
                        <button onClick={() => setShowCreateModal(true)}>發表第一篇貼�?/button>
                    </div>
                ) : (
                    posts.map(post => (
                        <article
                            key={post.id}
                            className={`post-card ${post.isPinned ? 'pinned' : ''}`}
                            onClick={() => setSelectedPost(post)}
                        >
                            {post.isPinned && (
                                <div className="post-card__pin">
                                    <Pin size={12} /> 置頂
                                </div>
                            )}
                            <div className="post-card__header">
                                <div className="post-card__avatar">
                                    {post.authorName.charAt(0)}
                                </div>
                                <div className="post-card__meta">
                                    <span className="post-card__author">{post.authorName}</span>
                                    <span className="post-card__time">{formatTime(post.createdAt)}</span>
                                </div>
                                <span className={`post-card__category cat-${post.category}`}>
                                    {getCategoryInfo(post.category).emoji} {getCategoryInfo(post.category).label}
                                </span>
                            </div>

                            {post.title && (
                                <h3 className="post-card__title">{post.title}</h3>
                            )}

                            <p className="post-card__content">
                                {post.content.length > 200
                                    ? post.content.substring(0, 200) + '...'
                                    : post.content
                                }
                            </p>

                            {post.images && post.images.length > 0 && (
                                <div className="post-card__images">
                                    {post.images.slice(0, 3).map((img, i) => (
                                        <img key={i} src={img} alt="" />
                                    ))}
                                    {post.images.length > 3 && (
                                        <div className="post-card__more-images">
                                            +{post.images.length - 3}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="post-card__actions" onClick={e => e.stopPropagation()}>
                                <button
                                    className="action-btn"
                                    onClick={() => handleLike(post.id)}
                                >
                                    <Heart size={16} />
                                    {post.likeCount}
                                </button>
                                <button className="action-btn">
                                    <MessageSquare size={16} />
                                    {post.commentCount}
                                </button>
                                <span className="action-btn view-count">
                                    <Eye size={16} />
                                    {post.viewCount}
                                </span>
                            </div>
                        </article>
                    ))
                )}
            </div>

            {/* 發表貼文 Modal */}
            {showCreateModal && (
                <CreatePostModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        loadPosts();
                    }}
                    user={user}
                />
            )}

            {/* 貼文詳情 Modal */}
            {selectedPost && (
                <PostDetailModal
                    post={selectedPost}
                    onClose={() => setSelectedPost(null)}
                    user={user}
                    onLike={handleLike}
                />
            )}
        </div>
    );
}

// ===== 發表貼文 Modal =====
function CreatePostModal({
    onClose,
    onSuccess,
    user,
}: {
    onClose: () => void;
    onSuccess: () => void;
    user: any;
}) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<PostCategory>('general');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !user) return;

        try {
            setSubmitting(true);
            await createCommunityPost({
                authorId: user.id,
                authorName: user.displayName || user.email,
                title: title.trim() || undefined,
                content: content.trim(),
                category,
            });
            onSuccess();
        } catch (error) {
            console.error('Failed to create post:', error);
            alert('發表失敗，請稍後再試');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content create-post-modal" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>發表貼文</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </header>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>分類</label>
                        <div className="category-selector">
                            {CATEGORY_OPTIONS.map(cat => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    className={`category-option ${category === cat.value ? 'selected' : ''}`}
                                    onClick={() => setCategory(cat.value)}
                                >
                                    {cat.emoji} {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>標題（選填）</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="輸入標題..."
                            maxLength={200}
                        />
                    </div>

                    <div className="form-group">
                        <label>內容 *</label>
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="分享你的想法..."
                            rows={6}
                            required
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            取消
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={submitting || !content.trim()}
                        >
                            {submitting ? '發表�?..' : '發表'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ===== 貼文詳情 Modal =====
function PostDetailModal({
    post,
    onClose,
    user,
    onLike,
}: {
    post: CommunityPost;
    onClose: () => void;
    user: any;
    onLike: (postId: string) => void;
}) {
    const [comments, setComments] = useState<PostComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const getCategoryInfo = (category: PostCategory) => {
        return CATEGORY_OPTIONS.find(c => c.value === category) || CATEGORY_OPTIONS[0];
    };

    useEffect(() => {
        loadComments();
    }, [post.id]);

    const loadComments = async () => {
        try {
            setLoadingComments(true);
            const res = await getPostComments(post.id);
            setComments(res.data.data || []);
        } catch (error) {
            console.error('Failed to load comments:', error);
        } finally {
            setLoadingComments(false);
        }
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !user) return;

        try {
            setSubmitting(true);
            await createPostComment(post.id, {
                authorId: user.id,
                authorName: user.displayName || user.email,
                content: newComment.trim(),
            });
            setNewComment('');
            loadComments();
        } catch (error) {
            console.error('Failed to create comment:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content post-detail-modal" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <div className="post-detail__author">
                        <div className="avatar">{post.authorName.charAt(0)}</div>
                        <div>
                            <span className="name">{post.authorName}</span>
                            <span className="time">{new Date(post.createdAt).toLocaleString('zh-TW')}</span>
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </header>

                <div className="post-detail__content">
                    <span className={`post-card__category cat-${post.category}`}>
                        {getCategoryInfo(post.category).emoji} {getCategoryInfo(post.category).label}
                    </span>

                    {post.title && <h2>{post.title}</h2>}

                    <p>{post.content}</p>

                    {post.images && post.images.length > 0 && (
                        <div className="post-detail__images">
                            {post.images.map((img, i) => (
                                <img key={i} src={img} alt="" />
                            ))}
                        </div>
                    )}

                    <div className="post-detail__stats">
                        <button onClick={() => onLike(post.id)}>
                            <Heart size={18} /> {post.likeCount} �?
                        </button>
                        <span>
                            <MessageSquare size={18} /> {post.commentCount} 則留言
                        </span>
                        <span>
                            <Eye size={18} /> {post.viewCount} 次瀏覽
                        </span>
                    </div>
                </div>

                <div className="post-detail__comments">
                    <h3>留言 ({comments.length})</h3>

                    {loadingComments ? (
                        <p className="loading">載入留言�?..</p>
                    ) : comments.length === 0 ? (
                        <p className="empty">還沒有留言，來發表第一則吧�?/p>
                    ) : (
                        <div className="comments-list">
                            {comments.map(comment => (
                                <div key={comment.id} className="comment-item">
                                    <div className="comment-avatar">
                                        {comment.authorName.charAt(0)}
                                    </div>
                                    <div className="comment-content">
                                        <span className="comment-author">{comment.authorName}</span>
                                        <p>{comment.content}</p>
                                        <span className="comment-time">
                                            {new Date(comment.createdAt).toLocaleString('zh-TW')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {user && (
                        <form className="comment-form" onSubmit={handleSubmitComment}>
                            <input
                                type="text"
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                placeholder="寫下你的留言..."
                            />
                            <button
                                type="submit"
                                disabled={submitting || !newComment.trim()}
                            >
                                <Send size={18} />
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
