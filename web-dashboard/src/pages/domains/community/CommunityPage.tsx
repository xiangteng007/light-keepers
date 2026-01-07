import { useState, useEffect } from 'react';

interface Post { id: string; author: string; authorRole: string; content: string; timestamp: string; likes: number; comments: number; category: 'announcement' | 'update' | 'discussion'; }

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

    const handleSubmit = () => { if (newPost.trim()) { setPosts([{ id: String(Date.now()), author: 'You', authorRole: 'Volunteer', content: newPost, timestamp: 'Just now', likes: 0, comments: 0, category: 'discussion' }, ...posts]); setNewPost(''); } };

    const getCategoryBadge = (category: string) => {
        switch (category) {
            case 'announcement': return 'bg-red-500/20 text-red-400';
            case 'update': return 'bg-blue-500/20 text-blue-400';
            case 'discussion': return 'bg-green-500/20 text-green-400';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>;

    return (
        <div className="p-6 space-y-6">
            <div><h1 className="text-2xl font-bold text-white">Community Wall</h1><p className="text-gray-400">Team updates and announcements</p></div>
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                <textarea value={newPost} onChange={(e) => setNewPost(e.target.value)} placeholder="Share an update with your team..." className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white resize-none" rows={3} />
                <div className="flex justify-end mt-3"><button onClick={handleSubmit} disabled={!newPost.trim()} className="px-6 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed">Post</button></div>
            </div>
            <div className="space-y-4">
                {posts.map((post) => (
                    <div key={post.id} className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-black font-bold">{post.author.charAt(0)}</div>
                                <div><p className="text-white font-medium">{post.author}</p><p className="text-gray-400 text-sm">{post.authorRole} • {post.timestamp}</p></div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs capitalize ${getCategoryBadge(post.category)}`}>{post.category}</span>
                        </div>
                        <p className="text-gray-200 mb-4">{post.content}</p>
                        <div className="flex gap-4 text-sm text-gray-400">
                            <button className="flex items-center gap-1 hover:text-amber-400">❤️ {post.likes}</button>
                            <button className="flex items-center gap-1 hover:text-amber-400">💬 {post.comments}</button>
                            <button className="hover:text-amber-400">Share</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
