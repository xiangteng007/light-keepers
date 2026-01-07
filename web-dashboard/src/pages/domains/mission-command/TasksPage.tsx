import { useState, useEffect } from 'react';

interface Task { id: string; title: string; assignee: string; priority: 'high' | 'medium' | 'low'; status: 'pending' | 'in-progress' | 'completed'; dueDate: string; missionId: string; }

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        setTasks([
            { id: '1', title: 'Deploy rescue boats to Zone A', assignee: 'Team Alpha', priority: 'high', status: 'in-progress', dueDate: '2024-12-10', missionId: 'TW-KHH-330-001' },
            { id: '2', title: 'Set up emergency shelter', assignee: 'Team Bravo', priority: 'high', status: 'pending', dueDate: '2024-12-10', missionId: 'TW-KHH-330-001' },
            { id: '3', title: 'Coordinate with local authorities', assignee: 'Command HQ', priority: 'medium', status: 'completed', dueDate: '2024-12-09', missionId: 'TW-TPE-110-002' },
            { id: '4', title: 'Medical supplies distribution', assignee: 'Team Charlie', priority: 'medium', status: 'in-progress', dueDate: '2024-12-10', missionId: 'TW-NTP-220-003' },
        ]);
        setLoading(false);
    }, []);

    const getPriorityColor = (priority: string) => priority === 'high' ? 'text-red-400' : priority === 'medium' ? 'text-yellow-400' : 'text-green-400';
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500/20 text-yellow-400';
            case 'in-progress': return 'bg-blue-500/20 text-blue-400';
            case 'completed': return 'bg-green-500/20 text-green-400';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    };

    const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
    const stats = { total: tasks.length, pending: tasks.filter(t => t.status === 'pending').length, inProgress: tasks.filter(t => t.status === 'in-progress').length, completed: tasks.filter(t => t.status === 'completed').length };

    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-white">Task Management</h1><p className="text-gray-400">Track and manage mission tasks</p></div>
                <button className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400">Add Task</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"><p className="text-gray-400 text-sm">Total Tasks</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"><p className="text-gray-400 text-sm">Pending</p><p className="text-2xl font-bold text-yellow-400">{stats.pending}</p></div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"><p className="text-gray-400 text-sm">In Progress</p><p className="text-2xl font-bold text-blue-400">{stats.inProgress}</p></div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"><p className="text-gray-400 text-sm">Completed</p><p className="text-2xl font-bold text-green-400">{stats.completed}</p></div>
            </div>
            <div className="flex gap-2">
                {['all', 'pending', 'in-progress', 'completed'].map((status) => (
                    <button key={status} onClick={() => setFilter(status)} className={`px-4 py-2 rounded-lg capitalize ${filter === status ? 'bg-amber-500 text-black' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'}`}>
                        {status === 'all' ? 'All' : status.replace('-', ' ')}
                    </button>
                ))}
            </div>
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full">
                    <thead><tr className="border-b border-slate-700"><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Task</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Assignee</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Priority</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Due Date</th></tr></thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredTasks.map((task) => (
                            <tr key={task.id} className="hover:bg-slate-700/50">
                                <td className="px-6 py-4"><p className="text-white font-medium">{task.title}</p><p className="text-gray-400 text-xs">{task.missionId}</p></td>
                                <td className="px-6 py-4 text-gray-300">{task.assignee}</td>
                                <td className={`px-6 py-4 font-medium capitalize ${getPriorityColor(task.priority)}`}>{task.priority}</td>
                                <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs capitalize ${getStatusBadge(task.status)}`}>{task.status.replace('-', ' ')}</span></td>
                                <td className="px-6 py-4 text-gray-300">{task.dueDate}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
