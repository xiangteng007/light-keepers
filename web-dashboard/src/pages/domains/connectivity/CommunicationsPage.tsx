import { useState, useEffect } from 'react';

interface Channel { id: string; name: string; type: 'radio' | 'satellite' | 'mesh'; status: 'online' | 'offline' | 'degraded'; members: number; lastActivity: string; }
interface Message { id: string; channel: string; sender: string; content: string; timestamp: string; priority: 'normal' | 'urgent'; }

export default function CommunicationsPage() {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

    useEffect(() => {
        setChannels([
            { id: 'ch-1', name: 'Command Net', type: 'radio', status: 'online', members: 12, lastActivity: '2min ago' },
            { id: 'ch-2', name: 'Field Ops Alpha', type: 'radio', status: 'online', members: 8, lastActivity: '5min ago' },
            { id: 'ch-3', name: 'Satellite Link', type: 'satellite', status: 'degraded', members: 3, lastActivity: '15min ago' },
            { id: 'ch-4', name: 'Mesh Network', type: 'mesh', status: 'online', members: 24, lastActivity: '1min ago' },
        ]);
        setMessages([
            { id: '1', channel: 'ch-1', sender: 'Commander Chen', content: 'All teams report status.', timestamp: '14:32', priority: 'normal' },
            { id: '2', channel: 'ch-1', sender: 'Team Alpha', content: 'Alpha team in position at Zone A.', timestamp: '14:33', priority: 'normal' },
            { id: '3', channel: 'ch-1', sender: 'Team Bravo', content: 'Bravo requesting medical support at Zone B.', timestamp: '14:35', priority: 'urgent' },
        ]);
        setSelectedChannel('ch-1');
        setLoading(false);
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) { case 'online': return 'bg-green-500'; case 'degraded': return 'bg-yellow-500'; case 'offline': return 'bg-red-500'; default: return 'bg-gray-500'; }
    };

    const channelMessages = messages.filter(m => m.channel === selectedChannel);

    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-white">Communications Center</h1><p className="text-gray-400">Multi-channel communication management</p></div>
                <button className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400">+ New Channel</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/50"><p className="text-green-400 text-sm">Online</p><p className="text-2xl font-bold text-green-400">{channels.filter(c => c.status === 'online').length}</p></div>
                <div className="bg-yellow-500/20 rounded-lg p-4 border border-yellow-500/50"><p className="text-yellow-400 text-sm">Degraded</p><p className="text-2xl font-bold text-yellow-400">{channels.filter(c => c.status === 'degraded').length}</p></div>
                <div className="bg-red-500/20 rounded-lg p-4 border border-red-500/50"><p className="text-red-400 text-sm">Offline</p><p className="text-2xl font-bold text-red-400">{channels.filter(c => c.status === 'offline').length}</p></div>
                <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/50"><p className="text-blue-400 text-sm">Total Members</p><p className="text-2xl font-bold text-blue-400">{channels.reduce((sum, c) => sum + c.members, 0)}</p></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                    <h3 className="text-lg font-medium text-white mb-4">Channels</h3>
                    <div className="space-y-2">
                        {channels.map((ch) => (
                            <button key={ch.id} onClick={() => setSelectedChannel(ch.id)} className={`w-full p-3 rounded-lg text-left transition-colors ${selectedChannel === ch.id ? 'bg-amber-500/20 border-amber-500' : 'bg-slate-700/50 hover:bg-slate-700'} border border-slate-600`}>
                                <div className="flex items-center gap-2 mb-1"><div className={`w-2 h-2 rounded-full ${getStatusColor(ch.status)}`}></div><span className="text-white font-medium">{ch.name}</span></div>
                                <div className="flex justify-between text-xs text-gray-400"><span>{ch.type} • {ch.members} members</span><span>{ch.lastActivity}</span></div>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="lg:col-span-2 bg-slate-800/50 rounded-lg border border-slate-700 p-4 flex flex-col">
                    <h3 className="text-lg font-medium text-white mb-4">{channels.find(c => c.id === selectedChannel)?.name || 'Select a Channel'}</h3>
                    <div className="flex-1 space-y-3 overflow-y-auto max-h-96">
                        {channelMessages.map((msg) => (
                            <div key={msg.id} className={`p-3 rounded-lg ${msg.priority === 'urgent' ? 'bg-red-500/20 border border-red-500/50' : 'bg-slate-700/50'}`}>
                                <div className="flex justify-between mb-1"><span className="text-amber-400 font-medium">{msg.sender}</span><span className="text-gray-400 text-xs">{msg.timestamp}</span></div>
                                <p className="text-gray-200">{msg.content}</p>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-4"><input type="text" placeholder="Type a message..." className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" /><button className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400">Send</button></div>
                </div>
            </div>
        </div>
    );
}
