import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { login as apiLogin } from '../../api/services';
import { ShieldCheck, Activity, AlertTriangle, X } from 'lucide-react';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Login Modal Component
 * 
 * 🔐 PR-04: Deep Link Protection
 * - 登入成功後自動導回 intended route（來自 ProtectedRoute 的 state.from）
 * - 若無 intended route，則停留在當前頁面
 */
const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
    const { login } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    // 🔐 PR-04: 從 location.state 取得 intended route
    const intendedRoute = (location.state as { from?: { pathname: string } })?.from?.pathname;

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
                onClose(); // Close modal on success
                
                // 🔐 PR-04: 登入成功後導回 intended route
                if (intendedRoute && intendedRoute !== '/') {
                    navigate(intendedRoute, { replace: true });
                }
            } else {
                throw new Error('No access token received');
            }
        } catch (err: unknown) {
            console.error('Login failed:', err);
            setError('ACCESS DENIED: Invalid credentials');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal Container - Secure Terminal Aesthetic */}
            <div className="relative w-full max-w-md p-1 z-10 animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-[#1D2635]/90 backdrop-blur-md border border-[#2F3641] rounded-lg shadow-2xl overflow-hidden relative">

                    {/* Corner Brackets */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#C39B6F] opacity-50"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#C39B6F] opacity-50"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#C39B6F] opacity-50"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#C39B6F] opacity-50"></div>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                        aria-label="關閉登入視窗"
                        title="關閉"
                    >
                        <X size={20} />
                    </button>

                    {/* Header */}
                    <div className="flex flex-col items-center pt-8 pb-4 px-8 border-b border-[#2F3641]/50 bg-[#13171F]/50">
                        <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-[#0B1120] border border-[#2F3641] rounded-full">
                            <ShieldCheck size={14} className="text-[#C39B6F]" />
                            <span className="text-[10px] font-mono text-[#C39B6F] tracking-widest uppercase">
                                SECURE TERMINAL
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-[0.2em] font-sans">
                            OPERATOR LOGIN
                        </h2>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="px-8 py-8">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-mono p-3 rounded flex items-center gap-2 mb-6">
                                <AlertTriangle size={14} />
                                {error}
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-[10px] text-gray-400 font-mono tracking-wider uppercase pl-1 mb-2">
                                Operator ID
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#13171F] border border-[#2F3641] rounded-sm text-white px-4 py-3 text-sm font-mono placeholder-gray-600 outline-none focus:border-[#C39B6F] transition-all"
                                placeholder="ENTER ID..."
                                required
                            />
                        </div>

                        <div className="mb-8">
                            <label className="block text-[10px] text-gray-400 font-mono tracking-wider uppercase pl-1 mb-2">
                                Access Code
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#13171F] border border-[#2F3641] rounded-sm text-white px-4 py-3 text-sm font-mono placeholder-gray-600 outline-none focus:border-[#C39B6F] transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {/* NUCLEAR OPTION BUTTON */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-[#C39B6F] hover:bg-[#D4AF37] text-[#0F1218] font-bold py-3 rounded-sm tracking-wide transition-all uppercase flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <Activity className="animate-spin" size={20} />
                            ) : (
                                'Initiate Uplink'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginModal;
