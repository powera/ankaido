
import React, { useRef, useEffect } from 'react';

const BaseModal = ({
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
  const modalRef = useRef(null);

  // Handle escape key and outside clicks
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen && closeOnEscape) {
        onClose();
      }
    };

    const handleClickOutside = (event) => {
      if (closeOnBackdrop && modalRef.current && event.target && !modalRef.current.contains(event.target)) {
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
    <div className="w-settings-overlay">
      <div 
        ref={modalRef} 
        className={`w-settings-modal ${className}`}
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
          <div className="w-settings-header">
            {title && <h2 className="w-settings-title">{title}</h2>}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="w-settings-close"
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
