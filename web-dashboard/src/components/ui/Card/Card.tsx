/**
 * Light Keepers - Card Component
 * Unified card container with 5 variants
 */
import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass' | 'emergency';
  interactive?: boolean;
}

export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'compact' | 'default' | 'spacious';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', interactive = false, className = '', children, ...props }, ref) => {
    const variantClass = variant !== 'default' ? `lk-card--${variant}` : '';
    const interactiveClass = interactive ? 'lk-card--interactive' : '';

    return (
      <div
        ref={ref}
        className={`lk-card ${variantClass} ${interactiveClass} ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, actions, className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`lk-card__header ${className}`.trim()} {...props}>
        <div>
          {title && <div className="lk-card__title">{title}</div>}
          {subtitle && <div className="lk-card__subtitle">{subtitle}</div>}
          {children}
        </div>
        {actions && <div className="lk-card__actions">{actions}</div>}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

export const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ padding = 'default', className = '', children, ...props }, ref) => {
    const paddingClass = padding !== 'default' ? `lk-card__body--${padding}` : '';

    return (
      <div ref={ref} className={`lk-card__body ${paddingClass} ${className}`.trim()} {...props}>
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`lk-card__footer ${className}`.trim()} {...props}>
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

export default Card;
