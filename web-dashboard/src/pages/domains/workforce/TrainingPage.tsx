import { useState, useEffect } from 'react';

interface TrainingCourse {
    id: string;
    title: string;
    description: string;
    instructor: string;
    duration: string;
    date: string;
    location: string;
    capacity: number;
    enrolled: number;
    status: 'upcoming' | 'ongoing' | 'completed';
}

export default function TrainingPage() {
    const [courses, setCourses] = useState<TrainingCourse[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        const mockData: TrainingCourse[] = [
            { id: '1', title: 'Basic First Aid', description: 'Learn essential first aid skills', instructor: 'Dr. Chen', duration: '4 hours', date: '2024-12-15', location: 'Training Center A', capacity: 30, enrolled: 25, status: 'upcoming' },
            { id: '2', title: 'CPR Certification', description: 'CPR and AED training course', instructor: 'Dr. Wang', duration: '6 hours', date: '2024-12-20', location: 'Training Center B', capacity: 20, enrolled: 18, status: 'upcoming' },
            { id: '3', title: 'Emergency Response', description: 'Advanced emergency response tactics', instructor: 'Commander Liu', duration: '8 hours', date: '2024-12-10', location: 'Main HQ', capacity: 40, enrolled: 40, status: 'ongoing' },
            { id: '4', title: 'Communications', description: 'Radio and communication protocols', instructor: 'Officer Zhang', duration: '3 hours', date: '2024-12-05', location: 'Training Center A', capacity: 25, enrolled: 22, status: 'completed' },
        ];
        setCourses(mockData);
        setLoading(false);
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'upcoming': return { bg: 'bg-blue-500', text: 'Upcoming' };
            case 'ongoing': return { bg: 'bg-green-500', text: 'Ongoing' };
            case 'completed': return { bg: 'bg-gray-500', text: 'Completed' };
            default: return { bg: 'bg-gray-500', text: status };
        }
    };

    const filteredCourses = filter === 'all' ? courses : courses.filter(c => c.status === filter);

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
                    <h1 className="text-2xl font-bold text-white">Training Center</h1>
                    <p className="text-gray-400">Manage training courses and certifications</p>
                </div>
                <button className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400">
                    Add Course
                </button>
            </div>

            <div className="flex gap-2">
                {['all', 'upcoming', 'ongoing', 'completed'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-lg capitalize ${filter === status ? 'bg-amber-500 text-black' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                            }`}
                    >
                        {status === 'all' ? 'All' : status}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCourses.map((course) => {
                    const badge = getStatusBadge(course.status);
                    const progressPercent = Math.round((course.enrolled / course.capacity) * 100);
                    return (
                        <div key={course.id} className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-lg font-medium text-white">{course.title}</h3>
                                <span className={`px-2 py-1 text-xs rounded-full text-white ${badge.bg}`}>
                                    {badge.text}
                                </span>
                            </div>
                            <p className="text-gray-400 text-sm mb-4">{course.description}</p>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Instructor</span>
                                    <span className="text-white">{course.instructor}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Duration</span>
                                    <span className="text-white">{course.duration}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Date</span>
                                    <span className="text-white">{course.date}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Location</span>
                                    <span className="text-white">{course.location}</span>
                                </div>
                            </div>
                            <div className="mt-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-400">Enrollment</span>
                                    <span className="text-white">{course.enrolled}/{course.capacity}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div
                                        className="bg-amber-500 h-2 rounded-full"
                                        style={{ width: `${progressPercent}%` }}
                                    ></div>
                                </div>
                            </div>
                            {course.status === 'upcoming' && course.enrolled < course.capacity && (
                                <button className="w-full mt-4 px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400">
                                    Enroll
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
