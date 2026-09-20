import { useState } from 'react';
import type { UslWorkflowConfig, FactorName } from './types';

/**
 * Default workflow configuration derived from usl-workflow.yaml
 */
export const DEFAULT_USL_WORKFLOW: UslWorkflowConfig = {
  version: '1.0',
  name: 'keycloaked-usl-workflow',
  description: 'Uber-style Unified Signup and Login (USL) workflow configuration',
  factors: {
    mode: 'passwordless_first',
    webauthn: {
      enabled: true,
      prefer_passwordless: true,
      conditional_ui: true,
    },
    otp: {
      enabled: true,
      direct_passwordless: true,
      channels: ['sms', 'email', 'totp'],
    },
    password: {
      enabled: true,
      allow_fallback: true,
    },
    social: {
      enabled: false,
      providers: [],
    },
  },
  flow: {
    mode: 'identifier_first',
    auto_detect_signup_vs_signin: true,
    allow_registration: true,
    remember_me: true,
  },
  account_linking: {
    prompt_on_new_credential: true,
    prompt_on_signup_collision: true,
    verification_strategy: 'strong_verification',
  },
};

let currentWorkflow: UslWorkflowConfig = { ...DEFAULT_USL_WORKFLOW };

export function getUslWorkflowConfig(): UslWorkflowConfig {
  return currentWorkflow;
}

export function setUslWorkflowConfig(newConfig: Partial<UslWorkflowConfig>) {
  currentWorkflow = {
    ...currentWorkflow,
    ...newConfig,
    factors: {
      ...currentWorkflow.factors,
      ...(newConfig.factors || {}),
    },
    flow: {
      ...currentWorkflow.flow,
      ...(newConfig.flow || {}),
    },
    account_linking: {
      ...currentWorkflow.account_linking,
      ...(newConfig.account_linking || {}),
    },
  };
}

export function isFactorEnabled(factor: FactorName): boolean {
  return currentWorkflow.factors[factor]?.enabled ?? false;
}

export function shouldPromptOnCollision(): boolean {
  return currentWorkflow.account_linking.prompt_on_signup_collision;
}

export function shouldPromptOnNewCredential(): boolean {
  return currentWorkflow.account_linking.prompt_on_new_credential;
}

export function useUslWorkflow() {
  const [config, setConfig] = useState<UslWorkflowConfig>(getUslWorkflowConfig());

  const updateFactor = (factor: FactorName, enabled: boolean) => {
    const updated = {
      ...config,
      factors: {
        ...config.factors,
        [factor]: {
          ...config.factors[factor],
          enabled,
        },
      },
    };
    currentWorkflow = updated;
    setConfig(updated);
  };

  const updateAccountLinking = (key: keyof UslWorkflowConfig['account_linking'], val: any) => {
    const updated = {
      ...config,
      account_linking: {
        ...config.account_linking,
        [key]: val,
      },
    };
    currentWorkflow = updated;
    setConfig(updated);
  };

  return {
    config,
    updateFactor,
    updateAccountLinking,
    isFactorEnabled: (factor: FactorName) => config.factors[factor]?.enabled ?? false,
  };
}
