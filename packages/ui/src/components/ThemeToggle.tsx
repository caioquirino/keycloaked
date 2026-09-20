import React from 'react';
import { useTheme } from '../theme';

export interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  showLabel = false,
  className = '',
  style,
  ...props
}) => {
  const { theme, resolvedTheme, toggleTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`keycloaked-theme-toggle ${className}`}
      aria-label={`Current theme: ${theme}. Click to change theme.`}
      title={`Theme: ${theme} (Click to switch)`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.45rem',
        padding: showLabel ? '0.4rem 0.85rem' : '0.45rem',
        borderRadius: 'var(--radius-pill, 9999px)',
        border: '1px solid var(--keycloaked-border, #E2E8F0)',
        backgroundColor: 'var(--keycloaked-bg-surface, #FFFFFF)',
        color: 'var(--keycloaked-text, #191420)',
        cursor: 'pointer',
        fontSize: '0.88rem',
        fontFamily: 'var(--font-keycloaked, sans-serif)',
        fontWeight: 600,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        minWidth: showLabel ? 'auto' : '36px',
        minHeight: '36px',
        ...style,
      }}
      {...props}
    >
      <span style={{ display: 'inline-flex', fontSize: '1rem', lineHeight: 1 }}>
        {theme === 'system' ? (isDark ? '🌙' : '☀️') : isDark ? '🌙' : '☀️'}
      </span>
      {showLabel && (
        <span style={{ fontSize: '0.82rem', textTransform: 'capitalize' }}>
          {theme === 'system' ? `System (${resolvedTheme})` : theme}
        </span>
      )}
    </button>
  );
};
