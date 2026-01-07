import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin } from '../api/services';
import { Lock, ChevronRight, ShieldCheck, Activity, AlertTriangle } from 'lucide-react';
import '../styles/globals.css';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    // Local state for implementation
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // 1. Call API to get token
            const response = await apiLogin(email, password);

            // 2. Pass token to AuthContext
            if (response.data && response.data.accessToken) {
                await login(response.data.accessToken);
                navigate('/dashboard');
            } else {
                throw new Error('No access token received');
            }
        } catch (err: any) {
            console.error('Login failed:', err);
            setError('ACCESS DENIED: Invalid credentials');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen w-full bg-[#0F1218] flex items-center justify-center relative font-sans selection:bg-[#C39B6F] selection:text-[#0F1218]"
            style={{
                minHeight: '100vh',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            {/* Background Texture & Gradient - Absolutely positioned to not affect flow */}
            <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-[#0F1218]/80 via-transparent to-[#0F1218] pointer-events-none"></div>

            {/* Ambient Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#1D2635] blur-[120px] rounded-full opacity-20 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#C39B6F]/5 blur-[150px] rounded-full pointer-events-none mix-blend-screen"></div>

            {/* Login Glass Panel - Centered by flex container */}
            <div className="relative z-10 w-full max-w-md p-8">
                {/* Tactical Card Container */}
                <div className="relative bg-[#0F1218]/90 backdrop-blur-xl border border-[#2F3641] rounded-lg shadow-2xl overflow-hidden group">

                    {/* Corner Decorators (SVG) */}
                    <div className="absolute top-0 left-0 p-3 opacity-80">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M2 22V2H22" stroke="#C39B6F" strokeWidth="2" strokeLinecap="square" />
                        </svg>
                    </div>
                    <div className="absolute top-0 right-0 p-3 opacity-80">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="rotate-90">
                            <path d="M2 22V2H22" stroke="#C39B6F" strokeWidth="2" strokeLinecap="square" />
                        </svg>
                    </div>
                    <div className="absolute bottom-0 left-0 p-3 opacity-80">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="-rotate-90">
                            <path d="M2 22V2H22" stroke="#C39B6F" strokeWidth="2" strokeLinecap="square" />
                        </svg>
                    </div>
                    <div className="absolute bottom-0 right-0 p-3 opacity-80">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="rotate-180">
                            <path d="M2 22V2H22" stroke="#C39B6F" strokeWidth="2" strokeLinecap="square" />
                        </svg>
                    </div>

                    {/* Panel Header */}
                    <div className="flex flex-col items-center pt-12 pb-6 px-8 border-b border-[#2F3641]/50 bg-[#13171F]/50">
                        {/* Status Badge */}
                        <div className="flex items-center gap-2 mb-6 px-3 py-1 bg-[#0B1120] border border-[#2F3641] rounded-full shadow-[0_0_10px_rgba(195,155,111,0.1)]">
                            <ShieldCheck size={14} className="text-[#C39B6F]" />
                            <span className="text-[10px] font-mono text-[#C39B6F] tracking-widest uppercase relative top-[1px]">
                                System Status: SECURE
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl font-bold text-white tracking-[0.2em] mb-2 font-sans relative text-center">
                            LIGHT KEEPERS
                            <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-24 h-[2px] bg-gradient-to-r from-transparent via-[#C39B6F] to-transparent"></span>
                        </h1>
                        <p className="text-xs text-gray-500 font-mono tracking-wider mt-3">
                            曦望燈塔資訊管理平台
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="px-8 py-10 relative">
                        {/* Scanline Effect Overlay (Subtle) */}
                        <div className="absolute inset-0 bg-[url('/scanline.png')] opacity-5 pointer-events-none mix-blend-overlay"></div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-mono p-3 rounded flex items-center gap-2 mb-6 animate-in fade-in slide-in-from-top-2">
                                <AlertTriangle size={14} />
                                {error}
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-[10px] text-gray-400 font-mono tracking-wider uppercase pl-1 mb-2">
                                Operator ID (Email)
                            </label>
                            <div className="relative group/input">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="ENTER ID..."
                                    className="w-full bg-[#13171F] border border-[#2F3641] rounded-sm text-white px-4 py-3 text-sm font-mono placeholder-gray-600 outline-none transition-all duration-300 focus:border-[#C39B6F] focus:ring-1 focus:ring-[#C39B6F]/50 shadow-inner"
                                    required
                                />
                                <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-[#C39B6F] opacity-0 transition-opacity duration-300 group-focus-within/input:opacity-100"></div>
                            </div>
                        </div>

                        <div className="mb-8">
                            <label className="block text-[10px] text-gray-400 font-mono tracking-wider uppercase pl-1 mb-2">
                                Access Code (Password)
                            </label>
                            <div className="relative group/input">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-[#13171F] border border-[#2F3641] rounded-sm text-white px-4 py-3 text-sm font-mono placeholder-gray-600 outline-none transition-all duration-300 focus:border-[#C39B6F] focus:ring-1 focus:ring-[#C39B6F]/50 shadow-inner"
                                    required
                                />
                                <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-[#C39B6F] opacity-0 transition-opacity duration-300 group-focus-within/input:opacity-100"></div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full !bg-[#C39B6F] hover:!bg-[#D4AF37] !text-[#0F1218] font-bold py-3.5 px-4 rounded-sm transition-all duration-200 flex items-center justify-center gap-2 uppercase tracking-[0.15em] transform active:scale-[0.98] shadow-[0_0_20px_rgba(195,155,111,0.3)] hover:shadow-[0_0_30px_rgba(195,155,111,0.5)] border border-[#FCD34D]/20 relative overflow-hidden group/btn ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                            {isLoading ? (
                                <Activity className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <span>Initiate Uplink</span>
                                    <ChevronRight size={20} strokeWidth={2.5} className="group-hover/btn:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>

                        <div className="text-center pt-6 mt-2">
                            <div className="flex items-center justify-center gap-2 text-[10px] text-gray-600 font-mono opacity-60 hover:opacity-100 transition-opacity cursor-help" title="Restricted Access">
                                <Lock size={10} />
                                <span>VERSION: v2.0.4.5 // CLASSIFIED</span>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
