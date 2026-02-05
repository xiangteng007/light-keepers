/**
 * Skeleton.tsx
 * 
 * Loading skeleton components using motion.css classes
 * Light Keepers Design System
 */
import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'title' | 'avatar' | 'button' | 'card' | 'image' | 'circular';
  count?: number;
}

/**
 * Skeleton loading placeholder component
 * Uses shimmer animation from motion.css
 */
export function Skeleton({
  className = '',
  width,
  height,
  variant = 'text',
  count = 1,
}: SkeletonProps) {
  const getVariantClass = () => {
    switch (variant) {
      case 'text': return 'skeleton-text';
      case 'title': return 'skeleton-title';
      case 'avatar': return 'skeleton-avatar';
      case 'button': return 'skeleton-button';
      case 'card': return 'skeleton-card';
      case 'image': return 'skeleton-image';
      case 'circular': return 'skeleton-avatar';
      default: return '';
    }
  };

  const style: React.CSSProperties = {
    ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height && { height: typeof height === 'number' ? `${height}px` : height }),
  };

  if (count > 1) {
    return (
      <>
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={`skeleton ${getVariantClass()} ${className}`}
            style={style}
            aria-hidden="true"
          />
        ))}
      </>
    );
  }

  return (
    <div
      className={`skeleton ${getVariantClass()} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

interface SkeletonCardProps {
  showImage?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  descriptionLines?: number;
  showAction?: boolean;
  className?: string;
}

/**
 * Pre-composed skeleton card for common use cases
 */
export function SkeletonCard({
  showImage = true,
  showTitle = true,
  showDescription = true,
  descriptionLines = 3,
  showAction = false,
  className = '',
}: SkeletonCardProps) {
  return (
    <div className={`lk-card lk-card--default ${className}`} aria-hidden="true">
      {showImage && (
        <div className="skeleton skeleton-image" style={{ marginBottom: 'var(--space-4)' }} />
      )}
      <div className="lk-card__body">
        {showTitle && <div className="skeleton skeleton-title" />}
        {showDescription && <Skeleton variant="text" count={descriptionLines} />}
        {showAction && (
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Skeleton variant="button" />
          </div>
        )}
      </div>
    </div>
  );
}

interface SkeletonListProps {
  count?: number;
  showAvatar?: boolean;
  showSecondary?: boolean;
  className?: string;
}

/**
 * Pre-composed skeleton list for loading states
 */
export function SkeletonList({
  count = 5,
  showAvatar = true,
  showSecondary = true,
  className = '',
}: SkeletonListProps) {
  return (
    <div className={`stagger-children ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-3)',
            borderBottom: '1px solid var(--border-light)',
          }}
          className="animate-fade-in-up"
        >
          {showAvatar && <Skeleton variant="avatar" />}
          <div style={{ flex: 1 }}>
            <Skeleton width="60%" />
            {showSecondary && <Skeleton width="40%" />}
          </div>
        </div>
      ))}
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

/**
 * Pre-composed skeleton table for data loading
 */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  showHeader = true,
  className = '',
}: SkeletonTableProps) {
  return (
    <table className={className} style={{ width: '100%' }} aria-hidden="true">
      {showHeader && (
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} style={{ padding: 'var(--space-3)' }}>
                <Skeleton height={20} />
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody className="stagger-children">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={rowIndex} className="animate-fade-in">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <td key={colIndex} style={{ padding: 'var(--space-3)' }}>
                <Skeleton />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Export all skeleton components
export default Skeleton;
