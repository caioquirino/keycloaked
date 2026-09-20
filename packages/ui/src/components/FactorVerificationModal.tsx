import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Alert } from './Alert';

export interface FactorVerificationModalProps {
  isOpen: boolean;
  factorType: 'phone' | 'email';
  mode: 'add' | 'change';
  currentValue?: string;
  userId?: string;
  onSuccess: (verifiedValue: string) => Promise<void> | void;
  onCancel: () => void;
  apiBaseUrl?: string;
}

export const FactorVerificationModal: React.FC<FactorVerificationModalProps> = ({
  isOpen,
  factorType,
  mode,
  currentValue = '',
  userId = '',
  onSuccess,
  onCancel,
  apiBaseUrl = 'http://localhost:3001',
}) => {
  const isPhone = factorType === 'phone';
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [target, setTarget] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setTarget('');
      setCode('');
      setError(null);
      setCountdown(0);
    }
  }, [isOpen, factorType, mode]);

  // Countdown timer for code resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  if (!isOpen) return null;

  const validateTarget = (val: string): string | null => {
    const trimmed = val.trim();
    if (!trimmed) {
      return isPhone ? 'Please enter a valid mobile phone number.' : 'Please enter a valid email address.';
    }
    if (currentValue && trimmed.toLowerCase() === currentValue.toLowerCase()) {
      return `New ${isPhone ? 'phone number' : 'email'} must be different from your current one.`;
    }
    if (isPhone) {
      // Basic E.164 phone validation (starts with + followed by 7-15 digits)
      const phoneRegex = /^\+[1-9]\d{6,14}$/;
      if (!phoneRegex.test(trimmed.replace(/\s+/g, ''))) {
        return 'Please enter a valid phone number in international E.164 format (e.g. +31600000000).';
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        return 'Please enter a valid email address.';
      }
    }
    return null;
  };

  const handleSendCode = async (targetValue?: string) => {
    const dest = (targetValue || target).trim().replace(/\s+/g, isPhone ? '' : ' ');
    const valError = validateTarget(dest);
    if (valError) {
      setError(valError);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${apiBaseUrl}/api/verify/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: factorType,
          target: dest,
          purpose: 'factor_verification',
          userId: userId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch verification code.');
      }

      setStep('verify');
      setCountdown(60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error sending verification code.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = code.trim();
    if (cleanCode.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    const cleanTarget = target.trim().replace(/\s+/g, isPhone ? '' : ' ');
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${apiBaseUrl}/api/verify/check-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: cleanTarget,
          code: cleanCode,
          userId: userId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Incorrect or expired verification code.');
      }

      // Success callback
      await onSuccess(cleanTarget);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 6);
    setCode(digitsOnly);
    if (digitsOnly.length === 6) {
      // Auto-trigger verify
      setError(null);
    }
  };

  const factorTitle = isPhone ? 'Mobile Phone' : 'Email Address';
  const actionTitle = mode === 'add' ? `Add ${factorTitle}` : `Change ${factorTitle}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(25, 20, 32, 0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1.25rem',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onCancel();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--keycloaked-bg-surface, #FFFFFF)',
          color: 'var(--keycloaked-text, #191420)',
          borderRadius: '24px',
          padding: '2rem',
          maxWidth: '460px',
          width: '100%',
          boxShadow: '0 24px 48px -12px rgba(25, 20, 32, 0.25)',
          border: '1px solid var(--keycloaked-border, #E2E8F0)',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: isPhone ? 'var(--keycloaked-coral-subtle, #FFF0E8)' : 'var(--keycloaked-blue-subtle, #EEF2FD)',
              color: isPhone ? 'var(--keycloaked-coral, #FF8048)' : 'var(--keycloaked-blue, #225EE2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
            }}
          >
            {isPhone ? '📱' : '✉️'}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              {actionTitle}
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.825rem', color: 'var(--keycloaked-muted, #626773)' }}>
              Step 2 of 2: Authenticate &amp; Bind Destination
            </p>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: '1.25rem' }}>
            <Alert type="error">{error}</Alert>
          </div>
        )}

        {step === 'input' ? (
          <div>
            <p style={{ fontSize: '0.875rem', color: 'var(--keycloaked-muted, #626773)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              {mode === 'change' ? (
                <>
                  Replace your current {factorTitle.toLowerCase()} (<strong>{currentValue}</strong>). A 6-digit confirmation code will be sent to the new destination.
                </>
              ) : (
                <>
                  Register a verified {factorTitle.toLowerCase()} as a primary sign-in factor for passwordless access.
                </>
              )}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendCode();
              }}
            >
              <div style={{ marginBottom: '1.5rem' }}>
                <Input
                  type={isPhone ? 'tel' : 'email'}
                  label={isPhone ? 'New Mobile Phone (with Country Code)' : 'New Email Address'}
                  placeholder={isPhone ? '+31 6 0000 0000' : 'you@example.com'}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  autoFocus
                  disabled={isLoading}
                  required
                />
                {isPhone && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--keycloaked-muted, #626773)', marginTop: '0.35rem' }}>
                    Include your country code starting with &ldquo;+&rdquo; (e.g. +31 for Netherlands, +1 for US).
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isLoading || !target.trim()}>
                  {isLoading ? 'Sending Code...' : 'Send Verification Code'}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <div
              style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--keycloaked-bg-muted, #F7F2E9)',
                borderRadius: '12px',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--keycloaked-muted, #626773)', fontWeight: 600 }}>
                  Code sent to
                </div>
                <div style={{ fontSize: '0.925rem', fontWeight: 700 }}>{target}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep('input');
                  setCode('');
                  setError(null);
                }}
                disabled={isLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--keycloaked-blue, #225EE2)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Change
              </button>
            </div>

            <form onSubmit={handleVerifyCode}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                    color: 'var(--keycloaked-text, #191420)',
                  }}
                >
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="123456"
                  autoFocus
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    letterSpacing: '0.35em',
                    textAlign: 'center',
                    borderRadius: '12px',
                    border: '1px solid var(--keycloaked-border, #E2E8F0)',
                    backgroundColor: 'var(--keycloaked-bg-surface, #FFFFFF)',
                    color: 'var(--keycloaked-text, #191420)',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '0.65rem',
                    fontSize: '0.8rem',
                    color: 'var(--keycloaked-muted, #626773)',
                  }}
                >
                  <span>Check your {isPhone ? 'SMS' : 'inbox'} for the code.</span>
                  {countdown > 0 ? (
                    <span>Resend in {countdown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendCode(target)}
                      disabled={isLoading}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--keycloaked-blue, #225EE2)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: '0.8rem',
                      }}
                    >
                      Resend Code
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isLoading || code.trim().length !== 6}
                >
                  {isLoading ? 'Verifying...' : 'Verify & Bind'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
