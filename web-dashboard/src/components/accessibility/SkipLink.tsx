/**
 * SkipLink.tsx
 * 
 * WCAG 2.4.1 Skip Navigation Component
 * Allows keyboard users to bypass navigation
 */
import React from 'react';

interface SkipLinkProps {
  /**
   * Target element ID to skip to (without #)
   * @default "main-content"
   */
  targetId?: string;
  
  /**
   * Custom link text
   * @default "跳至主要內容"
   */
  children?: React.ReactNode;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Skip Link for keyboard navigation
 * Visible only when focused
 * 
 * @example
 * // In App.tsx or layout
 * <SkipLink targetId="main-content" />
 * 
 * // In main content area
 * <main id="main-content" tabIndex={-1}>...</main>
 */
export function SkipLink({
  targetId = 'main-content',
  children = '跳至主要內容',
  className = '',
}: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      className={`skip-link ${className}`}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}

/**
 * Live Region Component
 * For announcing dynamic content changes to screen readers
 */
interface LiveRegionProps {
  /**
   * Politeness level
   * - polite: Wait for user to finish current task
   * - assertive: Immediately interrupt user
   */
  politeness?: 'polite' | 'assertive';
  
  /**
   * What parts of the region should be announced
   * - additions: New content only
   * - removals: Removed content only
   * - all: Both additions and removals
   * - text: Text changes only
   */
  relevant?: 'additions' | 'removals' | 'all' | 'text';
  
  /**
   * Content to announce (screen reader only)
   */
  children: React.ReactNode;
  
  /**
   * Is this an atomic region (announce whole region)
   */
  atomic?: boolean;
}

export function LiveRegion({
  children,
  politeness = 'polite',
  relevant = 'additions',
  atomic = false,
}: LiveRegionProps) {
  return (
    <div
      className="sr-only"
      role="status"
      aria-live={politeness}
      aria-relevant={relevant}
      aria-atomic={atomic}
    >
      {children}
    </div>
  );
}

/**
 * Visually Hidden Component
 * Content visible to screen readers but hidden visually
 */
interface VisuallyHiddenProps {
  children: React.ReactNode;
  
  /**
   * Element tag to render
   * @default "span"
   */
  as?: 'span' | 'div' | 'p' | 'label';
  
  /**
   * Make element focusable (visible on focus)
   */
  focusable?: boolean;
}

export function VisuallyHidden({
  children,
  as: Component = 'span',
  focusable = false,
}: VisuallyHiddenProps) {
  return (
    <Component className={focusable ? 'sr-only-focusable' : 'sr-only'}>
      {children}
    </Component>
  );
}

/**
 * Focus Trap Context (for modals/dialogs)
 */
interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
}

export function FocusTrap({ children, active = true }: FocusTrapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    // Get all focusable elements
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    
    // Focus first element
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [active]);

  return (
    <div ref={containerRef} className={active ? 'focus-trap-active' : ''}>
      {children}
    </div>
  );
}

export default SkipLink;
