import React from 'react';
import {
    AlertTriangle,
    Package,
    Users,
    MoreHorizontal,
    MapPin,
    Activity,
    Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TacticalPanel } from '../components/ui/TacticalPanel';
import './DashboardPage.css';

export default function DashboardPage() {
    const { user } = useAuth();

    // Mock Data for Bento Grid
    const ALERTS = [
        { id: 1, type: 'critical', title: 'FIRE: Sector 4', time: '14:25 UTC', desc: 'New Seismic Activity Detected' },
        { id: 2, type: 'warning', title: 'FLOOD: Downtown', time: '14:15 UTC', desc: 'Levee Breach Reported' },
        { id: 3, type: 'info', title: 'MED: Team Alpha', time: '13:45 UTC', desc: 'Resource Request: Medical Supplies' },
    ];

    const RESOURCES = [
        { label: 'Vehicles', value: '45/50', percent: 90, color: 'text-neon-cyan', icon: Activity },
        { label: 'Personnel', value: '320', percent: 80, color: 'text-neon-amber', icon: Users },
        { label: 'Supplies', value: 'OK', percent: 60, color: 'text-neon-success', icon: Package },
    ];

    return (
        <div className="bento-dashboard bg-grid-pattern bg-tactical-app">
            {/* Widget 1: Operational Picture (Map) */}
            <TacticalPanel
                className="grid-area-map overflow-hidden p-0 border-tactical-border/50"
                noPadding
                title="OPERATIONAL PICTURE"
                action={<button className="text-slate-400 hover:text-white"><MoreHorizontal size={16} /></button>}
            >
                <div className="relative w-full h-full">
                    {/* Map Background with Grid */}
                    <div className="absolute inset-0 bg-[#0B1120] opacity-80 z-0">
                        {/* Grid Lines Overlay */}
                        <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
                    </div>

                    {/* Map UI Overlay */}
                    <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-tactical-gold font-mono text-xs">
                            <MapPin size={12} />
                            <span>LAT: 25.0330 N / LON: 121.5654 E</span>
                        </div>
                    </div>

                    {/* Map Markers (Simulated) */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="relative">
                            <div className="w-4 h-4 rounded-full bg-red-500/50 animate-ping absolute"></div>
                            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-[0_0_20px_rgba(239,68,68,0.8)] z-10 relative"></div>
                            <div className="absolute left-6 top-[-4px] bg-black/80 border border-red-500/50 px-2 py-0.5 text-[10px] text-red-400 font-mono whitespace-nowrap backdrop-blur-sm">
                                CRITICAL: SEISMIC
                            </div>
                        </div>
                    </div>

                    {/* Map Controls */}
                    <div className="absolute bottom-4 left-4 flex gap-2 z-10">
                        <button className="v2-btn v2-btn--primary text-xs py-1">DEPLOY UNIT</button>
                        <button className="v2-btn text-xs py-1">LAYERS</button>
                    </div>
                </div>
            </TacticalPanel>

            {/* Widget 2: Active Alerts - Styling Gap 2: Critical Variant */}
            <TacticalPanel
                className="grid-area-alerts"
                variant="critical"
                title="ACTIVE ALERTS"
                action={<div className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded border border-red-500/30">3 CRITICAL</div>}
            >
                <div className="flex flex-col gap-2 h-full overflow-y-auto pr-1 custom-scrollbar">
                    {ALERTS.map(alert => (
                        <div key={alert.id} className="p-3 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-colors group cursor-pointer relative overflow-hidden">
                            {/* Side Accent */}
                            <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${alert.type === 'critical' ? 'bg-red-500' : alert.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />

                            <div className="flex justify-between items-start mb-1 pl-2">
                                <span className={`text-[11px] font-bold tracking-wide uppercase ${alert.type === 'critical' ? 'text-red-400' : alert.type === 'warning' ? 'text-amber-400' : 'text-blue-400'}`}>
                                    {alert.title}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">{alert.time}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 pl-2 leading-tight">{alert.desc}</div>
                        </div>
                    ))}
                </div>
            </TacticalPanel>

            {/* Widget 3: Logistics - Styling Gap 1: Standard Matte Glass */}
            <TacticalPanel
                className="grid-area-stats"
                variant="alert"
                title="LOGISTICS & SUPPLY"
            >
                <div className="flex flex-col justify-around h-full gap-4">
                    {RESOURCES.map((res, i) => (
                        <div key={i} className="flex items-center gap-4 border-b border-white/5 pb-2 last:border-0">
                            {/* Circular Chart Placeholder */}
                            <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,0.05)" strokeWidth="3" fill="transparent" />
                                    <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="transparent" strokeDasharray={`${res.percent} 100`} className={res.color} />
                                </svg>
                                <span className="absolute text-[9px] font-mono">{res.percent}%</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{res.label}</div>
                                <div className="text-sm font-bold font-mono text-slate-200">{res.value}</div>
                            </div>
                        </div>
                    ))}
                    <button className="v2-btn w-full mt-auto text-[10px] py-1.5 opacity-80 hover:opacity-100">MANAGE RESOURCES</button>
                </div>
            </TacticalPanel>

            {/* Widget 4: Team Status */}
            <TacticalPanel
                className="grid-area-team"
                title="UNIT STATUS"
            >
                <div className="grid grid-cols-2 gap-2 h-full content-start">
                    {['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA'].map((team, i) => (
                        <div key={i} className="bg-white/5 p-2 border border-white/5 flex flex-col hover:bg-white/10 transition-colors">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold text-slate-300 tracking-wider">{team}</span>
                                <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}></div>
                            </div>
                            <div className="text-[9px] text-slate-500 font-mono uppercase">
                                {i === 0 ? 'ENGAGED' : 'STANDBY'}
                            </div>
                        </div>
                    ))}
                </div>
            </TacticalPanel>
        </div>
    );
}
