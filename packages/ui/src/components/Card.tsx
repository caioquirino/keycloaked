import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'flat' | 'sand';
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  padding = 'lg',
  className = '',
  style,
  ...props
}) => {
  const paddingMap = {
    none: '0',
    sm: '1rem',
    md: '1.5rem',
    lg: '2.25rem',
  };

  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: 'var(--keycloaked-bg-surface, #FFFFFF)',
          color: 'var(--keycloaked-text, #191420)',
          border: '1px solid var(--keycloaked-border, #E2E8F0)',
          boxShadow: 'var(--shadow-card, 0 4px 24px -4px rgba(25, 20, 32, 0.07))',
        };
      case 'flat':
        return {
          backgroundColor: 'var(--keycloaked-bg-surface, #FFFFFF)',
          color: 'var(--keycloaked-text, #191420)',
          border: '1px solid var(--keycloaked-border, #E2E8F0)',
          boxShadow: 'none',
        };
      case 'sand':
        return {
          backgroundColor: 'var(--keycloaked-bg-muted, #F7F2E9)',
          color: 'var(--keycloaked-text, #191420)',
          border: '1px solid var(--keycloaked-sand-border, #EAE7DD)',
          boxShadow: 'none',
        };
      default:
        return {};
    }
  };

  const currentPadding = paddingMap[padding as keyof typeof paddingMap] || paddingMap.lg;

  return (
    <div
      className={`keycloaked-card keycloaked-card-${variant} ${className}`}
      style={{
        borderRadius: 'var(--radius-lg, 20px)',
        padding: currentPadding,
        transition: 'box-shadow 0.25s var(--ease-keycloaked), transform 0.25s var(--ease-keycloaked)',
        position: 'relative',
        ...getVariantStyles(),
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};
