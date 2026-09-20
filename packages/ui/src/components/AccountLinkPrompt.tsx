import React from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';

export interface AccountLinkPromptProps {
  identifier: string;
  conflictingField?: string;
  sourceFactorName?: string;
  type?: 'collision' | 'new_factor';
  onLink: () => void;
  onUseDifferentValue?: () => void;
  onCancel?: () => void;
  onContinueNewAccount?: () => void;
}

export const AccountLinkPrompt: React.FC<AccountLinkPromptProps> = ({
  identifier,
  conflictingField = 'Email address',
  sourceFactorName = 'credential',
  type = 'collision',
  onLink,
  onUseDifferentValue,
  onCancel,
  onContinueNewAccount,
}) => {
  const isCollision = type === 'collision';
  const handleDifferentValue = onUseDifferentValue || onCancel;

  return (
    <Card
      variant="elevated"
      padding="lg"
      style={{
        borderRadius: 'var(--radius-xl, 24px)',
        border: '1px solid var(--keycloaked-border, #E2E8F0)',
        maxWidth: '480px',
        width: '100%',
        margin: '0 auto',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: 'var(--keycloaked-coral-light, #FFF0E8)',
            color: 'var(--keycloaked-coral, #FF8048)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.6rem',
            marginBottom: '0.85rem',
          }}
        >
          ⚠️
        </div>

        <h2
          style={{
            fontSize: '1.35rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--keycloaked-text, #191420)',
            margin: '0 0 0.4rem',
          }}
        >
          {isCollision ? 'Conflicting Account Factor' : 'Link Authentication Factor'}
        </h2>

        <p
          style={{
            fontSize: '0.88rem',
            color: 'var(--keycloaked-text-muted, #626773)',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {isCollision
            ? `An existing account is already registered with this ${conflictingField.toLowerCase()}:`
            : `We didn't recognize this ${sourceFactorName}. Do you already have an account for:`}
        </p>

        <div style={{ marginTop: '0.6rem' }}>
          <Badge variant="coral" size="md">
            {conflictingField}: {identifier}
          </Badge>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Option 1: Sign in with existing account */}
        <div
          style={{
            padding: '1.1rem',
            borderRadius: 'var(--radius-lg, 16px)',
            border: '1.5px solid var(--keycloaked-blue, #225EE2)',
            backgroundColor: 'var(--keycloaked-blue-light, #EEF2FD)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--keycloaked-blue, #225EE2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Option 1 &middot; Sign In
            </span>
            <Badge variant="blue" size="sm">Recommended</Badge>
          </div>
          <div style={{ fontSize: '0.86rem', color: 'var(--keycloaked-text, #191420)', lineHeight: 1.45 }}>
            <strong>Already own this account?</strong> Sign in with this account to link your login method or access your existing profile and data.
          </div>
          <Button variant="primary" size="md" fullWidth onClick={onLink} style={{ marginTop: '0.25rem' }}>
            Sign In with this Account ➔
          </Button>
        </div>

        {/* Option 2: Sign up with a different value */}
        <div
          style={{
            padding: '1.1rem',
            borderRadius: 'var(--radius-lg, 16px)',
            border: '1px solid var(--keycloaked-border, #E2E8F0)',
            backgroundColor: 'var(--keycloaked-bg-surface, #FFFFFF)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--keycloaked-text-muted, #626773)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Option 2 &middot; Sign Up with Different {conflictingField}
          </div>
          <div style={{ fontSize: '0.86rem', color: 'var(--keycloaked-text-muted, #626773)', lineHeight: 1.45 }}>
            <strong>Creating a brand new account?</strong> Change this {conflictingField.toLowerCase()} to a different value to register a separate new profile.
          </div>
          <Button
            variant="outline"
            size="md"
            fullWidth
            onClick={handleDifferentValue}
            style={{ marginTop: '0.25rem' }}
          >
            Use a Different {conflictingField}
          </Button>
        </div>
      </div>

      {onContinueNewAccount && (
        <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          <Button variant="ghost" size="sm" onClick={onContinueNewAccount}>
            Continue anyway (Force separate account)
          </Button>
        </div>
      )}
    </Card>
  );
};
