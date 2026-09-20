import React from 'react';

export interface AlertProps {
  type?: 'error' | 'warning' | 'success' | 'info';
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  children,
  className = '',
  style,
}) => {
  const alertStyles = {
    error: {
      bg: 'var(--keycloaked-error-bg, #FFF0EF)',
      color: 'var(--keycloaked-error, #E03027)',
      border: '1px solid rgba(224, 48, 39, 0.25)',
      icon: '⚠️',
    },
    warning: {
      bg: 'var(--keycloaked-warning-bg, #FFF5F0)',
      color: 'var(--keycloaked-warning, #E56F43)',
      border: '1px solid rgba(229, 111, 67, 0.25)',
      icon: '⚡',
    },
    success: {
      bg: 'var(--keycloaked-success-bg, #EAF8ED)',
      color: 'var(--keycloaked-success, #2EB84F)',
      border: '1px solid rgba(46, 184, 79, 0.25)',
      icon: '✓',
    },
    info: {
      bg: 'var(--keycloaked-info-bg, #EEF2FD)',
      color: 'var(--keycloaked-info, #225EE2)',
      border: '1px solid rgba(34, 94, 226, 0.25)',
      icon: 'ℹ️',
    },
  };

  const current = alertStyles[type];

  return (
    <div
      className={`keycloaked-alert keycloaked-alert-${type} ${className}`}
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.65rem',
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius-md, 12px)',
        backgroundColor: current.bg,
        color: current.color,
        border: current.border,
        fontSize: '0.85rem',
        lineHeight: 1.45,
        fontFamily: 'var(--font-keycloaked, sans-serif)',
        fontWeight: 500,
        ...style,
      }}
    >
      <span style={{ flexShrink: 0, fontSize: '1rem', lineHeight: 1.2 }}>{current.icon}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
};
