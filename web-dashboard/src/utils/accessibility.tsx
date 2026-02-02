/**
 * Accessibility (a11y) Utilities
 * 
 * Collection of accessibility helpers and hooks.
 */

import React, { useEffect, useRef, useCallback } from 'react';

/**
 * Focus trap hook - keeps focus within a container
 */
export function useFocusTrap(isActive: boolean) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isActive || !containerRef.current) return;

        const container = containerRef.current;
        const focusableElements = container.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement?.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement?.focus();
                }
            }
        };

        container.addEventListener('keydown', handleKeyDown);
        firstElement?.focus();

        return () => container.removeEventListener('keydown', handleKeyDown);
    }, [isActive]);

    return containerRef;
}

/**
 * Announce to screen readers
 */
export function useAnnounce() {
    const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
        const region = document.createElement('div');
        region.setAttribute('role', 'status');
        region.setAttribute('aria-live', priority);
        region.setAttribute('aria-atomic', 'true');
        region.style.cssText = `
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        `;
        
        document.body.appendChild(region);
        
        // Delay to ensure screen reader picks up the change
        setTimeout(() => {
            region.textContent = message;
        }, 100);

        // Clean up
        setTimeout(() => {
            document.body.removeChild(region);
        }, 1000);
    }, []);

    return announce;
}

/**
 * Skip to main content link
 */
export const SkipToContent: React.FC<{ targetId?: string }> = ({ targetId = 'main-content' }) => {
    return (
        <a 
            href={`#${targetId}`}
            className="skip-to-content"
            onClick={(e) => {
                e.preventDefault();
                const target = document.getElementById(targetId);
                target?.focus();
                target?.scrollIntoView();
            }}
        >
            跳至主要內容
        </a>
    );
};

/**
 * Visually hidden component for screen readers
 */
export const VisuallyHidden: React.FC<{ children: React.ReactNode; as?: keyof JSX.IntrinsicElements }> = ({ 
    children, 
    as: Component = 'span' 
}) => {
    return (
        <Component
            style={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                padding: 0,
                margin: '-1px',
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
                border: 0,
            }}
        >
            {children}
        </Component>
    );
};

/**
 * Reduce motion hook
 */
export function usePrefersReducedMotion(): boolean {
    const mediaQuery = typeof window !== 'undefined' 
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    
    return mediaQuery?.matches ?? false;
}

/**
 * Keyboard navigation hook
 */
export function useKeyboardNavigation<T extends HTMLElement>(
    items: T[],
    options: { orientation?: 'horizontal' | 'vertical'; loop?: boolean } = {}
) {
    const { orientation = 'vertical', loop = true } = options;

    const handleKeyDown = useCallback((e: React.KeyboardEvent, currentIndex: number) => {
        const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
        const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';

        let newIndex: number | null = null;

        switch (e.key) {
            case prevKey:
                e.preventDefault();
                newIndex = currentIndex - 1;
                if (newIndex < 0) {
                    newIndex = loop ? items.length - 1 : 0;
                }
                break;
            case nextKey:
                e.preventDefault();
                newIndex = currentIndex + 1;
                if (newIndex >= items.length) {
                    newIndex = loop ? 0 : items.length - 1;
                }
                break;
            case 'Home':
                e.preventDefault();
                newIndex = 0;
                break;
            case 'End':
                e.preventDefault();
                newIndex = items.length - 1;
                break;
        }

        if (newIndex !== null && items[newIndex]) {
            items[newIndex].focus();
        }
    }, [items, orientation, loop]);

    return handleKeyDown;
}

// CSS for skip link
export const skipLinkStyles = `
.skip-to-content {
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: #fff;
    padding: 8px 16px;
    z-index: 10000;
    transition: top 0.2s;
}

.skip-to-content:focus {
    top: 0;
}
`;
