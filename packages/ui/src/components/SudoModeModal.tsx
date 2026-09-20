import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Alert } from './Alert';
import { Badge } from './Badge';

export type SudoFactor = 'phone' | 'email' | 'totp' | 'password' | 'webauthn';

export interface SudoModeModalProps {
  isOpen: boolean;
  actionTitle?: string;
  hasPassword?: boolean;
  hasTotp?: boolean;
  hasWebauthn?: boolean;
  currentPhoneNumber?: string;
  currentEmail?: string;
  excludeFactor?: SudoFactor;
  onConfirm?: (password: string) => Promise<boolean | void>;
  onConfirmPassword?: (password: string) => Promise<boolean | void>;
  onConfirmOtp?: (code: string, target: string) => Promise<boolean | void>;
  onConfirmTotp?: (code: string) => Promise<boolean | void>;
  onSudoSuccess?: () => void;
  onCancel: () => void;
  onReplaceFactor?: (factor: SudoFactor) => void;
  onAddBackupFactor?: (factor: SudoFactor) => void;
  error?: string | null;
  apiBaseUrl?: string;
}

export const SudoModeModal: React.FC<SudoModeModalProps> = ({
  isOpen,
  actionTitle = 'Confirm Sensitive Action',
  hasPassword = true,
  hasTotp = false,
  hasWebauthn = false,
  currentPhoneNumber = '',
  currentEmail = '',
  excludeFactor,
  onConfirm,
  onConfirmPassword,
  onConfirmOtp,
  onConfirmTotp,
  onSudoSuccess,
  onCancel,
  onReplaceFactor,
  onAddBackupFactor,
  error: externalError,
  apiBaseUrl = 'http://localhost:3001',
}) => {
  // Determine available verification options excluding the factor being removed/modified
  const canUsePhone = Boolean(currentPhoneNumber && currentPhoneNumber.trim().length > 0 && excludeFactor !== 'phone');
  const canUseEmail = Boolean(currentEmail && currentEmail.trim().length > 0 && excludeFactor !== 'email');
  const canUsePassword = Boolean(hasPassword && excludeFactor !== 'password');
  const canUseTotp = Boolean(hasTotp && excludeFactor !== 'totp');

  interface MethodOption {
    id: 'phone' | 'email' | 'totp' | 'password';
    label: string;
    icon: string;
    targetMasked?: string;
  }

  const maskTarget = (val: string, type: 'phone' | 'email') => {
    if (!val) return '';
    if (type === 'phone') {
      const clean = val.trim();
      if (clean.length <= 6) return clean;
      return `${clean.slice(0, 4)} ••••• ${clean.slice(-4)}`;
    }
    const [user, domain] = val.split('@');
    if (!domain) return val;
    const maskedUser = user.length <= 2 ? `${user}*` : `${user[0]}•••••${user[user.length - 1]}`;
    return `${maskedUser}@${domain}`;
  };

  const availableOptions: MethodOption[] = [];
  if (canUseTotp) {
    availableOptions.push({ id: 'totp', label: 'Authenticator App', icon: '📱' });
  }
  if (canUsePhone) {
    availableOptions.push({
      id: 'phone',
      label: 'SMS Code',
      icon: '💬',
      targetMasked: maskTarget(currentPhoneNumber, 'phone'),
    });
  }
  if (canUseEmail) {
    availableOptions.push({
      id: 'email',
      label: 'Email Code',
      icon: '✉️',
      targetMasked: maskTarget(currentEmail, 'email'),
    });
  }
  if (canUsePassword) {
    availableOptions.push({ id: 'password', label: 'Password', icon: '🔒' });
  }

  const isBrandNewAccount = !currentPhoneNumber && !currentEmail && !hasPassword && !hasTotp && !hasWebauthn;
  const isLockoutBlocked = !isBrandNewAccount && availableOptions.length === 0;

  // Existing factor checks
  const factorExists: Record<SudoFactor, boolean> = {
    phone: Boolean(currentPhoneNumber && currentPhoneNumber.trim().length > 0),
    email: Boolean(currentEmail && currentEmail.trim().length > 0),
    totp: Boolean(hasTotp),
    webauthn: Boolean(hasWebauthn),
    password: Boolean(hasPassword),
  };

  interface MissingBackupOption {
    id: SudoFactor;
    title: string;
    description: string;
    icon: string;
  }

  // Filter out any factor that already exists on this account, and also exclude the factor being removed
  const missingBackupOptions: MissingBackupOption[] = [];

  if (!factorExists.phone && excludeFactor !== 'phone') {
    missingBackupOptions.push({
      id: 'phone',
      title: 'Add Mobile Phone',
      description: 'Receive one-time security codes via SMS text message',
      icon: '📱',
    });
  }

  if (!factorExists.email && excludeFactor !== 'email') {
    missingBackupOptions.push({
      id: 'email',
      title: 'Add Email Address',
      description: 'Receive one-time codes in your email inbox',
      icon: '✉️',
    });
  }

  if (!factorExists.totp && excludeFactor !== 'totp') {
    missingBackupOptions.push({
      id: 'totp',
      title: 'Set up Authenticator App',
      description: 'Use Google Authenticator, 1Password, or Authy',
      icon: '📲',
    });
  }

  if (!factorExists.webauthn && excludeFactor !== 'webauthn') {
    missingBackupOptions.push({
      id: 'webauthn',
      title: 'Register a Passkey',
      description: 'Sign in seamlessly with Touch ID, Face ID, or security keys',
      icon: '🔑',
    });
  }

  const getFactorReplacementDetails = (factor?: SudoFactor) => {
    switch (factor) {
      case 'phone':
        return {
          title: 'Replace with New Phone Number',
          description: 'Verify your new mobile phone number to immediately take over without losing access.',
          icon: '📱',
        };
      case 'email':
        return {
          title: 'Replace with New Email Address',
          description: 'Verify your new email address to update your primary account identity.',
          icon: '✉️',
        };
      case 'totp':
        return {
          title: 'Pair New Authenticator App',
          description: 'Set up a new authenticator device before removing this one.',
          icon: '📲',
        };
      case 'webauthn':
        return {
          title: 'Register Replacement Passkey',
          description: 'Add a new passkey or biometric device before removing this one.',
          icon: '🔑',
        };
      case 'password':
        return {
          title: 'Set New Account Password',
          description: 'Create a replacement password for your account.',
          icon: '🔒',
        };
      default:
        return {
          title: 'Replace Factor',
          description: 'Configure a replacement before removing this factor.',
          icon: '🔄',
        };
    }
  };

  const defaultMethod = availableOptions[0]?.id || (isBrandNewAccount ? 'instant' : 'password');
  const [selectedMethod, setSelectedMethod] = useState<'phone' | 'email' | 'totp' | 'password' | 'instant'>(defaultMethod);

  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setOtpCode('');
      setTotpCode('');
      setLocalError(null);
      setOtpSent(false);
      setCountdown(0);
      const initial = availableOptions[0]?.id || (isBrandNewAccount ? 'instant' : 'password');
      setSelectedMethod(initial);
    }
  }, [isOpen, excludeFactor, currentPhoneNumber, currentEmail, hasPassword, hasTotp]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  if (!isOpen) return null;

  const getFactorDisplayName = (factor?: SudoFactor) => {
    switch (factor) {
      case 'phone':
        return 'Mobile Phone (SMS)';
      case 'email':
        return 'Email Address';
      case 'totp':
        return 'Authenticator App (TOTP)';
      case 'password':
        return 'Account Password';
      case 'webauthn':
        return 'Passkey';
      default:
        return 'Factor';
    }
  };

  const handleSendOtp = async (channelOverride?: 'phone' | 'email') => {
    const channel = channelOverride || (selectedMethod === 'email' ? 'email' : 'phone');
    const target = channel === 'phone' ? currentPhoneNumber : currentEmail;
    if (!target) {
      setLocalError(`No registered ${channel === 'phone' ? 'phone number' : 'email address'} found.`);
      return;
    }

    setLocalError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${apiBaseUrl}/api/verify/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: channel,
          target: target.trim(),
          purpose: 'sudo',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch security code.');
      }

      setOtpSent(true);
      setCountdown(60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error sending security code.';
      setLocalError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    setLocalError(null);
    setIsLoading(true);
    try {
      const verifyFn = onConfirmPassword || onConfirm;
      if (!verifyFn) {
        throw new Error('No password verification handler provided.');
      }
      const result = await verifyFn(password);
      if (result === false) {
        setLocalError('Invalid password. Please try again.');
      } else {
        setPassword('');
        onSudoSuccess?.();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setLocalError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpCode.trim();
    if (cleanCode.length !== 6) {
      setLocalError('Please enter the 6-digit security code.');
      return;
    }

    const channel = selectedMethod === 'email' ? 'email' : 'phone';
    const target = (channel === 'phone' ? currentPhoneNumber : currentEmail).trim();
    setLocalError(null);
    setIsLoading(true);

    try {
      if (onConfirmOtp) {
        const result = await onConfirmOtp(cleanCode, target);
        if (result === false) {
          setLocalError('Incorrect security code. Please try again.');
          return;
        }
      } else {
        const res = await fetch(`${apiBaseUrl}/api/verify/check-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target, code: cleanCode }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Incorrect or expired security code.');
        }
      }

      setOtpCode('');
      onSudoSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Security code verification failed.';
      setLocalError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = totpCode.trim();
    if (cleanCode.length !== 6) {
      setLocalError('Please enter the 6-digit code from your authenticator app.');
      return;
    }

    setLocalError(null);
    setIsLoading(true);

    try {
      if (onConfirmTotp) {
        const result = await onConfirmTotp(cleanCode);
        if (result === false) {
          setLocalError('Incorrect authenticator code. Please check your app and try again.');
          return;
        }
      }
      setTotpCode('');
      onSudoSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authenticator code verification failed.';
      setLocalError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantSubmit = () => {
    onSudoSuccess?.();
  };

  const activeError = localError || externalError;
  const currentTargetMasked = selectedMethod === 'email'
    ? maskTarget(currentEmail, 'email')
    : maskTarget(currentPhoneNumber, 'phone');

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
        {/* Shield Icon & Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'var(--keycloaked-blue-subtle, #EEF2FD)',
              color: 'var(--keycloaked-blue, #225EE2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              flexShrink: 0,
            }}
          >
            🛡️
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              {actionTitle}
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.825rem', color: 'var(--keycloaked-muted, #626773)' }}>
              Step 1 of 2: Sudo Step-Up Verification
            </p>
          </div>
        </div>

        {/* Informational notice when factor is excluded */}
        {excludeFactor && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              backgroundColor: 'rgba(234, 138, 0, 0.08)',
              border: '1px solid rgba(234, 138, 0, 0.25)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              fontSize: '0.8rem',
              color: '#8A5300',
              lineHeight: 1.45,
            }}
          >
            <span style={{ fontSize: '1rem' }}>⚠️</span>
            <div>
              <strong>{getFactorDisplayName(excludeFactor)} excluded</strong>
              <div>
                Since you are modifying or removing this factor, verification must be completed using an alternative factor registered to your account.
              </div>
            </div>
          </div>
        )}

        {activeError && (
          <div style={{ marginBottom: '1.25rem' }}>
            <Alert type="error">{activeError}</Alert>
          </div>
        )}

        {/* Case A: Sole Factor Replacement & Backup Flow */}
        {isLockoutBlocked && (
          <div>
            <div
              style={{
                padding: '1.25rem',
                backgroundColor: 'rgba(234, 138, 0, 0.08)',
                border: '1px solid rgba(234, 138, 0, 0.25)',
                borderRadius: '14px',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🔄</span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#8A5300' }}>
                  Replacement required to prevent lockout
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.835rem', color: 'var(--keycloaked-text, #191420)', lineHeight: 1.5 }}>
                <strong>{getFactorDisplayName(excludeFactor)}</strong> is your only registered sign-in method. You cannot remove it without either replacing it or adding an alternative backup factor.
              </p>
            </div>

            {/* 1. Direct Replacement (Recommended) */}
            {excludeFactor && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--keycloaked-muted, #626773)', fontWeight: 600, marginBottom: '0.5rem' }}>
                  RECOMMENDED ACTION
                </div>
                <button
                  type="button"
                  onClick={() => onReplaceFactor?.(excludeFactor)}
                  style={{
                    width: '100%',
                    padding: '1rem 1.15rem',
                    borderRadius: '14px',
                    border: '2px solid var(--keycloaked-blue, #225EE2)',
                    backgroundColor: 'var(--keycloaked-blue-subtle, #EEF2FD)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ fontSize: '1.5rem' }}>{getFactorReplacementDetails(excludeFactor).icon}</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--keycloaked-blue, #225EE2)' }}>
                          {getFactorReplacementDetails(excludeFactor).title}
                        </span>
                        <Badge variant="blue" size="sm">Recommended</Badge>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--keycloaked-text, #191420)', marginTop: '0.2rem' }}>
                        {getFactorReplacementDetails(excludeFactor).description}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '1.2rem', color: 'var(--keycloaked-blue, #225EE2)', fontWeight: 700 }}>➔</span>
                </button>
              </div>
            )}

            {/* 2. Add Missing Backup Factors (Strictly filtered to only non-existing ones) */}
            {missingBackupOptions.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--keycloaked-muted, #626773)', fontWeight: 600, marginBottom: '0.5rem' }}>
                  OR ADD AN ALTERNATIVE BACKUP FACTOR FIRST
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {missingBackupOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onAddBackupFactor?.(opt.id)}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        border: '1px solid var(--keycloaked-border, #E2E8F0)',
                        backgroundColor: 'var(--keycloaked-bg-surface, #FFFFFF)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>{opt.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--keycloaked-text, #191420)' }}>
                            {opt.title}
                          </div>
                          <div style={{ fontSize: '0.775rem', color: 'var(--keycloaked-muted, #626773)' }}>
                            {opt.description}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '1.1rem', color: 'var(--keycloaked-blue, #225EE2)', fontWeight: 600 }}>+</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Case B: Available verification methods */}
        {!isLockoutBlocked && !isBrandNewAccount && (
          <div>
            {/* Factor Selector Pills (if more than 1 option available) */}
            {availableOptions.length > 1 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--keycloaked-muted, #626773)', fontWeight: 600, marginBottom: '0.45rem' }}>
                  Select alternative verification factor:
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {availableOptions.map((opt) => {
                    const isSelected = selectedMethod === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSelectedMethod(opt.id);
                          setOtpSent(false);
                          setLocalError(null);
                        }}
                        style={{
                          flex: 1,
                          minWidth: '100px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid var(--keycloaked-blue, #225EE2)' : '1px solid var(--keycloaked-border, #E2E8F0)',
                          backgroundColor: isSelected ? 'var(--keycloaked-blue-subtle, #EEF2FD)' : 'transparent',
                          color: isSelected ? 'var(--keycloaked-blue, #225EE2)' : 'var(--keycloaked-text, #191420)',
                          fontSize: '0.8rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Subflow: Phone SMS or Email OTP */}
            {(selectedMethod === 'phone' || selectedMethod === 'email') && (
              <div>
                <p style={{ fontSize: '0.865rem', color: 'var(--keycloaked-muted, #626773)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  Authorize this change with a one-time security code sent to your registered {selectedMethod === 'phone' ? 'phone' : 'email'}.
                </p>

                {!otpSent ? (
                  <div
                    style={{
                      padding: '1.25rem',
                      backgroundColor: 'var(--keycloaked-bg-muted, #F7F2E9)',
                      borderRadius: '14px',
                      marginBottom: '1.5rem',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.825rem', color: 'var(--keycloaked-muted, #626773)', marginBottom: '0.4rem' }}>
                      Send security code to:
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--keycloaked-text, #191420)' }}>
                      {currentTargetMasked}
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleSendOtp()}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Dispatching Code...' : `Send Code via ${selectedMethod === 'phone' ? 'SMS' : 'Email'}`}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleOtpSubmit}>
                    <div
                      style={{
                        padding: '0.75rem 1rem',
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
                          Code dispatched to
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{currentTargetMasked}</div>
                      </div>
                      <Badge variant="success" size="sm">✓ Sent</Badge>
                    </div>

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
                        6-Digit Security Code
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setOtpCode(digits);
                          if (digits.length === 6) setLocalError(null);
                        }}
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
                        <span>Check your {selectedMethod === 'phone' ? 'SMS inbox' : 'email'}.</span>
                        {countdown > 0 ? (
                          <span>Resend in {countdown}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendOtp()}
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
                        disabled={isLoading || otpCode.trim().length !== 6}
                      >
                        {isLoading ? 'Verifying...' : 'Authorize'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Subflow: Password */}
            {selectedMethod === 'password' && (
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--keycloaked-muted, #626773)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  For security, enter your current account password to authorize sensitive changes to your authentication factors.
                </p>

                <form onSubmit={handlePasswordSubmit}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <Input
                      type="password"
                      label="Current Password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={isLoading || !password}>
                      {isLoading ? 'Verifying...' : 'Authorize'}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Subflow: TOTP Authenticator App */}
            {selectedMethod === 'totp' && (
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--keycloaked-muted, #626773)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  Enter the 6-digit verification code from your Authenticator App (Google Authenticator, 1Password, etc.).
                </p>

                <form onSubmit={handleTotpSubmit}>
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
                      6-Digit Authenticator Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setTotpCode(digits);
                        if (digits.length === 6) setLocalError(null);
                      }}
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
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isLoading || totpCode.trim().length !== 6}
                    >
                      {isLoading ? 'Verifying...' : 'Authorize'}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Case C: Instant Sudo for brand-new accounts with no existing factors */}
        {isBrandNewAccount && selectedMethod === 'instant' && (
          <div>
            <p style={{ fontSize: '0.875rem', color: 'var(--keycloaked-muted, #626773)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Your account is signed in with an active authenticated session. Click below to authorize adding your first contact factor.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="button" variant="primary" onClick={handleInstantSubmit}>
                Authorize &amp; Continue
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
