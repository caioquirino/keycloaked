import React from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { useUslWorkflow } from '../workflow/config';

export interface AuthenticatorOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  factorType: 'webauthn' | 'password' | 'otp';
  actionUrl?: string;
  onSelect?: () => void;
}

export interface AuthenticatorSelectorProps {
  options?: AuthenticatorOption[];
  onSelectOption?: (optionId: string) => void;
  onCancel?: () => void;
}

export const AuthenticatorSelector: React.FC<AuthenticatorSelectorProps> = ({
  options,
  onSelectOption,
  onCancel,
}) => {
  const { isFactorEnabled } = useUslWorkflow();

  const defaultOptions: AuthenticatorOption[] = [
    {
      id: 'webauthn',
      name: 'Passkey / Biometrics',
      description: 'Sign in with Face ID, Touch ID, or security key',
      icon: '🔑',
      factorType: 'webauthn',
    },
    {
      id: 'password',
      name: 'Account Password',
      description: 'Enter your standard account password',
      icon: '🔒',
      factorType: 'password',
    },
    {
      id: 'otp',
      name: 'Verification Code (OTP)',
      description: 'Use code from an authenticator app or email',
      icon: '📱',
      factorType: 'otp',
    },
  ];

  const availableOptions = (options || defaultOptions).filter((opt) =>
    isFactorEnabled(opt.factorType)
  );

  return (
    <Card
      variant="elevated"
      padding="lg"
      style={{
        borderRadius: 'var(--radius-xl, 24px)',
        border: '1px solid var(--keycloaked-border, #E2E8F0)',
        maxWidth: '440px',
        width: '100%',
        margin: '0 auto',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2
          style={{
            fontSize: '1.3rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--keycloaked-text, #191420)',
            margin: '0 0 0.35rem',
          }}
        >
          Choose how to verify
        </h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--keycloaked-text-muted, #626773)', margin: 0 }}>
          Select an available authentication factor to continue
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {availableOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              if (opt.onSelect) opt.onSelect();
              if (onSelectOption) onSelectOption(opt.id);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.9rem 1rem',
              borderRadius: 'var(--radius-md, 12px)',
              border: '1.5px solid var(--keycloaked-border, #E2E8F0)',
              backgroundColor: 'var(--keycloaked-bg-surface, #FFFFFF)',
              color: 'var(--keycloaked-text, #191420)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'var(--keycloaked-bg-muted, #F7F2E9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                flexShrink: 0,
              }}
            >
              {opt.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--keycloaked-text, #191420)' }}>
                {opt.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--keycloaked-text-muted, #626773)' }}>
                {opt.description}
              </div>
            </div>
            <span style={{ color: 'var(--keycloaked-blue, #225EE2)', fontSize: '1.1rem' }}>➔</span>
          </button>
        ))}
      </div>

      {onCancel && (
        <Button variant="ghost" size="sm" fullWidth onClick={onCancel}>
          Cancel
        </Button>
      )}
    </Card>
  );
};
