import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Volunteer {
    id: string;
    name: string;
    email: string;
    status: 'active' | 'pending' | 'inactive';
    skills: string[];
    region: string;
    joinedAt: string;
    lastActive: string;
    avatar?: string;
}

interface VolunteerStats {
    total: number;
    active: number;
    pending: number;
    inactive: number;
}

export default function VolunteersPage() {
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [stats, setStats] = useState<VolunteerStats>({ total: 0, active: 0, pending: 0, inactive: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        const mockVolunteers: Volunteer[] = [
            {
                id: '1',
                name: 'Wang Daming',
                email: 'wang@example.com',
                status: 'active',
                skills: ['First Aid', 'Communications'],
                region: 'North',
                joinedAt: '2024-01-15',
                lastActive: '2024-12-01',
            },
            {
                id: '2',
                name: 'Lin Xiaohua',
                email: 'lin@example.com',
                status: 'active',
                skills: ['Driving', 'Search & Rescue'],
                region: 'South',
                joinedAt: '2024-03-20',
                lastActive: '2024-12-05',
            },
            {
                id: '3',
                name: 'Chen Zhiqiang',
                email: 'chen@example.com',
                status: 'pending',
                skills: ['Medical'],
                region: 'Central',
                joinedAt: '2024-11-10',
                lastActive: '2024-11-10',
            },
        ];

        setVolunteers(mockVolunteers);
        setStats({
            total: mockVolunteers.length,
            active: mockVolunteers.filter(v => v.status === 'active').length,
            pending: mockVolunteers.filter(v => v.status === 'pending').length,
            inactive: mockVolunteers.filter(v => v.status === 'inactive').length,
        });
        setLoading(false);
    }, []);

    const filteredVolunteers = volunteers.filter(volunteer => {
        const matchesSearch = volunteer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            volunteer.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || volunteer.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            active: 'bg-green-500',
            pending: 'bg-yellow-500',
            inactive: 'bg-gray-500',
        };
        const labels: Record<string, string> = {
            active: 'Active',
            pending: 'Pending',
            inactive: 'Inactive',
        };
        return (
            <span className={`px-2 py-1 text-xs rounded-full text-white ${colors[status]}`}>
                {labels[status]}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Volunteer Management</h1>
                    <p className="text-gray-400">Manage and view all volunteer data</p>
                </div>
                <Link
                    to="/volunteers/new"
                    className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors"
                >
                    Add Volunteer
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <p className="text-gray-400 text-sm">Total Volunteers</p>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <p className="text-gray-400 text-sm">Active</p>
                    <p className="text-2xl font-bold text-green-400">{stats.active}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <p className="text-gray-400 text-sm">Pending</p>
                    <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <p className="text-gray-400 text-sm">Inactive</p>
                    <p className="text-2xl font-bold text-gray-400">{stats.inactive}</p>
                </div>
            </div>

            <div className="flex gap-4">
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>

            <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-700">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Volunteer</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Skills</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Region</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Active</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredVolunteers.map((volunteer) => (
                            <tr key={volunteer.id} className="hover:bg-slate-700/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-black font-medium">
                                            {volunteer.name.charAt(0)}
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-white font-medium">{volunteer.name}</p>
                                            <p className="text-gray-400 text-sm">{volunteer.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {getStatusBadge(volunteer.status)}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {volunteer.skills.map((skill, index) => (
                                            <span key={index} className="px-2 py-0.5 text-xs bg-slate-600 rounded text-gray-300">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-300">{volunteer.region}</td>
                                <td className="px-6 py-4 text-gray-300">{volunteer.lastActive}</td>
                                <td className="px-6 py-4">
                                    <Link
                                        to={`/volunteers/${volunteer.id}`}
                                        className="text-amber-400 hover:text-amber-300"
                                    >
                                        View Details
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredVolunteers.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                        No volunteers found matching criteria
                    </div>
                )}
            </div>
        </div>
    );
}
