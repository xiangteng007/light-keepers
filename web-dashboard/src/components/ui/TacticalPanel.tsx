import React from 'react';
import { cn } from '../../lib/utils';

interface TacticalPanelProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string;
    action?: React.ReactNode;
    variant?: 'default' | 'critical' | 'alert';
    noPadding?: boolean;
}

/**
 * TacticalPanel - V2 Polish
 * 
 * Implements the "Hollywood Tactical" look:
 * - Matte Glass (Charcoal/90%)
 * - SVG Corner Brackets
 * - Accent Top Border
 * - Scanline Texture
 */
export function TacticalPanel({
    children,
    className,
    title,
    action,
    variant = 'default',
    noPadding = false,
    ...props
}: TacticalPanelProps) {

    // Variant styles
    const borderColor = variant === 'critical' ? 'border-red-500'
        : variant === 'alert' ? 'border-amber-500'
            : 'border-tactical-gold';

    const glowColor = variant === 'critical' ? 'shadow-[0_0_15px_rgba(239,68,68,0.15)]'
        : variant === 'alert' ? 'shadow-[0_0_15px_rgba(245,158,11,0.15)]'
            : 'shadow-none';

    return (
        <div
            className={cn(
                "relative flex flex-col group transition-all duration-300",
                "bg-tactical-panel backdrop-blur-sm", // Gap 1: Matte Glass
                "border border-tactical-border",        // Gap 1: Thin subtle border
                glowColor,
                className
            )}
            {...props}
        >
            {/* Gap 2: Scanline Texture Background */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
                style={{
                    backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
                    backgroundSize: '100% 4px, 6px 100%'
                }}
            />

            {/* Gap 2: Accent Top Border */}
            <div className={cn("absolute top-0 left-0 right-0 h-[2px] z-10", borderColor.replace('border-', 'bg-'))} />

            {/* Gap 2: L-Shape Corner Brackets (Fixed Size) */}
            {/* Top Left */}
            <svg
                className="absolute -top-[1px] -left-[1px] z-20 pointer-events-none"
                width="16" height="16" viewBox="0 0 16 16" fill="none"
            >
                <path d="M1 15V1H15" stroke={variant === 'default' ? '#C39B6F' : 'currentColor'} strokeWidth="1.5" className={cn(variant === 'critical' ? 'text-red-500' : variant === 'alert' ? 'text-amber-500' : 'text-tactical-gold')} />
            </svg>
            {/* Top Right */}
            <svg
                className="absolute -top-[1px] -right-[1px] z-20 pointer-events-none"
                width="16" height="16" viewBox="0 0 16 16" fill="none"
            >
                <path d="M1 1H15V15" stroke={variant === 'default' ? '#C39B6F' : 'currentColor'} strokeWidth="1.5" className={cn(variant === 'critical' ? 'text-red-500' : variant === 'alert' ? 'text-amber-500' : 'text-tactical-gold')} />
            </svg>
            {/* Bottom Left */}
            <svg
                className="absolute -bottom-[1px] -left-[1px] z-20 pointer-events-none"
                width="16" height="16" viewBox="0 0 16 16" fill="none"
            >
                <path d="M1 1V15H15" stroke={variant === 'default' ? '#C39B6F' : 'currentColor'} strokeWidth="1.5" className={cn(variant === 'critical' ? 'text-red-500' : variant === 'alert' ? 'text-amber-500' : 'text-tactical-gold')} />
            </svg>
            {/* Bottom Right */}
            <svg
                className="absolute -bottom-[1px] -right-[1px] z-20 pointer-events-none"
                width="16" height="16" viewBox="0 0 16 16" fill="none"
            >
                <path d="M15 1V15H1" stroke={variant === 'default' ? '#C39B6F' : 'currentColor'} strokeWidth="1.5" className={cn(variant === 'critical' ? 'text-red-500' : variant === 'alert' ? 'text-amber-500' : 'text-tactical-gold')} />
            </svg>

            {/* Header Area */}
            {title && (
                <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-tactical-border/50 bg-black/20">
                    <h3 className="font-tactical text-xs tracking-widest uppercase font-bold text-tactical-text-secondary">
                        {title}
                    </h3>
                    {action && <div>{action}</div>}
                </div>
            )}

            {/* Content Area */}
            <div className={cn("relative z-10 flex-1 min-h-0", !noPadding && "p-4")}>
                {children}
            </div>
        </div>
    );
}
