export type VerificationStrategy = 'strong_verification' | 'password' | 'email_otp' | 'totp';

export interface WebauthnFactorConfig {
  enabled: boolean;
  prefer_passwordless?: boolean;
  conditional_ui?: boolean;
}

export interface PasswordFactorConfig {
  enabled: boolean;
  allow_fallback?: boolean;
}

export interface OtpFactorConfig {
  enabled: boolean;
  direct_passwordless?: boolean;
  channels: ('totp' | 'email' | 'sms')[];
}

export interface SocialFactorConfig {
  enabled: boolean;
  providers: string[];
}

export type FactorName = 'webauthn' | 'password' | 'otp' | 'social';

export interface FactorsConfig {
  mode?: 'passwordless_first' | 'passwordless_only' | 'hybrid';
  webauthn: WebauthnFactorConfig;
  password: PasswordFactorConfig;
  otp: OtpFactorConfig;
  social: SocialFactorConfig;
}

export interface FlowConfig {
  mode: 'identifier_first' | 'standard';
  auto_detect_signup_vs_signin: boolean;
  allow_registration: boolean;
  remember_me: boolean;
}

export interface AccountLinkingConfig {
  prompt_on_new_credential: boolean;
  prompt_on_signup_collision: boolean;
  verification_strategy: VerificationStrategy;
}

export interface UslWorkflowConfig {
  version: string;
  name: string;
  description?: string;
  factors: FactorsConfig;
  flow: FlowConfig;
  account_linking: AccountLinkingConfig;
}
