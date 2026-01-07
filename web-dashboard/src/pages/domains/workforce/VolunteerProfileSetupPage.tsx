import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ProfileFormData {
    name: string;
    email: string;
    phone: string;
    region: string;
    skills: string[];
    availability: string[];
}

const SKILL_OPTIONS = ['First Aid', 'CPR', 'Communications', 'Driving', 'Search & Rescue', 'Medical', 'Logistics', 'Translation', 'IT Support'];
const AVAILABILITY_OPTIONS = ['Weekday Mornings', 'Weekday Afternoons', 'Weekday Evenings', 'Weekend Mornings', 'Weekend Afternoons', 'Weekend Evenings', '24/7 Emergency'];
const REGION_OPTIONS = ['North District', 'South District', 'East District', 'West District', 'Central District'];

export default function VolunteerProfileSetupPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<ProfileFormData>({
        name: '', email: '', phone: '', region: '', skills: [], availability: [],
    });

    const handleInputChange = (field: keyof ProfileFormData, value: string) => {
        setFormData({ ...formData, [field]: value });
    };

    const toggleArrayItem = (field: 'skills' | 'availability', item: string) => {
        const current = formData[field];
        const updated = current.includes(item) ? current.filter(i => i !== item) : [...current, item];
        setFormData({ ...formData, [field]: updated });
    };

    const handleSubmit = async () => {
        setSaving(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setSaving(false);
        navigate('/volunteers');
    };

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Volunteer Profile Setup</h1>
                <p className="text-gray-400">Complete your profile to get started</p>
            </div>

            <div className="flex items-center justify-between mb-8">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${s <= step ? 'bg-amber-500 text-black' : 'bg-slate-700 text-gray-400'}`}>
                            {s}
                        </div>
                        {s < 3 && <div className={`w-20 h-1 mx-2 ${s < step ? 'bg-amber-500' : 'bg-slate-700'}`} />}
                    </div>
                ))}
            </div>

            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 mb-6">
                {step === 1 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-white">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Full Name</label>
                                <input type="text" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="Enter your name" />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Email</label>
                                <input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="Enter your email" />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Phone</label>
                                <input type="tel" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="Enter your phone" />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1" htmlFor="region-select">Region</label>
                                <select id="region-select" value={formData.region} onChange={(e) => handleInputChange('region', e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                                    <option value="">Select region</option>
                                    {REGION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}
                {step === 2 && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-white mb-3">Skills</h3>
                            <div className="flex flex-wrap gap-2">
                                {SKILL_OPTIONS.map(skill => (
                                    <button key={skill} type="button" onClick={() => toggleArrayItem('skills', skill)} className={`px-3 py-2 rounded-lg text-sm ${formData.skills.includes(skill) ? 'bg-amber-500 text-black' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}>
                                        {skill}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-white mb-3">Availability</h3>
                            <div className="flex flex-wrap gap-2">
                                {AVAILABILITY_OPTIONS.map(time => (
                                    <button key={time} type="button" onClick={() => toggleArrayItem('availability', time)} className={`px-3 py-2 rounded-lg text-sm ${formData.availability.includes(time) ? 'bg-amber-500 text-black' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}>
                                        {time}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                {step === 3 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-white">Review</h3>
                        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 grid grid-cols-2 gap-2 text-sm">
                            <p className="text-gray-400">Name:</p><p className="text-white">{formData.name || '-'}</p>
                            <p className="text-gray-400">Email:</p><p className="text-white">{formData.email || '-'}</p>
                            <p className="text-gray-400">Phone:</p><p className="text-white">{formData.phone || '-'}</p>
                            <p className="text-gray-400">Region:</p><p className="text-white">{formData.region || '-'}</p>
                            <p className="text-gray-400">Skills:</p><p className="text-white">{formData.skills.join(', ') || '-'}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-between">
                <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50">Previous</button>
                {step < 3 ? (
                    <button onClick={() => setStep(Math.min(3, step + 1))} className="px-6 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400">Next</button>
                ) : (
                    <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-400 disabled:opacity-50">{saving ? 'Saving...' : 'Complete'}</button>
                )}
            </div>
        </div>
    );
}
