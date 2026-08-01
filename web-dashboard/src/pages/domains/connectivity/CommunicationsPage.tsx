import { useState, useEffect } from 'react';
import { Radio, Satellite, Wifi, Send, Plus, Users } from 'lucide-react';
import { Button, Badge } from '../../../design-system';
import { StatIndicator } from '../../../design-system/components/Indicators';
import EmptyState from '../../../components/shared/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton/Skeleton';
import './CommunicationsPage.css';

interface Channel {
    id: string;
    name: string;
    type: 'radio' | 'satellite' | 'mesh';
    status: 'online' | 'offline' | 'degraded';
    members: number;
    lastActivity: string;
}

interface Message {
    id: string;
    channel: string;
    sender: string;
    content: string;
    timestamp: string;
    priority: 'normal' | 'urgent';
}

const TYPE_ICON: Record<Channel['type'], typeof Radio> = {
    radio: Radio,
    satellite: Satellite,
    mesh: Wifi,
};

const TYPE_LABEL: Record<Channel['type'], string> = {
    radio: '無線電',
    satellite: '衛星',
    mesh: '網狀網路',
};

function ChannelStatusBadge({ status }: { status: Channel['status'] }) {
    if (status === 'online') return <Badge variant="success" dot size="xs">上線</Badge>;
    if (status === 'degraded') return <Badge variant="warning" dot size="xs">降級</Badge>;
    return <Badge variant="danger" dot size="xs">離線</Badge>;
}

export default function CommunicationsPage() {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
    const [draft, setDraft] = useState('');

    useEffect(() => {
        setChannels([
            { id: 'ch-1', name: 'Command Net', type: 'radio', status: 'online', members: 12, lastActivity: '2 分鐘前' },
            { id: 'ch-2', name: 'Field Ops Alpha', type: 'radio', status: 'online', members: 8, lastActivity: '5 分鐘前' },
            { id: 'ch-3', name: 'Satellite Link', type: 'satellite', status: 'degraded', members: 3, lastActivity: '15 分鐘前' },
            { id: 'ch-4', name: 'Mesh Network', type: 'mesh', status: 'online', members: 24, lastActivity: '1 分鐘前' },
        ]);
        setMessages([
            { id: '1', channel: 'ch-1', sender: 'Commander Chen', content: 'All teams report status.', timestamp: '14:32', priority: 'normal' },
            { id: '2', channel: 'ch-1', sender: 'Team Alpha', content: 'Alpha team in position at Zone A.', timestamp: '14:33', priority: 'normal' },
            { id: '3', channel: 'ch-1', sender: 'Team Bravo', content: 'Bravo requesting medical support at Zone B.', timestamp: '14:35', priority: 'urgent' },
        ]);
        setSelectedChannel('ch-1');
        setLoading(false);
    }, []);

    const channelMessages = messages.filter((m) => m.channel === selectedChannel);
    const selected = channels.find((c) => c.id === selectedChannel);

    const sendMessage = () => {
        if (!draft.trim() || !selectedChannel) return;
        setMessages((prev) => [
            ...prev,
            {
                id: `${Date.now()}`,
                channel: selectedChannel,
                sender: '我',
                content: draft.trim(),
                timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
                priority: 'normal',
            },
        ]);
        setDraft('');
    };

    return (
        <div className="comms-page">
            <header className="comms-page__header">
                <div>
                    <h1>通訊中心</h1>
                    <p className="comms-page__subtitle">多頻道通訊管理</p>
                </div>
                <Button icon={<Plus size={18} aria-hidden="true" />}>新增頻道</Button>
            </header>

            <div className="comms-page__stats" role="list">
                <StatIndicator
                    variant="success"
                    label="上線"
                    value={loading ? '—' : channels.filter((c) => c.status === 'online').length}
                />
                <StatIndicator
                    variant="warning"
                    label="降級"
                    value={loading ? '—' : channels.filter((c) => c.status === 'degraded').length}
                />
                <StatIndicator
                    variant="danger"
                    label="離線"
                    value={loading ? '—' : channels.filter((c) => c.status === 'offline').length}
                />
                <StatIndicator
                    icon={<Users size={18} aria-hidden="true" />}
                    label="總人數"
                    value={loading ? '—' : channels.reduce((sum, c) => sum + c.members, 0)}
                />
            </div>

            <div className="comms-page__body">
                <section className="comms-page__panel comms-page__channels" aria-label="頻道列表">
                    <h2 className="comms-page__panel-title">頻道</h2>
                    {loading ? (
                        <div className="comms-page__skeleton">
                            <Skeleton variant="text" count={4} height={56} />
                        </div>
                    ) : channels.length === 0 ? (
                        <EmptyState variant="minimal" title="尚無頻道" description="建立第一個通訊頻道" />
                    ) : (
                        <ul className="comms-channel-list" role="list">
                            {channels.map((ch) => {
                                const Icon = TYPE_ICON[ch.type];
                                const active = selectedChannel === ch.id;
                                return (
                                    <li key={ch.id}>
                                        <button
                                            type="button"
                                            className={`comms-channel ${active ? 'comms-channel--active' : ''}`}
                                            aria-pressed={active}
                                            onClick={() => setSelectedChannel(ch.id)}
                                        >
                                            <span className="comms-channel__top">
                                                <Icon size={16} aria-hidden="true" />
                                                <span className="comms-channel__name">{ch.name}</span>
                                                <ChannelStatusBadge status={ch.status} />
                                            </span>
                                            <span className="comms-channel__meta">
                                                <span>{TYPE_LABEL[ch.type]} · {ch.members} 人</span>
                                                <span className="tabular-nums">{ch.lastActivity}</span>
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                <section className="comms-page__panel comms-page__thread" aria-label="訊息串">
                    <h2 className="comms-page__panel-title">{selected?.name ?? '請選擇頻道'}</h2>
                    <div className="comms-thread">
                        {loading ? (
                            <div className="comms-page__skeleton">
                                <Skeleton variant="text" count={3} height={48} />
                            </div>
                        ) : channelMessages.length === 0 ? (
                            <EmptyState variant="minimal" title="尚無訊息" description="這個頻道還沒有訊息" />
                        ) : (
                            channelMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`comms-message ${msg.priority === 'urgent' ? 'comms-message--urgent' : ''}`}
                                >
                                    <div className="comms-message__head">
                                        <span className="comms-message__sender">{msg.sender}</span>
                                        {msg.priority === 'urgent' && <Badge variant="danger" size="xs">緊急</Badge>}
                                        <span className="comms-message__time tabular-nums">{msg.timestamp}</span>
                                    </div>
                                    <p className="comms-message__content">{msg.content}</p>
                                </div>
                            ))
                        )}
                    </div>
                    <form
                        className="comms-composer"
                        onSubmit={(e) => {
                            e.preventDefault();
                            sendMessage();
                        }}
                    >
                        <input
                            type="text"
                            className="comms-composer__input"
                            placeholder="輸入訊息…"
                            aria-label="輸入訊息"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            disabled={!selectedChannel}
                        />
                        <Button type="submit" icon={<Send size={16} aria-hidden="true" />} disabled={!selectedChannel || !draft.trim()}>
                            傳送
                        </Button>
                    </form>
                </section>
            </div>
        </div>
    );
}
