import React from 'react';

export interface LogoProps {
  variant?: 'blue' | 'white' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'blue',
  size = 'md',
  showWordmark = true,
  className = '',
}) => {
  const iconSizes = {
    sm: { width: 26, height: 26, fontSize: '1.15rem' },
    md: { width: 34, height: 34, fontSize: '1.45rem' },
    lg: { width: 44, height: 44, fontSize: '1.85rem' },
  };

  const primaryColor =
    variant === 'white'
      ? '#FFFFFF'
      : variant === 'dark'
      ? '#191420'
      : 'var(--keycloaked-blue, #225EE2)';
  const wordmarkColor =
    variant === 'white'
      ? '#FFFFFF'
      : variant === 'dark'
      ? '#191420'
      : 'var(--keycloaked-text, #191420)';
  const accentColor = 'var(--keycloaked-coral, #FF8048)'; // Keycloaked Accent Coral

  const currentSize = iconSizes[size as keyof typeof iconSizes] || iconSizes.md;

  return (
    <div
      className={`keycloaked-logo-wrapper ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.65rem',
        userSelect: 'none',
      }}
    >
      {/* Keycloaked Key & Shield Emblem */}
      <svg
        width={currentSize.width}
        height={currentSize.height}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <rect width="40" height="40" rx="10" fill={primaryColor} />
        {/* Geometric 'K' & Key emblem */}
        <path
          d="M13 11V29M13 20L23 11M17 16.5L25 29"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Keyhole Accent Dot */}
        <circle cx="28" cy="12" r="2.8" fill={accentColor} />
      </svg>

      {showWordmark && (
        <span
          style={{
            fontFamily: 'var(--font-keycloaked, sans-serif)',
            fontWeight: 800,
            fontSize: currentSize.fontSize,
            letterSpacing: '-0.04em',
            color: wordmarkColor,
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'baseline',
          }}
        >
          keycloaked
          <span
            style={{
              color: accentColor,
              marginLeft: '1px',
              fontSize: '1.2em',
              lineHeight: 0,
            }}
          >
            .
          </span>
        </span>
      )}
    </div>
  );
};
