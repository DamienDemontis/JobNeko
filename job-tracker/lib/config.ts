/**
 * Platform Configuration
 *
 * Determines deployment mode and feature availability
 */

export type DeploymentMode = 'self_hosted' | 'saas';

export interface PlatformConfig {
  deploymentMode: DeploymentMode;
  isSelfHosted: boolean;
  isSaaS: boolean;
  features: {
    subscriptions: boolean;
    platformApiKey: boolean;
    mandatoryUserApiKey: boolean;
    stripeIntegration: boolean;
    usageTracking: boolean;
  };
}

/**
 * Get current deployment mode from environment
 */
export function getDeploymentMode(): DeploymentMode {
  const mode = process.env.DEPLOYMENT_MODE?.toLowerCase();

  if (mode === 'saas') return 'saas';

  // Default to self_hosted for safety
  return 'self_hosted';
}

/**
 * Get platform configuration based on deployment mode
 */
export function getPlatformConfig(): PlatformConfig {
  const deploymentMode = getDeploymentMode();
  const isSelfHosted = deploymentMode === 'self_hosted';
  const isSaaS = deploymentMode === 'saas';

  return {
    deploymentMode,
    isSelfHosted,
    isSaaS,
    features: {
      // Subscriptions only in SaaS mode
      subscriptions: isSaaS,

      // Platform API key available in SaaS mode
      platformApiKey: isSaaS,

      // User must provide their own API key in self-hosted mode
      mandatoryUserApiKey: isSelfHosted,

      // Stripe only in SaaS mode
      stripeIntegration: isSaaS,

      // Usage tracking only in SaaS mode
      usageTracking: isSaaS,
    }
  };
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof PlatformConfig['features']): boolean {
  const config = getPlatformConfig();
  return config.features[feature];
}

/**
 * Get deployment-specific text/labels
 */
export function getDeploymentText() {
  const config = getPlatformConfig();

  if (config.isSelfHosted) {
    return {
      appName: 'JobNeko',
      appTagline: 'Self-Hosted Job Application Tracker',
      apiKeyLabel: 'Your OpenAI API Key',
      apiKeyDescription: 'Provide your own OpenAI API key to power all AI features',
      apiKeyRequired: true,
      showSubscriptions: false,
      showPlatformMode: false,
    };
  }

  // SaaS mode
  return {
    appName: 'JobNeko',
    appTagline: 'AI-Powered Job Application Tracker',
    apiKeyLabel: 'Self-Host with Your Own API Key (Optional)',
    apiKeyDescription: 'Use your own OpenAI API key instead of our subscription plans',
    apiKeyRequired: false,
    showSubscriptions: true,
    showPlatformMode: true,
  };
}

// Export singleton instance
export const platformConfig = getPlatformConfig();
