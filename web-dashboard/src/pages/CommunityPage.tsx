/**
 * 社群牆頁面
 * Community Wall Page
 *
 * R3b 重建（DESIGN_LANGUAGE.md）：List archetype。
 * page-header（h1 + 主要動作）→ 統計摘要列 → toolbar（分類篩選）→ content（貼文清單）。
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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
/* MessageSquare(留言)/Send(送出)/Pin(置頂) 無 B3c 對應，誠實保留（見 notes） */
import {
    MessageSquare,
    Send,
    Pin,
} from 'lucide-react';
import { Badge, Button, Card, InputField, Modal, StatIndicator } from '../design-system';
import {
    MoreIcon,
    SupportIcon,
    ExportIcon,
    CalendarIcon,
    SirenIcon,
    UserIcon,
    HeartIcon,
    PlusIcon,
    TeamsIcon,
    TrendUpIcon,
    EyeIcon,
    type LkIcon,
} from '../design-system/icons';
import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import './CommunityPage.css';

// 分類標籤（R5/T5c：B3c 教範圖例，不再使用 emoji）
const CATEGORY_OPTIONS: { value: PostCategory; label: string; Icon: LkIcon; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }[] = [
    { value: 'general', label: '一般討論', Icon: MoreIcon, variant: 'default' },
    { value: 'help', label: '求助', Icon: SupportIcon, variant: 'warning' },
    { value: 'share', label: '分享', Icon: ExportIcon, variant: 'success' },
    { value: 'event', label: '活動', Icon: CalendarIcon, variant: 'info' },
    { value: 'emergency', label: '緊急', Icon: SirenIcon, variant: 'danger' },
    { value: 'volunteer', label: '志工', Icon: UserIcon, variant: 'default' },
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // 格式化時間
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
            <header className="page-header">
                <div className="page-header__title-group">
                    <h1>社群牆</h1>
                    <p>與志工夥伴交流、分享經驗</p>
                </div>
                <Button variant="primary" icon={<PlusIcon size={18} aria-hidden="true" />} onClick={() => setShowCreateModal(true)}>
                    發表貼文
                </Button>
            </header>

            {/* 統計卡片 */}
            {stats && (
                <div className="community-stats">
                    <StatIndicator icon={<MessageSquare size={20} aria-hidden="true" />} value={stats.totalPosts} label="總貼文" />
                    <StatIndicator icon={<TrendUpIcon size={20} aria-hidden="true" />} value={stats.todayPosts} label="今日新增" />
                    <StatIndicator icon={<TeamsIcon size={20} aria-hidden="true" />} value={stats.topContributors?.length || 0} label="活躍貢獻者" />
                </div>
            )}

            {/* 分類篩選（toolbar） */}
            <div className="community-filter" role="toolbar" aria-label="貼文分類篩選">
                <button
                    className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('all')}
                    aria-pressed={selectedCategory === 'all'}
                >
                    全部
                </button>
                {CATEGORY_OPTIONS.map(cat => (
                    <button
                        key={cat.value}
                        className={`filter-btn ${selectedCategory === cat.value ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(cat.value)}
                        aria-pressed={selectedCategory === cat.value}
                    >
                        <cat.Icon size={16} aria-hidden="true" /> {cat.label}
                    </button>
                ))}
            </div>

            {/* 貼文列表 */}
            <div className="posts-list">
                {loading ? (
                    <div aria-busy="true" aria-label="載入中" className="posts-loading">
                        <Skeleton variant="card" height={140} count={3} className="posts-loading__row" />
                    </div>
                ) : posts.length === 0 ? (
                    <EmptyState
                        variant="default"
                        title="目前沒有貼文"
                        description="成為第一個分享想法的人吧！"
                        action={{ label: '發表第一篇貼文', onClick: () => setShowCreateModal(true) }}
                    />
                ) : (
                    posts.map(post => (
                        <Card
                            key={post.id}
                            padding="md"
                            hoverable
                            className={`post-card ${post.isPinned ? 'pinned' : ''}`}
                            onClick={() => setSelectedPost(post)}
                        >
                            {post.isPinned && (
                                <div className="post-card__pin">
                                    <Pin size={12} aria-hidden="true" /> 置頂
                                </div>
                            )}
                            <div className="post-card__header">
                                <div className="post-card__avatar" aria-hidden="true">
                                    {post.authorName.charAt(0)}
                                </div>
                                <div className="post-card__meta">
                                    <span className="post-card__author">{post.authorName}</span>
                                    <span className="post-card__time">{formatTime(post.createdAt)}</span>
                                </div>
                                <Badge variant={getCategoryInfo(post.category).variant} size="sm">
                                    {getCategoryInfo(post.category).label}
                                </Badge>
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
                                    className="action-btn action-btn--like"
                                    onClick={() => handleLike(post.id)}
                                    aria-label={`按讚，目前 ${post.likeCount} 個讚`}
                                >
                                    <HeartIcon size={16} aria-hidden="true" />
                                    {post.likeCount}
                                </button>
                                <button className="action-btn" aria-label={`留言，共 ${post.commentCount} 則`}>
                                    <MessageSquare size={16} aria-hidden="true" />
                                    {post.commentCount}
                                </button>
                                <span className="action-btn view-count" aria-label={`瀏覽 ${post.viewCount} 次`}>
                                    <EyeIcon size={16} aria-hidden="true" />
                                    {post.viewCount}
                                </span>
                            </div>
                        </Card>
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
        <Modal isOpen onClose={onClose} title="發表貼文" size="md">
            <form onSubmit={handleSubmit} className="create-post-form">
                <div className="form-group">
                    <label>分類</label>
                    <div className="category-selector">
                        {CATEGORY_OPTIONS.map(cat => (
                            <button
                                key={cat.value}
                                type="button"
                                className={`category-option ${category === cat.value ? 'selected' : ''}`}
                                onClick={() => setCategory(cat.value)}
                                aria-pressed={category === cat.value}
                            >
                                <cat.Icon size={16} aria-hidden="true" /> {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                <InputField
                    label="標題（選填）"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="輸入標題..."
                    maxLength={200}
                    fullWidth
                />

                <div className="form-group">
                    <label htmlFor="post-content">內容 *</label>
                    <textarea
                        id="post-content"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="分享你的想法..."
                        rows={6}
                        required
                    />
                </div>

                <div className="modal-actions">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        取消
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={submitting || !content.trim()}
                    >
                        {submitting ? '發表中...' : '發表'}
                    </Button>
                </div>
            </form>
        </Modal>
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <Modal isOpen onClose={onClose} title={post.title || '貼文詳情'} size="lg">
            <div className="post-detail">
                <div className="post-detail__author">
                    <div className="avatar" aria-hidden="true">{post.authorName.charAt(0)}</div>
                    <div>
                        <span className="name">{post.authorName}</span>
                        <span className="time">{new Date(post.createdAt).toLocaleString('zh-TW')}</span>
                    </div>
                </div>

                <div className="post-detail__content">
                    <Badge variant={getCategoryInfo(post.category).variant} size="sm">
                        {getCategoryInfo(post.category).label}
                    </Badge>

                    <p>{post.content}</p>

                    {post.images && post.images.length > 0 && (
                        <div className="post-detail__images">
                            {post.images.map((img, i) => (
                                <img key={i} src={img} alt="" />
                            ))}
                        </div>
                    )}

                    <div className="post-detail__stats">
                        <button onClick={() => onLike(post.id)} aria-label={`按讚，目前 ${post.likeCount} 個讚`}>
                            <HeartIcon size={18} aria-hidden="true" /> {post.likeCount} 讚
                        </button>
                        <span>
                            <MessageSquare size={18} aria-hidden="true" /> {post.commentCount} 則留言
                        </span>
                        <span>
                            <EyeIcon size={18} aria-hidden="true" /> {post.viewCount} 次瀏覽
                        </span>
                    </div>
                </div>

                <div className="post-detail__comments">
                    <h3>留言 ({comments.length})</h3>

                    {loadingComments ? (
                        <Skeleton variant="text" count={2} />
                    ) : comments.length === 0 ? (
                        <p className="empty">還沒有留言，來發表第一則吧！</p>
                    ) : (
                        <div className="comments-list">
                            {comments.map(comment => (
                                <div key={comment.id} className="comment-item">
                                    <div className="comment-avatar" aria-hidden="true">
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
                                aria-label="留言內容"
                            />
                            <button
                                type="submit"
                                disabled={submitting || !newComment.trim()}
                                aria-label="送出留言"
                            >
                                <Send size={18} aria-hidden="true" />
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </Modal>
    );
}
