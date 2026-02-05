/**
 * Modal Component
 * 
 * A reusable modal dialog component with focus trap, keyboard navigation, and accessibility.
 * Uses design tokens from components.css.
 * 
 * @example
 * <Modal isOpen={isOpen} onClose={handleClose} title="確認操作">
 *   <p>確定要執行此操作嗎？</p>
 * </Modal>
 */
import React, { ReactNode, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { FocusTrap } from '../../accessibility/SkipLink';
import './Modal.css';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal content */
  children: ReactNode;
  /** Modal size */
  size?: ModalSize;
  /** Show close button */
  showCloseButton?: boolean;
  /** Close on backdrop click */
  closeOnBackdropClick?: boolean;
  /** Close on Escape key */
  closeOnEscape?: boolean;
  /** Footer content */
  footer?: ReactNode;
  /** Additional className */
  className?: string;
  /** Prevent body scroll when open */
  preventScroll?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  footer,
  className = '',
  preventScroll = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  // Manage body scroll and focus
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      if (preventScroll) {
        document.body.style.overflow = 'hidden';
      }
      
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (preventScroll) {
        document.body.style.overflow = '';
      }
      document.removeEventListener('keydown', handleKeyDown);
      
      // Restore focus
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, handleKeyDown, preventScroll]);

  if (!isOpen) return null;

  const modalClasses = [
    'modal',
    `modal--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const modalContent = (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <FocusTrap>
        <div
          ref={modalRef}
          className={modalClasses}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
        >
          {(title || showCloseButton) && (
            <div className="modal__header">
              {title && (
                <h2 id="modal-title" className="modal__title">
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  className="modal__close"
                  onClick={onClose}
                  aria-label="關閉對話框"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          )}
          <div className="modal__body">{children}</div>
          {footer && <div className="modal__footer">{footer}</div>}
        </div>
      </FocusTrap>
    </div>
  );

  return createPortal(modalContent, document.body);
};

/**
 * Confirm Modal - simplified confirm dialog
 */
export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '確認操作',
  message,
  confirmText = '確認',
  cancelText = '取消',
  variant = 'info',
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="modal__actions">
          <button 
            type="button" 
            className="btn btn--secondary" 
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn btn--${variant === 'danger' ? 'danger' : 'primary'}`}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      }
    >
      <p className="modal__message">{message}</p>
    </Modal>
  );
};

export default Modal;
