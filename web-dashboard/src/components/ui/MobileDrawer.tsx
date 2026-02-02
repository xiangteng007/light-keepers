/**
 * Light Keepers - Responsive Mobile Drawer Component
 * 
 * Enhanced mobile navigation drawer with improved UX.
 * Features: gesture support, smooth animations, accessibility.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './MobileDrawer.css';

interface MobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    position?: 'left' | 'right';
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
    isOpen,
    onClose,
    children,
    position = 'left'
}) => {
    const drawerRef = useRef<HTMLDivElement>(null);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    // Minimum swipe distance to trigger close
    const minSwipeDistance = 50;

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (!touchStart || !touchEnd) return;
        
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if ((position === 'left' && isLeftSwipe) || (position === 'right' && isRightSwipe)) {
            onClose();
        }
    }, [touchStart, touchEnd, position, onClose]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Focus trap
    useEffect(() => {
        if (isOpen && drawerRef.current) {
            drawerRef.current.focus();
        }
    }, [isOpen]);

    return (
        <>
            {/* Backdrop */}
            <div 
                className={`drawer-backdrop ${isOpen ? 'drawer-backdrop--visible' : ''}`}
                onClick={onClose}
                aria-hidden="true"
            />
            
            {/* Drawer */}
            <div
                ref={drawerRef}
                className={`drawer drawer--${position} ${isOpen ? 'drawer--open' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-label="導航選單"
                tabIndex={-1}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className="drawer__header">
                    <button 
                        className="drawer__close-btn"
                        onClick={onClose}
                        aria-label="關閉選單"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="drawer__content">
                    {children}
                </div>
            </div>
        </>
    );
};

export default MobileDrawer;
