/**
 * 無障礙工具和 hooks
 * Accessibility utilities and hooks
 */
import { useEffect, useCallback, useRef } from 'react';

// ===== 跳過導航連結 =====
export function SkipLink() {
    return (
        <a href="#main-content" className="skip-link">
            跳至主要內容
        </a>
    );
}

// ===== ARIA Live 區域宣告 =====
interface AnnouncerProps {
    message: string;
    politeness?: 'polite' | 'assertive';
}

export function LiveAnnouncer({ message, politeness = 'polite' }: AnnouncerProps) {
    return (
        <div
            role="status"
            aria-live={politeness}
            aria-atomic="true"
            className="sr-only"
        >
            {message}
        </div>
    );
}

// ===== 焦點陷阱 Hook（Modal 用）=====
export function useFocusTrap(isActive: boolean) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isActive || !containerRef.current) return;

        const container = containerRef.current;
        const focusableElements = container.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // 自動聚焦第一個元素
        firstElement.focus();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };

        container.addEventListener('keydown', handleKeyDown);
        return () => container.removeEventListener('keydown', handleKeyDown);
    }, [isActive]);

    return containerRef;
}

// ===== 鍵盤導航 Hook =====
export function useKeyboardNavigation(
    items: HTMLElement[],
    options?: {
        orientation?: 'horizontal' | 'vertical' | 'both';
        loop?: boolean;
    }
) {
    const { orientation = 'vertical', loop = true } = options || {};

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const currentIndex = items.findIndex(item => item === document.activeElement);
        if (currentIndex === -1) return;

        let nextIndex = currentIndex;

        switch (e.key) {
            case 'ArrowDown':
                if (orientation !== 'horizontal') {
                    e.preventDefault();
                    nextIndex = currentIndex + 1;
                }
                break;
            case 'ArrowUp':
                if (orientation !== 'horizontal') {
                    e.preventDefault();
                    nextIndex = currentIndex - 1;
                }
                break;
            case 'ArrowRight':
                if (orientation !== 'vertical') {
                    e.preventDefault();
                    nextIndex = currentIndex + 1;
                }
                break;
            case 'ArrowLeft':
                if (orientation !== 'vertical') {
                    e.preventDefault();
                    nextIndex = currentIndex - 1;
                }
                break;
            case 'Home':
                e.preventDefault();
                nextIndex = 0;
                break;
            case 'End':
                e.preventDefault();
                nextIndex = items.length - 1;
                break;
        }

        // 處理循環
        if (loop) {
            if (nextIndex < 0) nextIndex = items.length - 1;
            if (nextIndex >= items.length) nextIndex = 0;
        } else {
            nextIndex = Math.max(0, Math.min(nextIndex, items.length - 1));
        }

        if (nextIndex !== currentIndex) {
            items[nextIndex]?.focus();
        }
    }, [items, orientation, loop]);

    return handleKeyDown;
}

// ===== Escape 鍵關閉 Hook =====
export function useEscapeKey(onEscape: () => void, isActive: boolean = true) {
    useEffect(() => {
        if (!isActive) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onEscape();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onEscape, isActive]);
}

// ===== 減少動態偵測 =====
export function usePrefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ===== 高對比模式偵測 =====
export function usePrefersHighContrast(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-contrast: more)').matches;
}

// ===== 視覺隱藏但螢幕閱讀器可見的類別 =====
// CSS: .sr-only { ... } 在 a11y.css 中定義
