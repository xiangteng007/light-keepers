import { useState, useEffect } from 'react';
// 保留 lucide（R5/T6 誠實清單）：MessageCircle（留言）、Share2（分享）
import { MessageCircle, Share2 } from 'lucide-react';
import { HeartIcon } from '../../../design-system/icons';
import { Button, Card, Tag } from '../../../design-system';
import EmptyState from '../../../components/shared/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton/Skeleton';
import './CommunityPage.css';

interface Post {
    id: string;
    author: string;
    authorRole: string;
    content: string;
    timestamp: string;
    likes: number;
    comments: number;
    category: 'announcement' | 'update' | 'discussion';
}

const CATEGORY_META: Record<Post['category'], { label: string; color: 'danger' | 'default' | 'success' }> = {
    announcement: { label: '公告', color: 'danger' },
    update: { label: '進度更新', color: 'default' },
    discussion: { label: '討論', color: 'success' },
};

export default function CommunityPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [newPost, setNewPost] = useState('');

    useEffect(() => {
        setPosts([
            { id: '1', author: 'Commander Chen', authorRole: 'Incident Commander', content: '緊急通知：三民區救援行動已進入第二階段，請所有待命人員準備出發。', timestamp: '15 分鐘前', likes: 24, comments: 8, category: 'announcement' },
            { id: '2', author: 'Team Lead Wang', authorRole: 'Field Operations', content: '已完成 Zone A 區域搜索，共救出 12 人，目前正在轉移至臨時安置點。', timestamp: '45 分鐘前', likes: 56, comments: 15, category: 'update' },
            { id: '3', author: 'Logistics Lin', authorRole: 'Supply Chain', content: '物資補給站已在信義區設立完畢，備有飲用水、食品、醫療用品。需要補給的團隊請前往。', timestamp: '1 小時前', likes: 32, comments: 5, category: 'update' },
        ]);
        setLoading(false);
    }, []);

    const handleSubmit = () => {
        if (!newPost.trim()) return;
        setPosts([
            {
                id: String(Date.now()),
                author: '我',
                authorRole: '志工',
                content: newPost,
                timestamp: '剛剛',
                likes: 0,
                comments: 0,
                category: 'discussion',
            },
            ...posts,
        ]);
        setNewPost('');
    };

    return (
        <div className="community-page">
            <header className="community-page__header">
                <h1>社群牆</h1>
                <p className="community-page__subtitle">團隊更新與公告</p>
            </header>

            <section className="community-composer" aria-label="發布更新">
                <textarea
                    className="community-composer__input"
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="與團隊分享最新狀況…"
                    rows={3}
                    aria-label="分享更新"
                />
                <div className="community-composer__actions">
                    <Button onClick={handleSubmit} disabled={!newPost.trim()}>發布</Button>
                </div>
            </section>

            <section className="community-page__panel" aria-label="貼文列表">
                {loading ? (
                    <div className="community-page__skeleton">
                        <Skeleton variant="card" count={3} height={140} />
                    </div>
                ) : posts.length === 0 ? (
                    <EmptyState title="尚無貼文" description="成為第一個分享更新的人" />
                ) : (
                    <ul className="community-feed" role="list">
                        {posts.map((post) => {
                            const meta = CATEGORY_META[post.category];
                            return (
                                <li key={post.id}>
                                    <Card padding="lg">
                                        <div className="community-post__head">
                                            <div className="community-post__author">
                                                <span className="community-post__avatar" aria-hidden="true">
                                                    {post.author.charAt(0)}
                                                </span>
                                                <div>
                                                    <p className="community-post__name">{post.author}</p>
                                                    <p className="community-post__role">
                                                        {post.authorRole} · {post.timestamp}
                                                    </p>
                                                </div>
                                            </div>
                                            <Tag color={meta.color}>{meta.label}</Tag>
                                        </div>
                                        <p className="community-post__content">{post.content}</p>
                                        <div className="community-post__actions">
                                            <button type="button" className="community-post__action">
                                                <HeartIcon size={16} aria-hidden="true" />
                                                <span className="tabular-nums">{post.likes}</span>
                                            </button>
                                            <button type="button" className="community-post__action">
                                                <MessageCircle size={16} aria-hidden="true" />
                                                <span className="tabular-nums">{post.comments}</span>
                                            </button>
                                            <button type="button" className="community-post__action">
                                                <Share2 size={16} aria-hidden="true" />
                                                分享
                                            </button>
                                        </div>
                                    </Card>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
}
