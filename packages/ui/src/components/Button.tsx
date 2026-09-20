import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'coral' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  style,
  ...props
}) => {
  const sizeStyles = {
    sm: { padding: '0.45rem 1rem', fontSize: '0.85rem', height: '36px' },
    md: { padding: '0.7rem 1.4rem', fontSize: '0.95rem', height: '46px' },
    lg: { padding: '0.9rem 1.8rem', fontSize: '1.05rem', height: '54px' },
  };

  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--keycloaked-blue, #225EE2)',
          color: '#FFFFFF',
          border: 'none',
          boxShadow: 'var(--shadow-primary, 0 4px 16px rgba(34, 94, 226, 0.28))',
        };
      case 'coral':
        return {
          backgroundColor: 'var(--keycloaked-coral, #FF8048)',
          color: '#FFFFFF',
          border: 'none',
          boxShadow: 'var(--shadow-coral, 0 4px 16px rgba(255, 128, 72, 0.28))',
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--keycloaked-sand-muted, #F7F2E9)',
          color: 'var(--keycloaked-black, #191420)',
          border: '1px solid var(--keycloaked-sand-border, #EAE7DD)',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: 'var(--keycloaked-blue, #225EE2)',
          border: '1.5px solid var(--keycloaked-blue, #225EE2)',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--keycloaked-muted, #626773)',
          border: 'none',
        };
      default:
        return {};
    }
  };

  const currentSizeStyle = sizeStyles[size as keyof typeof sizeStyles] || sizeStyles.md;

  return (
    <button
      disabled={disabled || isLoading}
      className={`keycloaked-btn keycloaked-btn-${variant} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        borderRadius: 'var(--radius-pill, 9999px)',
        fontWeight: 600,
        fontFamily: 'var(--font-keycloaked, sans-serif)',
        letterSpacing: '-0.01em',
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        opacity: disabled || isLoading ? 0.65 : 1,
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        width: fullWidth ? '100%' : 'auto',
        textDecoration: 'none',
        ...currentSizeStyle,
        ...getVariantStyles(),
        ...style,
      }}
      {...props}
    >
      {isLoading ? (
        <span
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'keycloaked-spin 0.6s linear infinite',
          }}
        />
      ) : (
        <>
          {leftIcon && <span style={{ display: 'inline-flex' }}>{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span style={{ display: 'inline-flex' }}>{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
