/**
 * Light Keepers - Badge Component
 * Emergency response level badges
 */
import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'safe' | 'warning' | 'danger' | 'critical' | 'info' | 'neutral' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', size = 'md', dot = false, className = '', children, ...props }, ref) => {
    const variantClass = `lk-badge--${variant}`;
    const sizeClass = size !== 'md' ? `lk-badge--${size}` : '';

    return (
      <span
        ref={ref}
        className={`lk-badge ${variantClass} ${sizeClass} ${className}`.trim()}
        {...props}
      >
        {dot && <span className="lk-badge__dot" aria-hidden="true" />}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// Convenience exports for disaster response levels
export const SafeBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge variant="safe" {...props} />
);

export const WarningBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge variant="warning" {...props} />
);

export const DangerBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge variant="danger" {...props} />
);

export const CriticalBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge variant="critical" dot {...props} />
);

export default Badge;
