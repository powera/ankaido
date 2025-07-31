
import React, { ReactNode, useEffect, useRef } from 'react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  width?: string;
  maxWidth?: string;
  maxHeight?: string;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  ariaLabel?: string;
}

const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  width = '500px',
  maxWidth = '90%',
  maxHeight = '80vh',
  showCloseButton = true,
  closeOnEscape = true,
  closeOnBackdrop = true,
  ariaLabel
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key and outside clicks
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && closeOnEscape) {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (closeOnBackdrop && modalRef.current && event.target && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, closeOnEscape, closeOnBackdrop]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div 
        ref={modalRef} 
        className={`modal-container ${className}`}
        style={{ 
          width,
          maxWidth,
          maxHeight
        }}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
      >
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && <h2 className="modal-title">{title}</h2>}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="modal-close"
                aria-label="Close modal"
              >
                ×
              </button>
            )}
          </div>
        )}
        
        {children}
      </div>
    </div>
  );
};

export default BaseModal;
