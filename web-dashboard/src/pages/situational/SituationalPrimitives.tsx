/**
 * SituationalPrimitives.tsx — 態勢類旗艦頁專屬子元件（R2a / FE-7）
 *
 * 服務對象：/command-center（戰情總覽）與 /domains/core/dashboard（核心儀表板）。
 *
 * DESIGN_LANGUAGE.md §4 元件層級：本檔只提供「版型層」組合（KPI 卡、Panel
 * 容器、skeleton、迷你趨勢線）；互動原子（Button/Badge/ProgressBar）一律
 * 取自 design-system，不在此自刻。樣式全部使用語義 token（situational.css），
 * light / dark / tactical 三態自動生效。
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './situational.css';

/* ── KPI 卡（可點擊，連往來源頁）───────────────────────────── */

export type KpiTone = 'default' | 'info' | 'success' | 'warning' | 'danger';

export interface KpiCardProps {
    label: string;
    /** null ＝ 資料尚未就緒，顯示 「—」 */
    value: string | number | null;
    icon?: ReactNode;
    sub?: ReactNode;
    /** 狀態語意（§3）：僅著色左緣與圖示，文字保持預設對比 */
    tone?: KpiTone;
    to: string;
    loading?: boolean;
    /** 附加內容（如 Sparkline） */
    children?: ReactNode;
}

export function KpiCard({
    label,
    value,
    icon,
    sub,
    tone = 'default',
    to,
    loading = false,
    children,
}: KpiCardProps) {
    return (
        <Link to={to} className={`sit-kpi sit-kpi--${tone}`} aria-busy={loading || undefined}>
            <span className="sit-kpi__top">
                <span className="sit-kpi__label">{label}</span>
                {icon && (
                    <span className="sit-kpi__icon" aria-hidden="true">
                        {icon}
                    </span>
                )}
            </span>
            <span className="sit-kpi__value">{loading || value === null ? '—' : value}</span>
            {sub && <span className="sit-kpi__sub">{sub}</span>}
            {children}
        </Link>
    );
}

/* ── Panel 容器（一組相依內容，§4 Panel 層）─────────────────── */

export interface PanelProps {
    title: string;
    /** 顯示於標題右側的計數徽章 */
    count?: number;
    /** 「查看全部」連結 */
    to?: string;
    toLabel?: string;
    className?: string;
    children: ReactNode;
}

export function Panel({ title, count, to, toLabel = '查看全部', className = '', children }: PanelProps) {
    return (
        <section className={`sit-panel ${className}`} aria-label={title}>
            <header className="sit-panel__header">
                <h2 className="sit-panel__title">
                    {title}
                    {typeof count === 'number' && <span className="sit-panel__count">{count}</span>}
                </h2>
                {to && (
                    <Link className="sit-panel__link" to={to}>
                        {toLabel} →
                    </Link>
                )}
            </header>
            <div className="sit-panel__body">{children}</div>
        </section>
    );
}

/* ── 載入 skeleton（≥3 列，DESIGN_LANGUAGE §7.1）────────────── */

export function SkeletonRows({ rows = 3 }: { rows?: number }) {
    return (
        <div className="sit-skeleton" role="status" aria-label="載入中">
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="sit-skeleton__row" />
            ))}
        </div>
    );
}

/* ── 迷你趨勢線（inline SVG，不引外部圖表庫）────────────────── */

export function Sparkline({
    points,
    width = 120,
    height = 32,
}: {
    points: number[];
    width?: number;
    height?: number;
}) {
    if (points.length < 2) return null;
    const max = Math.max(...points, 1);
    const step = width / (points.length - 1);
    const d = points
        .map(
            (v, i) =>
                `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(
                    height - 2 - (v / max) * (height - 4)
                ).toFixed(1)}`,
        )
        .join(' ');
    return (
        <svg
            className="sit-sparkline"
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            aria-hidden="true"
            focusable="false"
        >
            <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/* ── 相對時間 ──────────────────────────────────────────────── */

export function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (Number.isNaN(diff)) return '';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes} 分鐘前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小時前`;
    return `${Math.floor(hours / 24)} 天前`;
}
