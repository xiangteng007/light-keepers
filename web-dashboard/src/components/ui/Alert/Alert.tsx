/**
 * Alert Component
 * 
 * A reusable alert/notification component with multiple variants for different message types.
 * Uses design tokens from components.css.
 * 
 * @example
 * <Alert variant="success" title="成功">操作已完成</Alert>
 * <Alert variant="danger" dismissible onDismiss={() => {}}>發生錯誤</Alert>
 * <Alert variant="warning" icon={<AlertTriangle />}>請注意安全</Alert>
 */
import React, { ReactNode, useState } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import './Alert.css';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export interface AlertProps {
  /** Alert variant */
  variant?: AlertVariant;
  /** Alert title */
  title?: string;
  /** Alert content */
  children: ReactNode;
  /** Custom icon */
  icon?: ReactNode;
  /** Show dismiss button */
  dismissible?: boolean;
  /** Dismiss callback */
  onDismiss?: () => void;
  /** Additional className */
  className?: string;
  /** ARIA role */
  role?: 'alert' | 'status';
}

const defaultIcons: Record<AlertVariant, ReactNode> = {
  info: <Info size={20} />,
  success: <CheckCircle size={20} />,
  warning: <AlertTriangle size={20} />,
  danger: <AlertCircle size={20} />,
  neutral: <Info size={20} />,
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  icon,
  dismissible = false,
  onDismiss,
  className = '',
  role = 'alert',
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const alertClasses = [
    'alert',
    `alert--${variant}`,
    dismissible && 'alert--dismissible',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const displayIcon = icon !== undefined ? icon : defaultIcons[variant];

  return (
    <div className={alertClasses} role={role}>
      {displayIcon && <span className="alert__icon">{displayIcon}</span>}
      <div className="alert__content">
        {title && <strong className="alert__title">{title}</strong>}
        <div className="alert__message">{children}</div>
      </div>
      {dismissible && (
        <button
          type="button"
          className="alert__dismiss"
          onClick={handleDismiss}
          aria-label="關閉通知"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};

/**
 * Inline Alert - smaller, inline version
 */
export interface InlineAlertProps {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
}

export const InlineAlert: React.FC<InlineAlertProps> = ({
  variant = 'info',
  children,
  className = '',
}) => {
  const classes = ['inline-alert', `inline-alert--${variant}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} role="status">
      {defaultIcons[variant]}
      <span>{children}</span>
    </span>
  );
};

/**
 * Toast Alert - for temporary notifications
 */
export interface ToastAlertProps extends AlertProps {
  /** Auto-dismiss duration in ms (0 = no auto-dismiss) */
  duration?: number;
}

export const ToastAlert: React.FC<ToastAlertProps> = ({
  duration = 5000,
  onDismiss,
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(true);

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  if (!isVisible) return null;

  return (
    <Alert
      {...props}
      dismissible
      onDismiss={() => {
        setIsVisible(false);
        onDismiss?.();
      }}
      className={`toast-alert ${props.className || ''}`}
    />
  );
};

export default Alert;
