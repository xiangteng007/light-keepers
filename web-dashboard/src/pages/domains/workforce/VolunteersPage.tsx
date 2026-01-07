import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Volunteer {
    id: string;
    name: string;
    email: string;
    status: 'available' | 'busy' | 'offline';
    skills: string[];
    region: string;
    joinedAt: string;
}

export default function VolunteersPage() {
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const mockData: Volunteer[] = [
            { id: '1', name: 'Wang Daming', email: 'wang@example.com', status: 'available', skills: ['First Aid', 'CPR'], region: 'North', joinedAt: '2024-01-15' },
            { id: '2', name: 'Lin Xiaohua', email: 'lin@example.com', status: 'busy', skills: ['Driving', 'Logistics'], region: 'South', joinedAt: '2024-02-20' },
            { id: '3', name: 'Chen Zhiqiang', email: 'chen@example.com', status: 'offline', skills: ['Medical', 'Search'], region: 'East', joinedAt: '2024-03-10' },
            { id: '4', name: 'Zhang Wei', email: 'zhang@example.com', status: 'available', skills: ['Communications'], region: 'West', joinedAt: '2024-04-05' },
            { id: '5', name: 'Liu Ming', email: 'liu@example.com', status: 'available', skills: ['IT Support', 'Translation'], region: 'Central', joinedAt: '2024-05-12' },
        ];
        setVolunteers(mockData);
        setLoading(false);
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available': return 'bg-green-500';
            case 'busy': return 'bg-yellow-500';
            case 'offline': return 'bg-gray-500';
            default: return 'bg-gray-500';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'available': return 'Available';
            case 'busy': return 'Busy';
            case 'offline': return 'Offline';
            default: return status;
        }
    };

    const filteredVolunteers = volunteers.filter(v => {
        const matchesFilter = filter === 'all' || v.status === filter;
        const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.email.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

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
                    <p className="text-gray-400">Manage and track volunteer information</p>
                </div>
                <Link to="/volunteers/new" className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400">
                    Add Volunteer
                </Link>
            </div>

            <div className="flex gap-4 flex-wrap">
                <input
                    type="text"
                    placeholder="Search volunteers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white flex-1 min-w-64"
                />
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    title="Filter by status"
                >
                    <option value="all">All Status</option>
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="offline">Offline</option>
                </select>
            </div>

            <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-700">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Skills</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Region</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredVolunteers.map((volunteer) => (
                            <tr key={volunteer.id} className="hover:bg-slate-700/50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-black font-medium text-sm">
                                            {volunteer.name.charAt(0)}
                                        </div>
                                        <span className="ml-3 text-white font-medium">{volunteer.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-300">{volunteer.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs rounded-full text-white ${getStatusColor(volunteer.status)}`}>
                                        {getStatusText(volunteer.status)}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-1 flex-wrap">
                                        {volunteer.skills.slice(0, 2).map(skill => (
                                            <span key={skill} className="px-2 py-0.5 bg-slate-700 text-gray-300 text-xs rounded">
                                                {skill}
                                            </span>
                                        ))}
                                        {volunteer.skills.length > 2 && (
                                            <span className="text-gray-400 text-xs">+{volunteer.skills.length - 2}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-300">{volunteer.region}</td>
                                <td className="px-6 py-4">
                                    <Link to={`/volunteers/${volunteer.id}`} className="text-amber-400 hover:text-amber-300 text-sm">
                                        View
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
