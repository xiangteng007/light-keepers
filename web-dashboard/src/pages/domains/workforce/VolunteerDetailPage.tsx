import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

interface VolunteerDetail {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: 'available' | 'busy' | 'offline';
    skills: string[];
    region: string;
    address: string;
    joinedAt: string;
    totalHours: number;
    missionsCompleted: number;
    certifications: string[];
}

export default function VolunteerDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [volunteer, setVolunteer] = useState<VolunteerDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const mockData: VolunteerDetail = {
            id: id || '1',
            name: 'Wang Daming',
            email: 'wang@example.com',
            phone: '0912-345-678',
            status: 'available',
            skills: ['First Aid', 'CPR', 'Communications', 'Driving'],
            region: 'North District',
            address: 'No. 123, Example Road, Taipei',
            joinedAt: '2024-01-15',
            totalHours: 156,
            missionsCompleted: 23,
            certifications: ['Basic First Aid', 'CPR Level 2', 'Emergency Response'],
        };
        setVolunteer(mockData);
        setLoading(false);
    }, [id]);

    if (loading || !volunteer) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available': return 'bg-green-500';
            case 'busy': return 'bg-yellow-500';
            case 'offline': return 'bg-gray-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Link to="/volunteers" className="text-gray-400 hover:text-white">
                    ← Back to Volunteers
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 text-center">
                        <div className="w-24 h-24 rounded-full bg-amber-500 mx-auto mb-4 flex items-center justify-center text-black text-3xl font-bold">
                            {volunteer.name.charAt(0)}
                        </div>
                        <h2 className="text-xl font-bold text-white">{volunteer.name}</h2>
                        <span className={`inline-block px-3 py-1 mt-2 text-sm rounded-full text-white ${getStatusColor(volunteer.status)}`}>
                            {volunteer.status.charAt(0).toUpperCase() + volunteer.status.slice(1)}
                        </span>
                        <div className="mt-4 text-gray-400 text-sm">
                            <p>{volunteer.email}</p>
                            <p>{volunteer.phone}</p>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 mt-4">
                        <h3 className="text-lg font-medium text-white mb-4">Statistics</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Total Hours</span>
                                <span className="text-white font-medium">{volunteer.totalHours}h</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Missions Completed</span>
                                <span className="text-white font-medium">{volunteer.missionsCompleted}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Joined</span>
                                <span className="text-white">{volunteer.joinedAt}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
                        <h3 className="text-lg font-medium text-white mb-4">Skills</h3>
                        <div className="flex flex-wrap gap-2">
                            {volunteer.skills.map(skill => (
                                <span key={skill} className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-sm">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
                        <h3 className="text-lg font-medium text-white mb-4">Certifications</h3>
                        <div className="space-y-2">
                            {volunteer.certifications.map(cert => (
                                <div key={cert} className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    <span className="text-gray-300">{cert}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
                        <h3 className="text-lg font-medium text-white mb-4">Location</h3>
                        <p className="text-gray-300">{volunteer.address}</p>
                        <p className="text-gray-400 text-sm mt-1">Region: {volunteer.region}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
