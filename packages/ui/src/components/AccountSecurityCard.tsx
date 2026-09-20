import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { useUslWorkflow } from '../workflow/config';

export interface CredentialMetadata {
  id: string;
  type: string;
  userLabel?: string;
  createdDate?: number;
}

export interface CredentialTypeContainer {
  type: string;
  category: string;
  displayName: string;
  helptext?: string;
  updateAction?: string;
  createAction?: string;
  removeable?: boolean;
  userCredentialMetadatas?: Array<{
    credential: CredentialMetadata;
  }>;
}

export interface AccountSecurityCardProps {
  credentials: CredentialTypeContainer[];
  isLoading?: boolean;
  phoneNumber?: string;
  preferredOtpChannel?: 'sms' | 'whatsapp' | 'email';
  userEmail?: string;
  isEmailVerified?: boolean;
  isWhatsAppLinked?: boolean;
  onUpdatePassword?: () => void;
  onSetupPasskey?: () => void;
  onSetupTotp?: () => void;
  onDeleteCredential?: (credentialId: string, credentialLabel: string, credentialType?: string) => void;
  onUpdateOtpPreferences?: (phoneNumber: string, preferredChannel: 'sms' | 'whatsapp' | 'email') => Promise<void>;
  onInitiateChangePhone?: () => void;
  onInitiateChangeEmail?: () => void;
  onRemovePhone?: () => void;
  onRemoveEmail?: () => void;
  onLinkWhatsApp?: () => void;
  onUnlinkWhatsApp?: () => void;
}

export const AccountSecurityCard: React.FC<AccountSecurityCardProps> = ({
  credentials,
  isLoading = false,
  phoneNumber = '',
  preferredOtpChannel = 'sms',
  userEmail = '',
  isEmailVerified = true,
  isWhatsAppLinked = false,
  onUpdatePassword,
  onSetupPasskey,
  onSetupTotp,
  onDeleteCredential,
  onUpdateOtpPreferences,
  onInitiateChangePhone,
  onInitiateChangeEmail,
  onRemovePhone,
  onRemoveEmail,
  onLinkWhatsApp,
  onUnlinkWhatsApp,
}) => {
  const { config } = useUslWorkflow();
  const factors = config.factors;

  // Local state for active OTP channel preference and loading indicator
  const [channelPref, setChannelPref] = useState<'sms' | 'whatsapp' | 'email'>(preferredOtpChannel);
  const [isSavingPref, setIsSavingPref] = useState(false);

  // Accordion drawer expansion state per factor
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    webauthn: false,
    totp: false,
    sms: false,
    whatsapp: false,
    email: false,
    password: false,
    otpSection: true,
  });

  useEffect(() => {
    setChannelPref(preferredOtpChannel);
  }, [preferredOtpChannel]);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChannelChange = async (newChannel: 'sms' | 'whatsapp' | 'email') => {
    if (newChannel === channelPref) return;
    setChannelPref(newChannel);
    if (!onUpdateOtpPreferences) return;

    setIsSavingPref(true);
    try {
      await onUpdateOtpPreferences(phoneNumber, newChannel);
    } finally {
      setIsSavingPref(false);
    }
  };

  const getContainer = (type: string) =>
    credentials.find((c) => c.type === type || c.type.startsWith(type));

  const passwordContainer = getContainer('password');
  const webauthnContainer = getContainer('webauthn');
  const otpContainer = getContainer('otp');

  const passwordCred = passwordContainer?.userCredentialMetadatas?.[0]?.credential;
  const webauthnCreds = webauthnContainer?.userCredentialMetadatas?.map((m) => m.credential) || [];
  const otpCreds = otpContainer?.userCredentialMetadatas?.map((m) => m.credential) || [];

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Active OTP channels that are currently configured/linked
  const activeChannels = (['sms', 'whatsapp', 'email'] as const).filter((ch) => {
    if (ch === 'sms') return Boolean(phoneNumber);
    if (ch === 'whatsapp') return Boolean(phoneNumber && isWhatsAppLinked);
    if (ch === 'email') return Boolean(userEmail);
    return false;
  });

  // Sort channels so the Primary channel is always #1, followed by remaining backup channels
  const sortedActiveChannels = [...activeChannels].sort((a, b) => {
    if (a === channelPref) return -1;
    if (b === channelPref) return 1;
    return 0;
  });

  const hasMultipleChannels = sortedActiveChannels.length > 1;
  const passwordRank = 3 + sortedActiveChannels.length;

  return (
    <Card variant="elevated" padding="lg">
      <style>{`
        .factor-clickable-row {
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }
        .factor-clickable-row:hover {
          background-color: rgba(34, 94, 226, 0.04) !important;
        }
        .factor-clickable-row:hover .factor-chevron-box {
          background-color: #225EE2 !important;
          color: #FFFFFF !important;
          transform: scale(1.06);
          box-shadow: 0 2px 6px rgba(34, 94, 226, 0.25);
        }
        .factor-chevron-box {
          transition: all 0.15s ease;
          user-select: none;
        }
      `}</style>
      {/* Card Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🛡️</span>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--keycloaked-black, #191420)' }}>
              Sign-In Factor Priority &amp; Security
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {isSavingPref && (
              <span style={{ fontSize: '0.78rem', color: 'var(--keycloaked-blue, #225EE2)', fontWeight: 600 }}>
                Updating priority...
              </span>
            )}
            <Badge variant="blue">Native In-App</Badge>
            <Badge variant="success" size="sm">Sudo Protected</Badge>
          </div>
        </div>
        <p style={{ margin: 0, color: 'var(--keycloaked-muted, #626773)', fontSize: '0.88rem', lineHeight: 1.5 }}>
          When logging in, your account evaluates authentication methods in this exact top-to-bottom sequence. If your primary factor is unavailable, use &ldquo;Verify another way&rdquo; on the sign-in screen to choose any alternative.
        </p>
      </div>

      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--keycloaked-muted, #626773)' }}>
          Loading security methods &amp; credentials...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* ========================================================================= */}
          {/* TIER 1: FIXED HIGH-SECURITY FACTORS (WEBAUTHN & TOTP)                     */}
          {/* ========================================================================= */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1rem' }}>🔒</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--keycloaked-muted, #626773)' }}>
                Fixed High-Security Tier (Evaluated First)
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

              {/* 1.1 Passkeys & Biometrics */}
              {factors.webauthn.enabled && (
                <div
                  style={{
                    border: '1.5px solid var(--keycloaked-border, #E2E8F0)',
                    borderRadius: '14px',
                    backgroundColor: 'var(--keycloaked-bg-surface, #FFFFFF)',
                    overflow: 'hidden',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  }}
                >
                  {/* Row Header - Fully Clickable to Expand */}
                  <div
                    className={webauthnCreds.length > 0 ? 'factor-clickable-row' : ''}
                    onClick={() => webauthnCreds.length > 0 && toggleExpand('webauthn')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem 1.25rem',
                      cursor: webauthnCreds.length > 0 ? 'pointer' : 'default',
                      backgroundColor: 'var(--keycloaked-bg-surface, #FFFFFF)',
                      userSelect: 'none',
                    }}
                    title={webauthnCreds.length > 0 ? (expanded.webauthn ? 'Click to collapse details' : 'Click to expand details') : undefined}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: '#EEF2FD',
                          color: '#225EE2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                        }}
                      >
                        1
                      </div>
                      <span style={{ fontSize: '1.2rem' }}>🔑</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--keycloaked-text, #191420)' }}>
                            Passkeys &amp; Biometrics
                          </span>
                          <Badge variant="blue" size="sm">#1 Priority</Badge>
                          {webauthnCreds.length > 0 ? (
                            <Badge variant="success" size="sm">
                              {webauthnCreds.length} {webauthnCreds.length === 1 ? 'Key' : 'Keys'} Active
                            </Badge>
                          ) : (
                            <Badge variant="sand" size="sm">Not Configured</Badge>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--keycloaked-muted, #626773)', marginTop: '0.2rem' }}>
                          Touch ID, Face ID, Windows Hello, or hardware security keys (phishing-resistant)
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {webauthnCreds.length === 0 ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetupPasskey?.();
                          }}
                        >
                          + Set Up Passkey
                        </Button>
                      ) : (
                        <div
                          className="factor-chevron-box"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--keycloaked-bg-muted, #F7F2E9)',
                            color: 'var(--keycloaked-muted, #626773)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {expanded.webauthn ? '▲' : '▼'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Drawer */}
                  {expanded.webauthn && webauthnCreds.length > 0 && (
                    <div
                      style={{
                        padding: '1rem 1.25rem',
                        borderTop: '1px solid var(--keycloaked-border, #E2E8F0)',
                        backgroundColor: 'var(--keycloaked-bg-muted, #F7F2E9)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem',
                      }}
                    >
                      {webauthnCreds.map((cred) => (
                        <div
                          key={cred.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.65rem 0.85rem',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '10px',
                            border: '1px solid var(--keycloaked-border, #E2E8F0)',
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{cred.userLabel || 'Passkey'}</span>
                            {cred.createdDate && (
                              <span style={{ fontSize: '0.78rem', color: 'var(--keycloaked-muted, #626773)', marginLeft: '0.5rem' }}>
                                (Added {formatDate(cred.createdDate)})
                              </span>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            style={{ color: '#D92D20', borderColor: '#FECDCA', padding: '0.25rem 0.65rem', height: '30px' }}
                            onClick={() => onDeleteCredential?.(cred.id, cred.userLabel || 'Passkey', 'webauthn')}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}

                      <div style={{ marginTop: '0.35rem' }}>
                        <Button variant="outline" size="sm" onClick={onSetupPasskey}>
                          + Add another Passkey
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 1.2 Authenticator App (TOTP) */}
              {factors.otp.enabled && (
                <div
                  style={{
                    border: '1.5px solid var(--keycloaked-border, #E2E8F0)',
                    borderRadius: '14px',
                    backgroundColor: 'var(--keycloaked-bg-surface, #FFFFFF)',
                    overflow: 'hidden',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  }}
                >
                  {/* Row Header - Fully Clickable to Expand */}
                  <div
                    className={otpCreds.length > 0 ? 'factor-clickable-row' : ''}
                    onClick={() => otpCreds.length > 0 && toggleExpand('totp')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem 1.25rem',
                      cursor: otpCreds.length > 0 ? 'pointer' : 'default',
                      backgroundColor: 'var(--keycloaked-bg-surface, #FFFFFF)',
                      userSelect: 'none',
                    }}
                    title={otpCreds.length > 0 ? (expanded.totp ? 'Click to collapse details' : 'Click to expand details') : undefined}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: '#EEF2FD',
                          color: '#225EE2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                        }}
                      >
                        2
                      </div>
                      <span style={{ fontSize: '1.2rem' }}>📱</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--keycloaked-text, #191420)' }}>
                            Authenticator App (TOTP)
                          </span>
                          <Badge variant="blue" size="sm">#2 Priority</Badge>
                          {otpCreds.length > 0 ? (
                            <Badge variant="success" size="sm">Active</Badge>
                          ) : (
                            <Badge variant="sand" size="sm">Not Configured</Badge>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--keycloaked-muted, #626773)', marginTop: '0.2rem' }}>
                          Time-based 6-digit codes generated in Google Authenticator, 1Password, or Bitwarden
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {otpCreds.length === 0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetupTotp?.();
                          }}
                        >
                          + Set Up App
                        </Button>
                      ) : (
                        <div
                          className="factor-chevron-box"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--keycloaked-bg-muted, #F7F2E9)',
                            color: 'var(--keycloaked-muted, #626773)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {expanded.totp ? '▲' : '▼'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Drawer */}
                  {expanded.totp && otpCreds.length > 0 && (
                    <div
                      style={{
                        padding: '1rem 1.25rem',
                        borderTop: '1px solid var(--keycloaked-border, #E2E8F0)',
                        backgroundColor: 'var(--keycloaked-bg-muted, #F7F2E9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                          {otpCreds[0].userLabel || 'Authenticator Application'}
                        </div>
                        {otpCreds[0].createdDate && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--keycloaked-muted, #626773)', marginTop: '0.2rem' }}>
                            Configured on {formatDate(otpCreds[0].createdDate)}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        style={{ color: '#D92D20', borderColor: '#FECDCA', padding: '0.25rem 0.65rem', height: '30px' }}
                        onClick={() => onDeleteCredential?.(otpCreds[0].id, otpCreds[0].userLabel || 'Authenticator App', 'otp')}
                      >
                        Remove App
                      </Button>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* ========================================================================= */}
          {/* TIER 2: REORDERABLE ONE-TIME PASSCODE (OTP) DELIVERY CHANNELS             */}
          {/* ========================================================================= */}
          <div>
            {/* Section Header - Clickable to expand/collapse entire OTP tier */}
            <div
              className="factor-clickable-row"
              onClick={() => toggleExpand('otpSection')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem',
                padding: '0.65rem 1rem',
                borderRadius: '10px',
                backgroundColor: 'var(--keycloaked-bg-muted, #F7F2E9)',
                border: '1px solid var(--keycloaked-border, #E2E8F0)',
                cursor: 'pointer',
                userSelect: 'none',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
              title={expanded.otpSection ? 'Click to collapse Configurable OTP Channels' : 'Click to expand Configurable OTP Channels'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <span style={{ fontSize: '1rem' }}>↕️</span>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--keycloaked-text, #191420)' }}>
                  Configurable OTP Channels
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--keycloaked-muted, #626773)', fontWeight: 500 }}>
                  ({expanded.otpSection ? 'Click to Collapse' : 'Click to Expand'})
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--keycloaked-muted, #626773)', fontStyle: 'italic' }}>
                  {hasMultipleChannels ? 'Use "Make Primary" to set your default contact channel' : 'Primary channel for one-time verification codes'}
                </span>
                <div
                  className="factor-chevron-box"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--keycloaked-bg-surface, #FFFFFF)',
                    border: '1px solid var(--keycloaked-border, #E2E8F0)',
                    color: 'var(--keycloaked-muted, #626773)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  {expanded.otpSection ? '▲' : '▼'}
                </div>
              </div>
            </div>

            {expanded.otpSection && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {sortedActiveChannels.map((channel, idx) => {
                  const rankNumber = idx + 3;
                  const isPrimary = idx === 0;

                  if (channel === 'sms') {
                    const isConfigured = Boolean(phoneNumber);
                    return (
                      <div
                        key="sms"
                        style={{
                          border: isPrimary ? '1.5px solid #225EE2' : '1.5px solid var(--keycloaked-border, #E2E8F0)',
                          borderRadius: '14px',
                          backgroundColor: 'var(--keycloaked-bg-surface, #FFFFFF)',
                          overflow: 'hidden',
                          transition: 'all 0.2s ease',
                          boxShadow: isPrimary ? '0 2px 8px rgba(34, 94, 226, 0.08)' : 'none',
                        }}
                      >
                        {/* Row Header - Fully Clickable to Expand */}
                        <div
                          className={isConfigured ? 'factor-clickable-row' : ''}
                          onClick={() => isConfigured && toggleExpand('sms')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem 1.25rem',
                            backgroundColor: isPrimary ? 'rgba(34, 94, 226, 0.02)' : 'transparent',
                            cursor: isConfigured ? 'pointer' : 'default',
                            userSelect: 'none',
                          }}
                          title={isConfigured ? (expanded.sms ? 'Click to collapse details' : 'Click to expand details') : undefined}
                        >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '7px',
                              backgroundColor: isPrimary ? '#225EE2' : '#EEF2FD',
                              color: isPrimary ? '#FFFFFF' : '#225EE2',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                            }}
                          >
                            {rankNumber}
                          </div>

                          <span style={{ fontSize: '1.2rem' }}>💬</span>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--keycloaked-text, #191420)' }}>
                                Mobile SMS OTP
                              </span>
                              <Badge variant={isPrimary ? 'success' : 'sand'} size="sm">
                                {isPrimary ? `Rank #${rankNumber} · Primary OTP` : `Rank #${rankNumber} · Backup OTP`}
                              </Badge>
                              {isConfigured ? (
                                <Badge variant="success" size="sm">Verified</Badge>
                              ) : (
                                <Badge variant="sand" size="sm">Not Configured</Badge>
                              )}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--keycloaked-muted, #626773)', marginTop: '0.2rem' }}>
                              {isConfigured ? phoneNumber : 'No mobile phone registered for SMS verification'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          {/* Make Primary / Make Backup Toggle Button */}
                          {hasMultipleChannels && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isPrimary) {
                                  const nextChannel = sortedActiveChannels.find((c) => c !== 'sms');
                                  if (nextChannel) handleChannelChange(nextChannel);
                                } else {
                                  handleChannelChange('sms');
                                }
                              }}
                              disabled={isSavingPref}
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: '8px',
                                border: '1px solid var(--keycloaked-border, #E2E8F0)',
                                backgroundColor: isPrimary ? 'var(--keycloaked-bg-surface, #FFFFFF)' : '#EEF2FD',
                                color: isPrimary ? 'var(--keycloaked-muted, #626773)' : '#225EE2',
                                fontWeight: 600,
                                fontSize: '0.76rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                              title={isPrimary ? 'Make another channel primary' : 'Set SMS as primary OTP channel'}
                            >
                              {isPrimary ? '⬇ Make Backup' : '⬆ Make Primary'}
                            </button>
                          )}

                          {!isConfigured ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onInitiateChangePhone?.();
                              }}
                            >
                              + Add Phone
                            </Button>
                          ) : (
                            <div
                              className="factor-chevron-box"
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                backgroundColor: isPrimary ? '#EEF2FD' : 'var(--keycloaked-bg-muted, #F7F2E9)',
                                color: isPrimary ? '#225EE2' : 'var(--keycloaked-muted, #626773)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {expanded.sms ? '▲' : '▼'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expanded Drawer */}
                      {expanded.sms && isConfigured && (
                        <div
                          style={{
                            padding: '1rem 1.25rem',
                            borderTop: '1px solid var(--keycloaked-border, #E2E8F0)',
                            backgroundColor: 'var(--keycloaked-bg-muted, #F7F2E9)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.75rem',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--keycloaked-text, #191420)' }}>
                              Verified Phone Number: <code>{phoneNumber}</code>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--keycloaked-muted, #626773)', marginTop: '0.2rem' }}>
                              Used for one-time SMS verification codes and Sudo step-up identity checks.
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {onRemovePhone && (
                              <Button
                                variant="outline"
                                size="sm"
                                style={{ color: '#D92D20', borderColor: '#FECDCA', padding: '0.35rem 0.75rem', height: '32px' }}
                                onClick={onRemovePhone}
                              >
                                Remove Phone
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              style={{ padding: '0.35rem 0.75rem', height: '32px' }}
                              onClick={onInitiateChangePhone}
                            >
                              Change Number
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                } else if (channel === 'whatsapp') {
                  // WhatsApp Channel Card
                  return (
                    <div
                      key="whatsapp"
                      style={{
                        border: isPrimary ? '1.5px solid #25D366' : '1.5px solid var(--keycloaked-border, #E2E8F0)',
                        borderRadius: '14px',
                        backgroundColor: 'var(--keycloaked-bg-surface, #FFFFFF)',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease',
                        boxShadow: isPrimary ? '0 2px 8px rgba(37, 211, 102, 0.15)' : 'none',
                      }}
                    >
                      {/* Row Header - Fully Clickable to Expand */}
                      <div
                        className="factor-clickable-row"
                        onClick={() => toggleExpand('whatsapp')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1rem 1.25rem',
                          backgroundColor: isPrimary ? 'rgba(37, 211, 102, 0.04)' : 'transparent',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        title={expanded.whatsapp ? 'Click to collapse details' : 'Click to expand details'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '7px',
                              backgroundColor: isPrimary ? '#25D366' : '#E8F8F0',
                              color: isPrimary ? '#FFFFFF' : '#1F9D55',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                            }}
                          >
                            {rankNumber}
                          </div>

                          <span style={{ fontSize: '1.2rem' }}>💬</span>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--keycloaked-text, #191420)' }}>
                                WhatsApp OTP
                              </span>
                              <Badge variant={isPrimary ? 'success' : 'sand'} size="sm">
                                {isPrimary ? `Rank #${rankNumber} · Primary OTP` : `Rank #${rankNumber} · Backup OTP`}
                              </Badge>
                              <Badge variant="success" size="sm">WhatsApp Linked</Badge>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--keycloaked-muted, #626773)', marginTop: '0.2rem' }}>
                              {phoneNumber} · Delivers via WhatsApp proxy
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          {hasMultipleChannels && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isPrimary) {
                                  const nextChannel = sortedActiveChannels.find((c) => c !== 'whatsapp');
                                  if (nextChannel) handleChannelChange(nextChannel);
                                } else {
                                  handleChannelChange('whatsapp');
                                }
                              }}
                              disabled={isSavingPref}
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: '8px',
                                border: '1px solid var(--keycloaked-border, #E2E8F0)',
                                backgroundColor: isPrimary ? 'var(--keycloaked-bg-surface, #FFFFFF)' : '#E8F8F0',
                                color: isPrimary ? 'var(--keycloaked-muted, #626773)' : '#1F9D55',
                                fontWeight: 600,
                                fontSize: '0.76rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                              title={isPrimary ? 'Make another channel primary' : 'Set WhatsApp as primary OTP channel'}
                            >
                              {isPrimary ? '⬇ Make Backup' : '⬆ Make Primary'}
                            </button>
                          )}

                          <div
                            className="factor-chevron-box"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              backgroundColor: isPrimary ? '#E8F8F0' : 'var(--keycloaked-bg-muted, #F7F2E9)',
                              color: isPrimary ? '#1F9D55' : 'var(--keycloaked-muted, #626773)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {expanded.whatsapp ? '▲' : '▼'}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Drawer */}
                      {expanded.whatsapp && (
                        <div
                          style={{
                            padding: '1rem 1.25rem',
                            borderTop: '1px solid var(--keycloaked-border, #E2E8F0)',
                            backgroundColor: 'var(--keycloaked-bg-muted, #F7F2E9)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.75rem',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--keycloaked-text, #191420)' }}>
                              Linked WhatsApp Number: <code>{phoneNumber}</code>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--keycloaked-muted, #626773)', marginTop: '0.2rem' }}>
                              WhatsApp OTP uses your single verified mobile phone number. Disabling WhatsApp does not remove your phone number.
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {onUnlinkWhatsApp && (
                              <Button
                                variant="outline"
                                size="sm"
                                style={{ color: '#D92D20', borderColor: '#FECDCA', padding: '0.35rem 0.75rem', height: '32px' }}
                                onClick={onUnlinkWhatsApp}
                              >
                                Unlink WhatsApp
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                } else {
                  // Email Channel Card
                  const isConfigured = Boolean(userEmail);
                  return (
                    <div
                      key="email"
                      style={{
                        border: isPrimary ? '1.5px solid #225EE2' : '1.5px solid var(--keycloaked-border, #E2E8F0)',
                        borderRadius: '14px',
                        backgroundColor: 'var(--keycloaked-bg-surface, #FFFFFF)',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease',
                        boxShadow: isPrimary ? '0 2px 8px rgba(34, 94, 226, 0.08)' : 'none',
                      }}
                    >
                      {/* Row Header - Fully Clickable to Expand */}
                      <div
                        className={isConfigured ? 'factor-clickable-row' : ''}
                        onClick={() => isConfigured && toggleExpand('email')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1rem 1.25rem',
                          backgroundColor: isPrimary ? 'rgba(34, 94, 226, 0.02)' : 'transparent',
                          cursor: isConfigured ? 'pointer' : 'default',
                          userSelect: 'none',
                        }}
                        title={isConfigured ? (expanded.email ? 'Click to collapse details' : 'Click to expand details') : undefined}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '7px',
                              backgroundColor: isPrimary ? '#225EE2' : '#EEF2FD',
                              color: isPrimary ? '#FFFFFF' : '#225EE2',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                            }}
                          >
                            {rankNumber}
                          </div>

                          <span style={{ fontSize: '1.2rem' }}>✉️</span>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--keycloaked-text, #191420)' }}>
                                Email Address OTP
                              </span>
                              <Badge variant={isPrimary ? 'success' : 'sand'} size="sm">
                                {isPrimary ? `Rank #${rankNumber} · Primary OTP` : `Rank #${rankNumber} · Backup OTP`}
                              </Badge>
                              {isConfigured && isEmailVerified ? (
                                <Badge variant="success" size="sm">Verified</Badge>
                              ) : isConfigured ? (
                                <Badge variant="sand" size="sm">Unverified</Badge>
                              ) : (
                                <Badge variant="sand" size="sm">Not Configured</Badge>
                              )}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--keycloaked-muted, #626773)', marginTop: '0.2rem' }}>
                              {isConfigured ? userEmail : 'No email address registered for code delivery'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          {/* Make Primary / Make Backup Toggle Button */}
                          {hasMultipleChannels && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isPrimary) {
                                  const nextChannel = sortedActiveChannels.find((c) => c !== 'email');
                                  if (nextChannel) handleChannelChange(nextChannel);
                                } else {
                                  handleChannelChange('email');
                                }
                              }}
                              disabled={isSavingPref}
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: '8px',
                                border: '1px solid var(--keycloaked-border, #E2E8F0)',
                                backgroundColor: isPrimary ? 'var(--keycloaked-bg-surface, #FFFFFF)' : '#EEF2FD',
                                color: isPrimary ? 'var(--keycloaked-muted, #626773)' : '#225EE2',
                                fontWeight: 600,
                                fontSize: '0.76rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                              title={isPrimary ? 'Make another channel primary' : 'Set Email as primary OTP channel'}
                            >
                              {isPrimary ? '⬇ Make Backup' : '⬆ Make Primary'}
                            </button>
                          )}

                          {!isConfigured ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onInitiateChangeEmail?.();
                              }}
                            >
                              + Add Email
                            </Button>
                          ) : (
                            <div
                              className="factor-chevron-box"
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                backgroundColor: isPrimary ? '#EEF2FD' : 'var(--keycloaked-bg-muted, #F7F2E9)',
                                color: isPrimary ? '#225EE2' : 'var(--keycloaked-muted, #626773)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {expanded.email ? '▲' : '▼'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expanded Drawer */}
                      {expanded.email && isConfigured && (
                        <div
                          style={{
                            padding: '1rem 1.25rem',
                            borderTop: '1px solid var(--keycloaked-border, #E2E8F0)',
                            backgroundColor: 'var(--keycloaked-bg-muted, #F7F2E9)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.75rem',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--keycloaked-text, #191420)' }}>
                              Verified Email: <code>{userEmail}</code>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--keycloaked-muted, #626773)', marginTop: '0.2rem' }}>
                              Primary email used for one-time login codes, account notifications, and recovery.
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {onRemoveEmail && (
                              <Button
                                variant="outline"
                                size="sm"
                                style={{ color: '#D92D20', borderColor: '#FECDCA', padding: '0.35rem 0.75rem', height: '32px' }}
                                onClick={onRemoveEmail}
                              >
                                Remove Email
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              style={{ padding: '0.35rem 0.75rem', height: '32px' }}
                              onClick={onInitiateChangeEmail}
                            >
                              Change Email
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
              })}

              {/* Unlinked WhatsApp Option Card */}
              {!isWhatsAppLinked && (
                <div
                  style={{
                    border: '1.5px dashed var(--keycloaked-border, #CBD5E1)',
                    borderRadius: '14px',
                    backgroundColor: 'var(--keycloaked-bg-surface, #FFFFFF)',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '7px',
                        backgroundColor: '#E8F8F0',
                        color: '#1F9D55',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                      }}
                    >
                      +
                    </div>
                    <span style={{ fontSize: '1.2rem' }}>💬</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--keycloaked-text, #191420)' }}>
                          WhatsApp Verification
                        </span>
                        <Badge variant="sand" size="sm">Available Factor</Badge>
                        <Badge variant="sand" size="sm">Not Linked</Badge>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--keycloaked-muted, #626773)', marginTop: '0.2rem' }}>
                        {phoneNumber
                          ? `Deliver 6-digit one-time passcodes to WhatsApp using your verified phone number (${phoneNumber})`
                          : 'Deliver 6-digit one-time passcodes to WhatsApp (requires verified mobile phone number)'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={onLinkWhatsApp}
                      style={{
                        backgroundColor: '#25D366',
                        borderColor: '#25D366',
                        color: '#FFFFFF',
                        fontWeight: 600,
                      }}
                    >
                      + Link WhatsApp
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

          {/* ========================================================================= */}
          {/* TIER 3: OPTIONAL FALLBACK AUTHENTICATION (PASSWORD)                       */}
          {/* ========================================================================= */}
          {factors.password.enabled && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1rem' }}>🗝️</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--keycloaked-muted, #626773)' }}>
                  Optional Fallback Tier
                </span>
              </div>

              <div
                style={{
                  border: '1.5px solid var(--keycloaked-border, #E2E8F0)',
                  borderRadius: '14px',
                  backgroundColor: 'var(--keycloaked-bg-surface, #FFFFFF)',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                {/* Row Header - Fully Clickable to Expand */}
                <div
                  className={passwordCred ? 'factor-clickable-row' : ''}
                  onClick={() => passwordCred && toggleExpand('password')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                    cursor: passwordCred ? 'pointer' : 'default',
                    backgroundColor: 'var(--keycloaked-bg-surface, #FFFFFF)',
                    userSelect: 'none',
                  }}
                  title={passwordCred ? (expanded.password ? 'Click to collapse details' : 'Click to expand details') : undefined}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--keycloaked-bg-muted, #F7F2E9)',
                        color: 'var(--keycloaked-muted, #626773)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                      }}
                    >
                      {passwordRank}
                    </div>
                    <span style={{ fontSize: '1.2rem' }}>🗝️</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--keycloaked-text, #191420)' }}>
                          Account Password
                        </span>
                        <Badge variant="sand" size="sm">Fallback</Badge>
                        {passwordCred ? (
                          <Badge variant="success" size="sm">Configured</Badge>
                        ) : (
                          <Badge variant="sand" size="sm">Not Configured</Badge>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--keycloaked-muted, #626773)', marginTop: '0.2rem' }}>
                        Optional legacy fallback if device biometrics or one-time code channels are unavailable
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdatePassword?.();
                      }}
                    >
                      {passwordCred ? 'Update' : '+ Set Password'}
                    </Button>
                    {passwordCred && (
                      <div
                        className="factor-chevron-box"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--keycloaked-bg-muted, #F7F2E9)',
                          color: 'var(--keycloaked-muted, #626773)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {expanded.password ? '▲' : '▼'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Drawer */}
                {expanded.password && passwordCred && (
                  <div
                    style={{
                      padding: '1rem 1.25rem',
                      borderTop: '1px solid var(--keycloaked-border, #E2E8F0)',
                      backgroundColor: 'var(--keycloaked-bg-muted, #F7F2E9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Password Credential</div>
                      {passwordCred.createdDate && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--keycloaked-muted, #626773)', marginTop: '0.2rem' }}>
                          Last modified {formatDate(passwordCred.createdDate)}
                        </div>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={onUpdatePassword}>
                      Change Password
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </Card>
  );
};
