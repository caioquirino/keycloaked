import React, { useState } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  isPassword?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      isPassword = false,
      type = 'text',
      id,
      className = '',
      style,
      ...props
    }: InputProps,
    ref: React.ForwardedRef<HTMLInputElement>
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const actualType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div
        className={`keycloaked-input-group ${className}`}
        style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}
      >
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontFamily: 'var(--font-keycloaked, sans-serif)',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: error ? 'var(--keycloaked-error, #E03027)' : 'var(--keycloaked-text, #191420)',
              letterSpacing: '-0.01em',
            }}
          >
            {label}
          </label>
        )}

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            ref={ref}
            id={inputId}
            type={actualType}
            style={{
              width: '100%',
              padding: isPassword ? '0.75rem 2.75rem 0.75rem 1rem' : '0.75rem 1rem',
              borderRadius: 'var(--radius-md, 12px)',
              border: `1.5px solid ${error ? 'var(--keycloaked-error, #E03027)' : 'var(--keycloaked-border, #E2E8F0)'}`,
              backgroundColor: 'var(--keycloaked-bg-surface, #FFFFFF)',
              fontFamily: 'var(--font-keycloaked, sans-serif)',
              fontSize: '0.95rem',
              color: 'var(--keycloaked-text, #191420)',
              outline: 'none',
              transition:
                'border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
              ...style,
            }}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((prev: boolean) => !prev)}
              style={{
                position: 'absolute',
                right: '0.85rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                color: 'var(--keycloaked-muted, #626773)',
                padding: '0.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '👁️' : '🔒'}
            </button>
          )}
        </div>

        {error ? (
          <span style={{ fontSize: '0.8rem', color: 'var(--keycloaked-error, #E03027)', fontWeight: 500 }}>
            {error}
          </span>
        ) : helperText ? (
          <span style={{ fontSize: '0.8rem', color: 'var(--keycloaked-muted, #626773)' }}>
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
