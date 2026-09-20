import { useState, useEffect } from 'react';
import type { KeycloakProfile } from 'keycloak-js';
import { keycloak, initKeycloak } from './keycloak';
import {
  Logo,
  Button,
  Card,
  Badge,
  Alert,
  ThemeToggle,
  useTheme,
  useUslWorkflow,
  AccountLinkPrompt,
  AuthenticatorSelector,
  AccountSecurityCard,
  SudoModeModal,
  FactorVerificationModal,
  type CredentialTypeContainer,
} from '@keycloaked/ui';

export function App() {
  const { theme, resolvedTheme } = useTheme();
  const { config: workflow } = useUslWorkflow();
  const [showDemoModal, setShowDemoModal] = useState<'collision' | 'factors' | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [profile, setProfile] = useState<KeycloakProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'idToken' | 'accessToken' | 'raw'>('idToken');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // In-App Security State
  const [dashboardTab, setDashboardTab] = useState<'security' | 'profile'>(() => {
    const urlTab = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null;
    return urlTab === 'profile' ? 'profile' : 'security';
  });
  const [credentials, setCredentials] = useState<CredentialTypeContainer[]>([]);
  const [loadingCredentials, setLoadingCredentials] = useState(false);

  // Sudo Mode State
  const [sudoActiveUntil, setSudoActiveUntil] = useState<number | null>(null);
  const [sudoModalState, setSudoModalState] = useState<{
    isOpen: boolean;
    targetAction?: 'deleteCredential' | 'changeFactor' | 'removePhone';
    credentialId?: string;
    credentialLabel?: string;
    factorType?: 'phone' | 'email';
    excludeFactor?: 'phone' | 'email' | 'totp' | 'password' | 'webauthn';
  }>({ isOpen: false });

  // Factor Verification Modal State (Add or Change phone / email)
  const [factorModalState, setFactorModalState] = useState<{
    isOpen: boolean;
    factorType: 'phone' | 'email';
    mode: 'add' | 'change';
    currentValue: string;
  }>({
    isOpen: false,
    factorType: 'phone',
    mode: 'change',
    currentValue: '',
  });

  const [userAccount, setUserAccount] = useState<{
    attributes?: Record<string, string[]>;
    email?: string;
    emailVerified?: boolean;
  } | null>(null);

  const fetchAccountData = async () => {
    if (!keycloak.token) return;
    try {
      await keycloak.updateToken(30);
      const res = await fetch('http://localhost:8080/realms/playground/account', {
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUserAccount(data);
      }
    } catch (err) {
      console.error('Failed to load user account:', err);
    }
  };

  const handleUpdateOtpPreferences = async (phone: string, preferredChannel: 'sms' | 'whatsapp' | 'email') => {
    if (!keycloak.token) return;
    try {
      await keycloak.updateToken(30);
      const updatedAttributes: Record<string, string[]> = {
        ...(userAccount?.attributes || {}),
        preferred_otp_channel: [preferredChannel],
      };
      if (phone) {
        updatedAttributes.phone_number = [phone];
      }

      const updated = {
        ...(userAccount || {}),
        attributes: updatedAttributes,
      };

      const res = await fetch('http://localhost:8080/realms/playground/account', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(updated),
      });

      if (res.ok || res.status === 204) {
        const channelLabel =
          preferredChannel === 'whatsapp' ? 'WhatsApp' : preferredChannel === 'sms' ? 'Mobile SMS' : 'Email Address';
        showToast(`✓ ${channelLabel} set as Primary OTP sign-in channel.`);
        await fetchAccountData();
      } else {
        showToast('✕ Failed to update OTP preferences.');
      }
    } catch (err) {
      console.error('Error saving OTP preferences:', err);
      showToast('✕ Error saving OTP preferences.');
    }
  };

  const handleLinkWhatsApp = async () => {
    const phone = userAccount?.attributes?.phone_number?.[0];
    if (!phone) {
      showToast('⚠️ Please register and verify a mobile phone number first to link WhatsApp.');
      handleInitiateFactorFlow('phone');
      return;
    }

    if (!keycloak.token) return;
    try {
      await keycloak.updateToken(30);
      const updated = {
        ...(userAccount || {}),
        attributes: {
          ...(userAccount?.attributes || {}),
          whatsapp_enabled: ['true'],
        },
      };

      const res = await fetch('http://localhost:8080/realms/playground/account', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(updated),
      });

      if (res.ok || res.status === 204) {
        showToast(`✓ WhatsApp successfully linked to ${phone}.`);
        await fetchAccountData();
      } else {
        showToast('✕ Failed to link WhatsApp.');
      }
    } catch (err) {
      console.error('Error linking WhatsApp:', err);
      showToast('✕ Error linking WhatsApp.');
    }
  };

  const handleUnlinkWhatsApp = async () => {
    if (!keycloak.token) return;
    try {
      await keycloak.updateToken(30);
      const currentPref = userAccount?.attributes?.preferred_otp_channel?.[0];
      const updatedAttributes: Record<string, string[]> = {
        ...(userAccount?.attributes || {}),
        whatsapp_enabled: ['false'],
      };
      if (currentPref === 'whatsapp') {
        const hasPhone = Boolean(userAccount?.attributes?.phone_number?.[0]);
        updatedAttributes.preferred_otp_channel = [hasPhone ? 'sms' : 'email'];
      }

      const updated = {
        ...(userAccount || {}),
        attributes: updatedAttributes,
      };

      const res = await fetch('http://localhost:8080/realms/playground/account', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(updated),
      });

      if (res.ok || res.status === 204) {
        showToast('✓ WhatsApp unlinked from account.');
        await fetchAccountData();
      } else {
        showToast('✕ Failed to unlink WhatsApp.');
      }
    } catch (err) {
      console.error('Error unlinking WhatsApp:', err);
      showToast('✕ Error unlinking WhatsApp.');
    }
  };

  const fetchCredentials = async () => {
    if (!keycloak.token) return;
    setLoadingCredentials(true);
    try {
      await keycloak.updateToken(30);
      const res = await fetch('http://localhost:8080/realms/playground/account/credentials', {
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setCredentials(data);
      }
    } catch (err) {
      console.error('Failed to load credentials:', err);
    } finally {
      setLoadingCredentials(false);
    }
  };

  const handleUpdatePassword = () => {
    keycloak.login({
      action: 'UPDATE_PASSWORD',
      redirectUri: `${window.location.origin}/?theme=${theme}&tab=security`,
    });
  };

  const handleSetupPasskey = () => {
    keycloak.login({
      action: 'webauthn-register-passwordless',
      redirectUri: `${window.location.origin}/?theme=${theme}&tab=security`,
    });
  };

  const handleSetupTotp = () => {
    keycloak.login({
      action: 'CONFIGURE_TOTP',
      redirectUri: `${window.location.origin}/?theme=${theme}&tab=security`,
    });
  };

  const isSudoValid = () => {
    return Boolean(sudoActiveUntil && Date.now() < sudoActiveUntil);
  };

  const handleSudoPasswordVerify = async (password: string): Promise<boolean> => {
    const currentUsername = keycloak.tokenParsed?.preferred_username || profile?.username || '';
    if (!currentUsername) {
      showToast('✕ Unable to determine username for identity verification.');
      return false;
    }

    try {
      const verifyRes = await fetch('http://localhost:8080/realms/playground/protocol/openid-connect/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: 'example-app',
          grant_type: 'password',
          username: currentUsername,
          password: password,
        }),
      });

      if (!verifyRes.ok) {
        const errJson = await verifyRes.json().catch(() => null);
        console.warn('Sudo Mode password verification failed for user:', currentUsername, errJson);
        return false;
      }

      setSudoActiveUntil(Date.now() + 5 * 60 * 1000);
      return true;
    } catch (err) {
      console.error('Error during Sudo Mode password verification:', err);
      return false;
    }
  };

  const executeDeleteCredential = async (credentialId: string, credentialLabel?: string) => {
    if (!keycloak.token) return;
    try {
      await keycloak.updateToken(30);
      const delRes = await fetch(
        `http://localhost:8080/realms/playground/account/credentials/${credentialId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${keycloak.token}`,
            Accept: 'application/json',
          },
        }
      );

      if (delRes.ok) {
        showToast(`✓ ${credentialLabel || 'Credential'} removed successfully.`);
        fetchCredentials();
      } else {
        const errJson = await delRes.json().catch(() => null);
        const errMessage = errJson?.error || errJson?.errorMessage || `HTTP ${delRes.status}`;
        console.error('Failed to delete credential:', delRes.status, errJson);
        showToast(`✕ Failed to remove credential: ${errMessage}`);
      }
    } catch (err) {
      console.error('Error during credential deletion:', err);
      showToast('✕ An error occurred during credential deletion.');
    }
  };

  const handleSudoSuccess = () => {
    const action = sudoModalState.targetAction;
    const credId = sudoModalState.credentialId;
    const credLabel = sudoModalState.credentialLabel;
    const fType = sudoModalState.factorType;

    setSudoActiveUntil(Date.now() + 5 * 60 * 1000);
    setSudoModalState({ isOpen: false });

    if (action === 'deleteCredential' && credId) {
      executeDeleteCredential(credId, credLabel);
    } else if (action === 'changeFactor' && fType) {
      const currentVal = fType === 'phone'
        ? (userAccount?.attributes?.phone_number?.[0] || '')
        : (profile?.email || userAccount?.email || '');
      setFactorModalState({
        isOpen: true,
        factorType: fType,
        mode: currentVal ? 'change' : 'add',
        currentValue: currentVal,
      });
    } else if (action === 'removePhone') {
      executeRemovePhone();
    }
  };

  const handleRemovePhoneClick = () => {
    if (isSudoValid()) {
      executeRemovePhone();
    } else {
      setSudoModalState({
        isOpen: true,
        targetAction: 'removePhone',
        excludeFactor: 'phone',
        credentialLabel: 'Mobile Phone',
      });
    }
  };

  const executeRemovePhone = async () => {
    try {
      if (keycloak.token) {
        await keycloak.updateToken(30);
        const updated = {
          ...userAccount,
          attributes: {
            ...userAccount?.attributes,
            phone_number: [],
            preferred_otp_channel: ['email'],
          },
        };
        const res = await fetch(`${keycloak.authServerUrl}/realms/${keycloak.realm}/account`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${keycloak.token}`,
          },
          body: JSON.stringify(updated),
        });
        if (!res.ok) {
          throw new Error('Failed to remove phone number');
        }
        await fetchAccountData();
        showToast('✓ Mobile phone factor removed successfully.');
      }
    } catch (err) {
      console.error('Error removing phone number:', err);
      showToast('✕ Error removing phone number.');
    }
  };

  const handleRemoveEmailClick = () => {
    // Email is the account's root identity anchor. If user tries to remove it:
    // It triggers Sudo with excludeFactor: 'email'.
    // If email is their sole factor, it triggers the sole-factor replacement modal.
    // If they have other factors, Sudo prompts for verification to replace email.
    setSudoModalState({
      isOpen: true,
      targetAction: 'changeFactor',
      factorType: 'email',
      excludeFactor: 'email',
      credentialLabel: 'Email Address',
    });
  };

  const handleReplaceFactorFromSudo = (factor: 'phone' | 'email' | 'totp' | 'password' | 'webauthn') => {
    setSudoModalState({ isOpen: false });
    if (factor === 'phone' || factor === 'email') {
      const currentVal = factor === 'phone'
        ? (userAccount?.attributes?.phone_number?.[0] || '')
        : (profile?.email || userAccount?.email || '');
      setFactorModalState({
        isOpen: true,
        factorType: factor,
        mode: 'change',
        currentValue: currentVal,
      });
    } else if (factor === 'totp') {
      handleSetupTotp();
    } else if (factor === 'webauthn') {
      handleSetupPasskey();
    } else if (factor === 'password') {
      handleUpdatePassword();
    }
  };

  const handleAddBackupFactorFromSudo = (factor: 'phone' | 'email' | 'totp' | 'password' | 'webauthn') => {
    setSudoModalState({ isOpen: false });
    if (factor === 'phone' || factor === 'email') {
      setFactorModalState({
        isOpen: true,
        factorType: factor,
        mode: 'add',
        currentValue: '',
      });
    } else if (factor === 'totp') {
      handleSetupTotp();
    } else if (factor === 'webauthn') {
      handleSetupPasskey();
    } else if (factor === 'password') {
      handleUpdatePassword();
    }
  };

  const handleDeleteCredentialClick = (id: string, label: string, type?: string) => {
    let excludeFactor: 'phone' | 'email' | 'totp' | 'password' | 'webauthn' | undefined;
    if (type === 'otp') excludeFactor = 'totp';
    else if (type === 'webauthn') excludeFactor = 'webauthn';
    else if (type === 'password') excludeFactor = 'password';

    if (isSudoValid()) {
      executeDeleteCredential(id, label);
    } else {
      setSudoModalState({
        isOpen: true,
        targetAction: 'deleteCredential',
        credentialId: id,
        credentialLabel: label,
        excludeFactor,
      });
    }
  };

  const handleInitiateFactorFlow = (factorType: 'phone' | 'email') => {
    const currentVal = factorType === 'phone'
      ? (userAccount?.attributes?.phone_number?.[0] || '')
      : (profile?.email || userAccount?.email || '');

    if (isSudoValid()) {
      setFactorModalState({
        isOpen: true,
        factorType,
        mode: currentVal ? 'change' : 'add',
        currentValue: currentVal,
      });
    } else {
      setSudoModalState({
        isOpen: true,
        targetAction: 'changeFactor',
        factorType,
        excludeFactor: currentVal ? factorType : undefined,
        credentialLabel: factorType === 'phone' ? 'Mobile Phone' : 'Email Address',
      });
    }
  };

  const handleFactorSuccess = async (verifiedValue: string) => {
    const factorType = factorModalState.factorType;
    try {
      if (keycloak.token) {
        await keycloak.updateToken(30);
        const updated = {
          ...(userAccount || {}),
        };
        if (factorType === 'phone') {
          updated.attributes = {
            ...(userAccount?.attributes || {}),
            phone_number: [verifiedValue],
          };
        } else {
          updated.email = verifiedValue;
          updated.emailVerified = true;
        }

        await fetch('http://localhost:8080/realms/playground/account', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${keycloak.token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(updated),
        }).catch((err) => console.warn('Account sync warning:', err));
      }

      await fetchAccountData();
      if (keycloak.authenticated) {
        await keycloak.loadUserProfile().then((p) => setProfile(p)).catch(() => {});
      }
      showToast(`✓ ${factorType === 'phone' ? 'Mobile phone' : 'Email address'} verified and updated to ${verifiedValue}.`);
      setFactorModalState((prev) => ({ ...prev, isOpen: false }));
    } catch (err) {
      console.error('Error saving updated factor:', err);
      showToast('✕ Error updating account credentials.');
    }
  };

  useEffect(() => {
    initKeycloak()
      .then((auth) => {
        setAuthenticated(auth);
        setInitialized(true);
        if (auth) {
          keycloak.loadUserProfile().then((p) => setProfile(p));
          setRoles(keycloak.realmAccess?.roles || []);
          fetchCredentials();
          fetchAccountData();
        }
      })
      .catch((err) => {
        console.error('Failed to initialize Keycloak:', err);
        setInitialized(true);
      });
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleLogin = async () => {
    try {
      const activeTheme = resolvedTheme;
      const loginUrl = await keycloak.createLoginUrl({
        redirectUri: `${window.location.origin}/?theme=${theme}`,
      });
      window.location.href = `${loginUrl}&theme=${activeTheme}`;
    } catch {
      keycloak.login({
        redirectUri: `${window.location.origin}/?theme=${theme}`,
      });
    }
  };


  const handleLogout = () => {
    keycloak.logout({
      redirectUri: `${window.location.origin}/?theme=${theme}`,
    });
  };

  const handleRefreshToken = async () => {
    try {
      const refreshed = await keycloak.updateToken(-1);
      if (refreshed) {
        showToast('✓ Token successfully refreshed!');
      } else {
        showToast('ℹ Token is still active & valid.');
      }
    } catch {
      showToast('✕ Token refresh failed. Please sign in again.');
      setAuthenticated(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`✓ ${label} copied to clipboard!`);
  };

  if (!initialized) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--keycloaked-sand, #FCFAF6)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <Logo variant="blue" size="lg" />
          </div>
          <p style={{ color: 'var(--keycloaked-muted, #626773)', fontSize: '0.95rem' }}>
            Connecting to Keycloak SSO...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="keycloaked-header">
        <div className="keycloaked-header-container">
          <div className="keycloaked-header-left">
            <Logo variant="blue" size="md" />
            <div className="keycloaked-header-meta">
              <Badge variant="sand" size="sm">realm: playground</Badge>
              <Badge variant="blue" size="sm">client: example-app</Badge>
            </div>
          </div>

          <div className="keycloaked-header-right">
            <ThemeToggle showLabel />

            <Badge
              variant={authenticated ? 'success' : 'sand'}
              size="md"
              dot
              id="auth-status-badge"
            >
              {authenticated ? 'Active Session' : 'Signed Out'}
            </Badge>

            {authenticated ? (
              <Button id="btn-header-logout" variant="ghost" size="sm" onClick={handleLogout}>
                Sign Out
              </Button>
            ) : (
              <Button id="btn-header-login" variant="primary" size="sm" onClick={handleLogin}>
                Continue
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="keycloaked-main-content">
        {!authenticated ? (
          <>
            <section className="keycloaked-hero">
              <div className="keycloaked-hero-pill">
                <span>🔐</span>
                <span>Keycloaked Unified Authentication Architecture</span>
              </div>

              <h1 className="keycloaked-hero-title">
                Unified authentication <span className="highlight-blue">seamlessly</span> with <span className="highlight-coral">Keycloaked</span>
              </h1>

              <p className="keycloaked-hero-subtitle">
                Experience the shared Keycloaked design system powering both our client SPA and our Keycloak authentication flows through <code>@keycloaked/ui</code>.
              </p>

              <div className="keycloaked-hero-credentials">
                <div style={{ fontWeight: 700, color: 'var(--keycloaked-black, #191420)', marginBottom: '0.2rem' }}>
                  🔑 Sample Playground Credentials
                </div>
                <div>Email: <code>testuser@example.com</code> or Phone: <code>+31 6 0000 0000</code></div>
                <div>Password (Fallback): <code>password123</code></div>
              </div>

              <div className="keycloaked-hero-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
                <Button id="btn-hero-continue" variant="coral" size="lg" onClick={handleLogin}>
                  Continue to Keycloaked ➔
                </Button>
                <div style={{ fontSize: '0.85rem', color: 'var(--keycloaked-muted, #626773)', fontWeight: 500 }}>
                  Unified Sign-In &amp; Sign-Up &middot; Instant access with Passkey, Phone, or Email
                </div>
              </div>
            </section>

            <div className="keycloaked-features-grid">
              <Card variant="elevated" padding="md" className="keycloaked-feature-card">
                <div className="keycloaked-feature-icon" style={{ background: 'var(--keycloaked-blue-light, #EEF2FD)', color: 'var(--keycloaked-blue, #225EE2)' }}>
                  ⚡
                </div>
                <h2 className="keycloaked-feature-title">Uber-Style USL</h2>
                <p className="keycloaked-feature-desc">
                  Unified Sign-in & Sign-up governed by <code>usl-workflow.yaml</code>. Automatically routes between login, registration, and factor linking.
                </p>
              </Card>

              <Card variant="elevated" padding="md" className="keycloaked-feature-card">
                <div className="keycloaked-feature-icon" style={{ background: 'var(--keycloaked-coral-light, #FFF0E8)', color: 'var(--keycloaked-coral, #FF8048)' }}>
                  🔗
                </div>
                <h2 className="keycloaked-feature-title">Smart Account Linking</h2>
                <p className="keycloaked-feature-desc">
                  Colliding identifiers and unlinked credentials prompt the user to link their existing account with multi-factor strong verification.
                </p>
              </Card>

              <Card variant="elevated" padding="md" className="keycloaked-feature-card">
                <div className="keycloaked-feature-icon" style={{ background: '#EAF7EE', color: 'var(--keycloaked-success, #2EB84F)' }}>
                  🔑
                </div>
                <h2 className="keycloaked-feature-title">Passkey & WebAuthn First</h2>
                <p className="keycloaked-feature-desc">
                  Biometric Face ID / Touch ID authentication enabled as primary factor with fallback to Password + Conditional OTP.
                </p>
              </Card>
            </div>

            {/* USL Interactive Workflow Inspector & Policy Sandbox */}
            <section style={{ marginTop: '2.5rem', marginBottom: '2rem' }}>
              <Card variant="elevated" padding="lg" style={{ borderRadius: 'var(--radius-xl, 24px)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--keycloaked-black, #191420)' }}>
                        USL Policy & Workflow Engine
                      </h2>
                      <Badge variant="blue" size="sm">usl-workflow.yaml</Badge>
                    </div>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--keycloaked-muted, #626773)' }}>
                      Declarative authentication rules shaping the sign-in / sign-up journey across Keycloak and Keycloaked
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button
                      variant={showDemoModal === 'collision' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setShowDemoModal(showDemoModal === 'collision' ? null : 'collision')}
                    >
                      Demo Account Collision
                    </Button>
                    <Button
                      variant={showDemoModal === 'factors' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setShowDemoModal(showDemoModal === 'factors' ? null : 'factors')}
                    >
                      Demo Factor Selector
                    </Button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: 'var(--keycloaked-sand, #FCFAF6)', border: '1px solid var(--keycloaked-border, #E2E8F0)' }}>
                    <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--keycloaked-muted, #626773)', fontWeight: 600 }}>
                      Passkey / WebAuthn
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                      <Badge variant={workflow.factors.webauthn.enabled ? 'success' : 'sand'} size="sm" dot>
                        {workflow.factors.webauthn.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <span style={{ fontSize: '0.82rem', color: 'var(--keycloaked-text, #191420)' }}>
                        {workflow.factors.webauthn.prefer_passwordless ? 'Passwordless Preferred' : '2FA Secondary'}
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: 'var(--keycloaked-sand, #FCFAF6)', border: '1px solid var(--keycloaked-border, #E2E8F0)' }}>
                    <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--keycloaked-muted, #626773)', fontWeight: 600 }}>
                      Password Authentication
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                      <Badge variant={workflow.factors.password.enabled ? 'success' : 'sand'} size="sm" dot>
                        {workflow.factors.password.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <span style={{ fontSize: '0.82rem', color: 'var(--keycloaked-text, #191420)' }}>
                        {workflow.factors.password.allow_fallback ? 'Fallback Allowed' : 'Strict'}
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: 'var(--keycloaked-sand, #FCFAF6)', border: '1px solid var(--keycloaked-border, #E2E8F0)' }}>
                    <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--keycloaked-muted, #626773)', fontWeight: 600 }}>
                      One-Time Code (OTP)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                      <Badge variant={workflow.factors.otp.enabled ? 'success' : 'sand'} size="sm" dot>
                        {workflow.factors.otp.enabled ? 'Conditional' : 'Disabled'}
                      </Badge>
                      <span style={{ fontSize: '0.82rem', color: 'var(--keycloaked-text, #191420)' }}>
                        {workflow.factors.otp.channels.join(', ')}
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: 'var(--keycloaked-sand, #FCFAF6)', border: '1px solid var(--keycloaked-border, #E2E8F0)' }}>
                    <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--keycloaked-muted, #626773)', fontWeight: 600 }}>
                      Account Linking
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                      <Badge variant={workflow.account_linking.prompt_on_signup_collision ? 'success' : 'sand'} size="sm" dot>
                        {workflow.account_linking.prompt_on_signup_collision ? 'Active' : 'Disabled'}
                      </Badge>
                      <span style={{ fontSize: '0.82rem', color: 'var(--keycloaked-text, #191420)' }}>
                        {workflow.account_linking.verification_strategy}
                      </span>
                    </div>
                  </div>
                </div>

                {showDemoModal === 'collision' && (
                  <div style={{ marginTop: '1.5rem', padding: '1.5rem', border: '1.5px dashed var(--keycloaked-coral, #FF8048)', borderRadius: '16px', backgroundColor: 'var(--keycloaked-sand, #FCFAF6)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--keycloaked-coral, #FF8048)' }}>
                        ✦ Interactive Preview: Account Collision Resolution (Uber USL)
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => setShowDemoModal(null)}>
                        ✕ Close
                      </Button>
                    </div>
                    <AccountLinkPrompt
                      identifier="testuser@example.com"
                      sourceFactorName="Google SSO"
                      type="collision"
                      onLink={() => {
                        showToast('✓ Proceeding to verify against primary credentials before linking...');
                        setShowDemoModal(null);
                      }}
                      onCancel={() => setShowDemoModal(null)}
                    />
                  </div>
                )}

                {showDemoModal === 'factors' && (
                  <div style={{ marginTop: '1.5rem', padding: '1.5rem', border: '1.5px dashed var(--keycloaked-blue, #225EE2)', borderRadius: '16px', backgroundColor: 'var(--keycloaked-sand, #FCFAF6)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--keycloaked-blue, #225EE2)' }}>
                        ✦ Interactive Preview: Multi-Factor "Try Another Way" Selector
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => setShowDemoModal(null)}>
                        ✕ Close
                      </Button>
                    </div>
                    <div style={{ maxWidth: '440px', margin: '0 auto' }}>
                      <AuthenticatorSelector
                        onSelectOption={(factor) => {
                          showToast(`Selected factor: ${factor}`);
                          setShowDemoModal(null);
                        }}
                        onCancel={() => setShowDemoModal(null)}
                      />
                    </div>
                  </div>
                )}
              </Card>
            </section>
          </>
        ) : (
          <div className="keycloaked-dashboard-wrapper">
            {/* View Switcher: Native Security vs Profile */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
              <Button
                variant={dashboardTab === 'security' ? 'primary' : 'outline'}
                size="md"
                onClick={() => setDashboardTab('security')}
              >
                🛡️ Account Security & Passkeys
              </Button>
              <Button
                variant={dashboardTab === 'profile' ? 'primary' : 'outline'}
                size="md"
                onClick={() => setDashboardTab('profile')}
              >
                👤 Profile & Token Inspector
              </Button>
            </div>

            {dashboardTab === 'security' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '1.5rem', alignItems: 'start' }}>
                <AccountSecurityCard
                  credentials={credentials}
                  isLoading={loadingCredentials}
                  phoneNumber={userAccount?.attributes?.phone_number?.[0] || ''}
                  preferredOtpChannel={(userAccount?.attributes?.preferred_otp_channel?.[0] as 'sms' | 'whatsapp' | 'email') || 'sms'}
                  userEmail={profile?.email || userAccount?.email || ''}
                  isEmailVerified={profile?.emailVerified ?? userAccount?.emailVerified ?? true}
                  isWhatsAppLinked={userAccount?.attributes?.whatsapp_enabled?.[0] === 'true'}
                  onUpdatePassword={handleUpdatePassword}
                  onSetupPasskey={handleSetupPasskey}
                  onSetupTotp={handleSetupTotp}
                  onDeleteCredential={handleDeleteCredentialClick}
                  onUpdateOtpPreferences={handleUpdateOtpPreferences}
                  onInitiateChangePhone={() => handleInitiateFactorFlow('phone')}
                  onInitiateChangeEmail={() => handleInitiateFactorFlow('email')}
                  onRemovePhone={handleRemovePhoneClick}
                  onRemoveEmail={handleRemoveEmailClick}
                  onLinkWhatsApp={handleLinkWhatsApp}
                  onUnlinkWhatsApp={handleUnlinkWhatsApp}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Card variant="elevated" padding="md">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>🛡️</span>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Security Posture</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--keycloaked-muted, #626773)' }}>Sudo Mode Protection</span>
                        <Badge variant={isSudoValid() ? 'success' : 'sand'} size="sm">
                          {isSudoValid() ? 'Active (5m Grace)' : 'Armed (Step-Up)'}
                        </Badge>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--keycloaked-muted, #626773)' }}>Mobile Phone</span>
                        <Badge variant={userAccount?.attributes?.phone_number?.[0] ? 'success' : 'sand'} size="sm">
                          {userAccount?.attributes?.phone_number?.[0] ? 'Verified' : 'Not Set'}
                        </Badge>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--keycloaked-muted, #626773)' }}>WhatsApp OTP</span>
                        <Badge variant={userAccount?.attributes?.whatsapp_enabled?.[0] === 'true' ? 'success' : 'sand'} size="sm">
                          {userAccount?.attributes?.whatsapp_enabled?.[0] === 'true' ? 'Linked' : 'Not Linked'}
                        </Badge>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--keycloaked-muted, #626773)' }}>Email Address</span>
                        <Badge variant={profile?.email || userAccount?.email ? 'success' : 'sand'} size="sm">
                          {profile?.email || userAccount?.email ? 'Verified' : 'Not Set'}
                        </Badge>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--keycloaked-muted, #626773)' }}>Hardware Passkeys</span>
                        <Badge variant={credentials.some(c => c.type.includes('webauthn') && c.userCredentialMetadatas && c.userCredentialMetadatas.length > 0) ? 'success' : 'sand'} size="sm">
                          {credentials.some(c => c.type.includes('webauthn') && c.userCredentialMetadatas && c.userCredentialMetadatas.length > 0) ? 'Enabled' : 'Not Set'}
                        </Badge>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--keycloaked-muted, #626773)' }}>Two-Factor (TOTP)</span>
                        <Badge variant={credentials.some(c => c.type === 'otp' && c.userCredentialMetadatas && c.userCredentialMetadatas.length > 0) ? 'success' : 'sand'} size="sm">
                          {credentials.some(c => c.type === 'otp' && c.userCredentialMetadatas && c.userCredentialMetadatas.length > 0) ? 'Enabled' : 'Not Set'}
                        </Badge>
                      </div>
                    </div>
                  </Card>

                  <Card variant="sand" padding="md">
                    <div style={{ fontSize: '0.825rem', color: 'var(--keycloaked-muted, #626773)', lineHeight: 1.5 }}>
                      💡 <strong>Native In-App Architecture:</strong> Backed directly by Keycloak's Account REST API with Sudo Mode Step-Up verification &amp; out-of-band factor confirmation. No external legacy consoles required.
                    </div>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="keycloaked-dashboard-grid">
                {/* Left Column: Profile Card */}
                <Card variant="elevated" padding="lg" id="user-profile-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--keycloaked-black, #191420)' }}>
                      User Profile
                    </h2>
                    <Badge variant="success" size="sm" dot>Active</Badge>
                  </div>

                  <div className="profile-avatar-row">
                    <div className="profile-avatar">
                      {profile?.firstName ? profile.firstName[0].toUpperCase() : profile?.username ? profile.username[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="profile-name">
                        {profile?.firstName || profile?.lastName ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : profile?.username}
                      </div>
                      <div className="profile-email">{profile?.email || 'No email registered'}</div>
                    </div>
                  </div>

                  <div className="profile-info-list">
                    <div className="profile-info-item">
                      <span className="profile-info-label">Subject ID (sub)</span>
                      <span className="profile-info-value" title={keycloak.subject}>
                        {keycloak.subject ? `${keycloak.subject.slice(0, 12)}...` : '—'}
                      </span>
                    </div>
                    <div className="profile-info-item">
                      <span className="profile-info-label">Company User UUID (preferred_username)</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <code style={{ fontSize: '0.82rem', fontFamily: 'monospace', backgroundColor: 'var(--keycloaked-sand, #F5F4F0)', padding: '2px 6px', borderRadius: '4px' }}>
                          {keycloak.tokenParsed?.preferred_username || profile?.username || '—'}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const uuid = keycloak.tokenParsed?.preferred_username || profile?.username || '';
                            if (uuid) {
                              navigator.clipboard.writeText(uuid);
                              showToast('✓ Company User UUID copied to clipboard!');
                            }
                          }}
                          style={{ padding: '2px 6px', height: 'auto', minHeight: 'unset' }}
                          title="Copy UUID"
                        >
                          📋
                        </Button>
                      </div>
                    </div>
                    <div className="profile-info-item">
                      <span className="profile-info-label">Email Verified</span>
                      <Badge variant={profile?.emailVerified ? 'success' : 'sand'} size="sm">
                        {profile?.emailVerified ? '✓ Verified' : '✕ Unverified'}
                      </Badge>
                    </div>
                  </div>

                  <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--keycloaked-muted, #626773)', fontWeight: 600 }}>
                      Assigned Realm Roles
                    </div>
                    <div className="roles-container">
                      {roles.length > 0 ? (
                        roles.map((role) => (
                          <Badge
                            key={role}
                            variant={role === 'admin' ? 'coral' : role.startsWith('default') ? 'sand' : 'blue'}
                            size="sm"
                          >
                            {role}
                          </Badge>
                        ))
                      ) : (
                        <span style={{ color: 'var(--keycloaked-subtle, #9499A5)', fontSize: '0.85rem' }}>No realm roles</span>
                      )}
                    </div>
                  </div>

                  <div className="profile-actions">
                    <Button id="btn-refresh-token" variant="secondary" size="md" fullWidth onClick={handleRefreshToken}>
                      🔄 Refresh Token
                    </Button>
                    <Button
                      id="btn-account-console"
                      variant="outline"
                      size="md"
                      fullWidth
                      onClick={() => setDashboardTab('security')}
                    >
                      🛡️ Security & Credentials (In-App)
                    </Button>
                    <Button id="btn-card-logout" variant="coral" size="md" fullWidth onClick={handleLogout}>
                      Sign Out
                    </Button>
                  </div>
                </Card>

                {/* Right Column: Token Inspector Card */}
                <Card variant="elevated" padding="lg" id="token-inspector-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--keycloaked-black, #191420)' }}>
                        Token Inspector
                      </h2>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--keycloaked-muted, #626773)' }}>
                        Inspecting decoded JWTs and claims issued by Keycloak
                      </p>
                    </div>
                    <Badge variant="sand" size="sm">PKCE S256</Badge>
                  </div>

                  <div className="token-tabs">
                    <button
                      id="tab-id-token"
                      className={`token-tab-btn ${activeTab === 'idToken' ? 'active' : ''}`}
                      onClick={() => setActiveTab('idToken')}
                    >
                      ID Token
                    </button>
                    <button
                      id="tab-access-token"
                      className={`token-tab-btn ${activeTab === 'accessToken' ? 'active' : ''}`}
                      onClick={() => setActiveTab('accessToken')}
                    >
                      Access Token
                    </button>
                    <button
                      id="tab-raw"
                      className={`token-tab-btn ${activeTab === 'raw' ? 'active' : ''}`}
                      onClick={() => setActiveTab('raw')}
                    >
                      Raw Token
                    </button>
                  </div>

                  <div className="token-content-area">
                    {activeTab === 'idToken' && (
                      <pre className="token-json">{JSON.stringify(keycloak.idTokenParsed, null, 2)}</pre>
                    )}
                    {activeTab === 'accessToken' && (
                      <pre className="token-json">{JSON.stringify(keycloak.tokenParsed, null, 2)}</pre>
                    )}
                    {activeTab === 'raw' && (
                      <div className="token-raw-container">
                        <textarea
                          readOnly
                          className="token-raw-textarea"
                          value={keycloak.token || 'No active access token'}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => copyToClipboard(keycloak.token || '', 'Access token')}
                        >
                          Copy Raw Token
                        </Button>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '1.25rem' }}>
                    <Alert type="info">
                      <span>
                        Keycloak issued token expires in{' '}
                        <strong>
                          {keycloak.tokenParsed?.exp
                            ? Math.max(0, Math.round(keycloak.tokenParsed.exp - Date.now() / 1000))
                            : 0}
                          s
                        </strong>
                        . Standard PKCE S256 flow.
                      </span>
                    </Alert>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}
      </main>

      <SudoModeModal
        isOpen={sudoModalState.isOpen}
        actionTitle={
          sudoModalState.targetAction === 'changeFactor'
            ? `Authorize ${sudoModalState.credentialLabel || 'Factor'} Modification`
            : (sudoModalState.credentialLabel ? `Remove ${sudoModalState.credentialLabel}` : 'Confirm Identity')
        }
        hasPassword={credentials.some((c) => c.type === 'password' && c.userCredentialMetadatas && c.userCredentialMetadatas.length > 0)}
        hasTotp={credentials.some((c) => c.type === 'otp' && c.userCredentialMetadatas && c.userCredentialMetadatas.length > 0)}
        hasWebauthn={credentials.some((c) => (c.type === 'webauthn' || c.type === 'webauthn-passwordless') && c.userCredentialMetadatas && c.userCredentialMetadatas.length > 0)}
        currentPhoneNumber={userAccount?.attributes?.phone_number?.[0] || ''}
        currentEmail={profile?.email || userAccount?.email || ''}
        excludeFactor={sudoModalState.excludeFactor}
        onConfirmPassword={handleSudoPasswordVerify}
        onSudoSuccess={handleSudoSuccess}
        onCancel={() => setSudoModalState({ isOpen: false })}
        onReplaceFactor={handleReplaceFactorFromSudo}
        onAddBackupFactor={handleAddBackupFactorFromSudo}
      />

      <FactorVerificationModal
        isOpen={factorModalState.isOpen}
        factorType={factorModalState.factorType}
        mode={factorModalState.mode}
        currentValue={factorModalState.currentValue}
        userId={profile?.id || keycloak.subject || ''}
        onSuccess={handleFactorSuccess}
        onCancel={() => setFactorModalState((prev) => ({ ...prev, isOpen: false }))}
      />

      {toastMessage && <div className="keycloaked-toast">{toastMessage}</div>}

      <footer className="keycloaked-footer">
        <div>
          Keycloaked Single Sign-On Architecture &middot;{' '}
          <a href="http://localhost:8080/admin" target="_blank" rel="noreferrer">
            Keycloak Admin Console
          </a>{' '}
          &middot;{' '}
          <a href="https://docs.keycloakify.dev" target="_blank" rel="noreferrer">
            Keycloakify Documentation
          </a>
        </div>
      </footer>
    </>
  );
}

export default App;
