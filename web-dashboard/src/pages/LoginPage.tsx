import { useState, useEffect } from 'react';
import '../styles/pages/login-page.css';

/**
 * Light Keepers Login Page
 * Design: R5 B3c 野戰手冊（field-manual tactical）
 *
 * R5 restyle（FRONTEND_TACTICAL_REBUILD_PROMPT / DESIGN_LANGUAGE v2）:
 * 舊「industrial cyberpunk」海軍藍/金 HUD（R3b 的 inline styles ＋注入式
 * keyframes）整組退役，改為 B3c 野戰手冊語言：#16170F 底＋32px 細格線、
 * 橄欖 seal 徽記與掃描角框、LIGHTKEEPERS stencil 標、mono 時鐘讀數。
 * 樣式全部移入 `src/styles/pages/login-page.css`（原為孤兒檔，R5 起由本頁
 * 專用；.lk-login* 前綴命名空間）。tokens.css Layer 9 已讓所有 data-theme
 * 一律解析為 B3c 色盤，故 R3b 的 `.login-container.dark` pin 手法不再需要。
 *
 * 命名衝突備忘（沿襲 FE-2 (2.5) 註記）：`pages/LoginPage.css` 實際由
 * BindLinePage / ForgotPasswordPage / ResetPasswordPage 消費，本頁不碰。
 *
 * 品牌例外（不套 app token）：
 * - Google "G" 標誌四色＝Sign-in-with-Google 品牌規範要求的官方原色。
 * - LINE 品牌綠 #06C755（LINE Login button guidelines 現行版）＝官方原色；
 *   CSS 側一律以 var(--brand-line-green, #06C755) fallback 形式書寫。
 *
 * OAuth 流程（handleGoogleLogin / handleLineLogin）與時鐘/resize 接線
 * 與 R3b 完全相同，僅重排 UI 包裝。
 */

const WEEKDAYS_FULL = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const WEEKDAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const pad2 = (n: number) => n.toString().padStart(2, '0');

/** 橄欖燈塔章（構圖出自 design-mockups/r5-b3c-deep.html c1-seal；顏色走 currentColor） */
const SealMark: React.FC = () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2.1 13.7 4.5H10.3Z" fill="currentColor" />
        <rect x="10.1" y="4.9" width="3.8" height="2.8" fill="currentColor" />
        <path d="M9.9 8.6h4.2L15.4 20H8.6Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 12.9h6M8.4 16.4h7.2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8.8 6.3 5.1 4.9M15.2 6.3l3.7-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
        <path d="M6.4 20.9h11.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
);

const LoginPage: React.FC = () => {
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update clock every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Listen for window resize
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Responsive breakpoint - brand panel only on desktop
    const isDesktop = windowWidth >= 1024;

    // OAuth Login Handlers
    const handleGoogleLogin = () => {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        window.location.href = `${API_BASE_URL}/api/v1/auth/google`;
    };

    const handleLineLogin = () => {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        window.location.href = `${API_BASE_URL}/api/v1/auth/line`;
    };

    const hh = pad2(currentTime.getHours());
    const mm = pad2(currentTime.getMinutes());
    const ss = pad2(currentTime.getSeconds());
    const dateStr = `${currentTime.getFullYear()}.${pad2(currentTime.getMonth() + 1)}.${pad2(currentTime.getDate())}`;
    const day = currentTime.getDay();

    return (
        <div className="lk-login" data-testid="login-page">
            {/* 32px 細格線底紋（裝飾） */}
            <div className="lk-login__gridlines" aria-hidden="true" />

            {/* 左欄識別區 — 桌機 ≥1024 */}
            {isDesktop && (
                <aside className="lk-login__brand" aria-label="系統識別與時鐘">
                    <span className="lk-login__seal"><SealMark /></span>
                    <h1 className="lk-login__wordmark u-stencil">LIGHTKEEPERS</h1>
                    <p className="lk-login__tagline">曦望燈塔資訊管理平台</p>

                    <div className="lk-login__clock">
                        <span className="lk-login__clock-label">
                            現在時刻<b className="u-stencil">LOCAL TIME</b>
                        </span>
                        <strong className="lk-login__clock-readout u-mono">
                            {hh}<i>:</i>{mm}<i>:</i>{ss}
                        </strong>
                        <span className="lk-login__clock-date u-mono">{dateStr}</span>
                        <span className="lk-login__clock-day u-stencil">{WEEKDAYS_FULL[day]}</span>
                    </div>

                    <div className="lk-login__metrics">
                        <div className="lk-login__metric">
                            <span className="lk-login__metric-idx u-mono" aria-hidden="true">01</span>
                            <strong className="lk-login__metric-value u-mono">99.9</strong>
                            <span className="lk-login__metric-label u-stencil">UPTIME %</span>
                        </div>
                        <div className="lk-login__metric">
                            <span className="lk-login__metric-idx u-mono" aria-hidden="true">02</span>
                            <strong className="lk-login__metric-value u-mono">247</strong>
                            <span className="lk-login__metric-label u-stencil">ACTIVE</span>
                        </div>
                        <div className="lk-login__metric">
                            <span className="lk-login__metric-idx u-mono" aria-hidden="true">03</span>
                            <strong className="lk-login__metric-value u-mono">0</strong>
                            <span className="lk-login__metric-label u-stencil">ALERTS</span>
                        </div>
                    </div>

                    <p className="lk-login__sysline">
                        <i className="lk-login__sq" aria-hidden="true" />
                        系統正常<b className="u-stencil">SYS NOMINAL</b>
                    </p>
                </aside>
            )}

            {/* 登入卡 */}
            <main className="lk-login__main">
                <section className="lk-login__card" aria-label="登入">
                    {/* 掃描角框（裝飾） */}
                    <i className="lk-login__corner lk-login__corner--tl" aria-hidden="true" />
                    <i className="lk-login__corner lk-login__corner--tr" aria-hidden="true" />
                    <i className="lk-login__corner lk-login__corner--bl" aria-hidden="true" />
                    <i className="lk-login__corner lk-login__corner--br" aria-hidden="true" />

                    {/* 頂條：stamp 徽記＋mono 時鐘 */}
                    <header className="lk-login__topbar">
                        <span className="lk-login__stamp u-stencil"><i aria-hidden="true" />LIGHTKEEPERS</span>
                        <span className="lk-login__topclock u-mono">{hh}:{mm}:{ss}</span>
                    </header>

                    {/* 教範式頁眉 */}
                    <div className="lk-login__subrow">
                        <h2 className="lk-login__subrow-zh">系統登入</h2>
                        <span className="lk-login__subrow-la u-stencil">OPERATOR LOGIN</span>
                        <span className="lk-login__subrow-tm u-mono">{dateStr} {WEEKDAYS_SHORT[day]}</span>
                    </div>

                    {/* 行動端識別區（桌機由左欄承擔） */}
                    {!isDesktop && (
                        <div className="lk-login__id">
                            <span className="lk-login__seal"><SealMark /></span>
                            <h1 className="lk-login__wordmark u-stencil">LIGHTKEEPERS</h1>
                            <p className="lk-login__tagline">曦望燈塔資訊管理平台</p>
                        </div>
                    )}

                    <div className="lk-login__body">
                        <p className="lk-login__lede">選擇帳號通道登入，存取災害應變系統。</p>

                        <div className="lk-login__actions">
                            {/* Google 登入 — "G" 標誌四色為 Google 官方品牌規範原色，不套 app token */}
                            <button type="button" className="lk-login__oauth" onClick={handleGoogleLogin}>
                                <span className="lk-login__oauth-no u-mono" aria-hidden="true">01</span>
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                <span className="lk-login__oauth-text">
                                    <b>使用 Google 帳號登入</b>
                                    <small className="u-stencil">GOOGLE OAUTH</small>
                                </span>
                                <span className="lk-login__oauth-arrow" aria-hidden="true">→</span>
                            </button>

                            {/* LINE 登入 — LINE 官方品牌綠 #06C755 依品牌規範保留原色，不套 app token */}
                            <button type="button" className="lk-login__oauth lk-login__oauth--line" onClick={handleLineLogin}>
                                <span className="lk-login__oauth-no u-mono" aria-hidden="true">02</span>
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path fill="#06C755" d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                                </svg>
                                <span className="lk-login__oauth-text">
                                    <b>使用 LINE 帳號登入</b>
                                    <small className="u-stencil">LINE LOGIN</small>
                                </span>
                                <span className="lk-login__oauth-arrow" aria-hidden="true">→</span>
                            </button>
                        </div>
                    </div>

                    {/* 底列 */}
                    <footer className="lk-login__foot">
                        <span>光守護者系統</span>
                        <span><b className="u-mono">v2.2.0</b></span>
                    </footer>
                </section>
            </main>
        </div>
    );
};

export default LoginPage;
