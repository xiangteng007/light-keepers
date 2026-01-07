import { useState } from 'react';

interface SettingSection { id: string; title: string; description: string; }

const sections: SettingSection[] = [
    { id: 'profile', title: 'Profile Settings', description: 'Manage your personal information' },
    { id: 'notifications', title: 'Notifications', description: 'Configure alert preferences' },
    { id: 'security', title: 'Security', description: 'Password and authentication settings' },
    { id: 'display', title: 'Display', description: 'Theme and layout preferences' },
];

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState('profile');
    const [theme, setTheme] = useState('dark');
    const [notifications, setNotifications] = useState({ email: true, push: true, sms: false });

    return (
        <div className="p-6 space-y-6">
            <div><h1 className="text-2xl font-bold text-white">Settings</h1><p className="text-gray-400">Manage your preferences</p></div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                    <nav className="space-y-1">
                        {sections.map((section) => (
                            <button key={section.id} onClick={() => setActiveSection(section.id)} className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${activeSection === section.id ? 'bg-amber-500 text-black' : 'text-gray-300 hover:bg-slate-700'}`}>
                                <p className="font-medium">{section.title}</p>
                                <p className={`text-sm ${activeSection === section.id ? 'text-black/70' : 'text-gray-400'}`}>{section.description}</p>
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="lg:col-span-3 bg-slate-800/50 rounded-lg border border-slate-700 p-6">
                    {activeSection === 'profile' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-white">Profile Settings</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-gray-400 text-sm mb-1">Display Name</label><input type="text" defaultValue="Admin User" className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" /></div>
                                <div><label className="block text-gray-400 text-sm mb-1">Email</label><input type="email" defaultValue="admin@lightkeepers.org" className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" /></div>
                                <div><label className="block text-gray-400 text-sm mb-1">Phone</label><input type="tel" defaultValue="+886 912 345 678" className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" /></div>
                                <div><label className="block text-gray-400 text-sm mb-1">Region</label><input type="text" defaultValue="North District" className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" /></div>
                            </div>
                            <button className="px-6 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400">Save Changes</button>
                        </div>
                    )}
                    {activeSection === 'notifications' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-white">Notification Preferences</h2>
                            <div className="space-y-4">
                                {Object.entries(notifications).map(([key, value]) => (
                                    <label key={key} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg cursor-pointer">
                                        <span className="text-white capitalize">{key} Notifications</span>
                                        <input type="checkbox" checked={value} onChange={() => setNotifications({ ...notifications, [key]: !value })} className="w-5 h-5 accent-amber-500" />
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeSection === 'security' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-white">Security Settings</h2>
                            <div className="space-y-4">
                                <div><label className="block text-gray-400 text-sm mb-1">Current Password</label><input type="password" className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" /></div>
                                <div><label className="block text-gray-400 text-sm mb-1">New Password</label><input type="password" className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" /></div>
                                <div><label className="block text-gray-400 text-sm mb-1">Confirm Password</label><input type="password" className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" /></div>
                            </div>
                            <button className="px-6 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400">Update Password</button>
                        </div>
                    )}
                    {activeSection === 'display' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-white">Display Settings</h2>
                            <div><p className="text-gray-400 mb-3">Theme</p><div className="flex gap-3">
                                <button onClick={() => setTheme('dark')} className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-amber-500 text-black' : 'bg-slate-700 text-gray-300'}`}>Dark</button>
                                <button onClick={() => setTheme('light')} className={`px-4 py-2 rounded-lg ${theme === 'light' ? 'bg-amber-500 text-black' : 'bg-slate-700 text-gray-300'}`}>Light</button>
                            </div></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
