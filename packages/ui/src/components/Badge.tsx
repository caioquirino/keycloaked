import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'blue' | 'coral' | 'neutral' | 'sand' | 'success' | 'warning';
  size?: 'sm' | 'md';
  dot?: boolean;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'blue',
  size = 'md',
  dot = false,
  children,
  className = '',
  style,
  ...props
}) => {
  const getBadgeStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'blue':
        return {
          backgroundColor: 'var(--keycloaked-blue-light, #EEF2FD)',
          color: 'var(--keycloaked-blue, #225EE2)',
          border: '1px solid rgba(34, 94, 226, 0.2)',
        };
      case 'coral':
        return {
          backgroundColor: 'var(--keycloaked-coral-light, #FFF0E8)',
          color: 'var(--keycloaked-coral-dark, #F06E32)',
          border: '1px solid rgba(255, 128, 72, 0.25)',
        };
      case 'success':
        return {
          backgroundColor: '#EAF8ED',
          color: '#2EB84F',
          border: '1px solid rgba(46, 184, 79, 0.25)',
        };
      case 'warning':
        return {
          backgroundColor: '#FFF5F0',
          color: '#E56F43',
          border: '1px solid rgba(229, 111, 67, 0.25)',
        };
      case 'sand':
      case 'neutral':
      default:
        return {
          backgroundColor: 'var(--keycloaked-sand-muted, #F7F2E9)',
          color: 'var(--keycloaked-charcoal, #1F1E30)',
          border: '1px solid var(--keycloaked-sand-border, #EAE7DD)',
        };
    }
  };

  const getDotColor = (): string => {
    switch (variant) {
      case 'blue':
        return 'var(--keycloaked-blue, #225EE2)';
      case 'coral':
        return 'var(--keycloaked-coral, #FF8048)';
      case 'success':
        return 'var(--keycloaked-success, #2EB84F)';
      case 'warning':
        return 'var(--keycloaked-warning, #E56F43)';
      default:
        return 'var(--keycloaked-muted, #626773)';
    }
  };

  const sizeStyles: React.CSSProperties =
    size === 'sm'
      ? { padding: '0.15rem 0.55rem', fontSize: '0.74rem' }
      : { padding: '0.25rem 0.75rem', fontSize: '0.82rem' };

  return (
    <span
      className={`keycloaked-badge keycloaked-badge-${variant} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        borderRadius: 'var(--radius-pill, 9999px)',
        fontWeight: 600,
        letterSpacing: '-0.01em',
        fontFamily: 'var(--font-keycloaked, sans-serif)',
        ...sizeStyles,
        ...getBadgeStyles(),
        ...style,
      }}
      {...props}
    >
      {dot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: getDotColor(),
            display: 'inline-block',
          }}
        />
      )}
      {children}
    </span>
  );
};
