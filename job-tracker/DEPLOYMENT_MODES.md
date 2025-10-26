# Deployment Modes: Self-Hosted vs SaaS

JobNeko supports two distinct deployment modes, controlled by the `DEPLOYMENT_MODE` environment variable. This ensures a clear separation between self-hosted instances and the future SaaS platform.

## 🏠 Self-Hosted Mode (`DEPLOYMENT_MODE=self_hosted`)

**Use Case:** Users who want to run their own instance of JobNeko with complete control over their data and API usage.

### Characteristics:

- **API Key Required:** Users must provide their own OpenAI API key
- **No Subscriptions:** No tier system or subscription payments
- **No Usage Tracking:** User's AI requests are not tracked or limited
- **Full Features:** All AI features are available without restrictions
- **Data Privacy:** All data stays on the user's server
- **Direct Billing:** Users pay OpenAI directly for API usage

### UI/UX Differences:

- Settings page focuses on API key configuration
- No mention of "tiers," "subscriptions," or "platform mode"
- Onboarding flow includes mandatory API key setup
- Spending limit warnings are prominent
- No "upgrade" prompts or tier badges

### User Experience:

1. **Sign Up** → User creates account
2. **Onboarding** → 4 steps:
   - Welcome
   - Profile information
   - Resume upload (optional)
   - API key configuration (mandatory)
3. **Dashboard** → Full access to all features

### Environment Setup:

```env
DEPLOYMENT_MODE="self_hosted"
# Platform's OpenAI key is optional (not used)
OPENAI_API_KEY="optional-fallback-key"
```

---

## ☁️ SaaS Mode (`DEPLOYMENT_MODE=saas`)

**Use Case:** The hosted platform where users subscribe for managed AI services OR optionally use their own API keys.

### Characteristics:

- **Subscription Tiers:** FREE, PRO ($9.99/mo), PRO_MAX ($24.99/mo)
- **Platform API Key:** Platform provides AI services for paying users
- **Usage Tracking:** Monthly request limits based on tier
- **Self-Hosting Option:** Users can still provide their own API key
- **Stripe Integration:** Payment processing for subscriptions
- **Mixed Mode:** Platform-managed OR user-managed API keys

### UI/UX Differences:

- Settings page shows current tier and subscription status
- Clear distinction between "Platform Mode" and "Self-Hosted Mode"
- Onboarding flow is 3 steps (no mandatory API key)
- Upgrade prompts for free tier users
- Usage dashboard showing monthly limits
- "Switch to self-hosted" option with own API key

### User Experience:

1. **Sign Up** → User creates account (FREE tier)
2. **Onboarding** → 3 steps:
   - Welcome
   - Profile information
   - Resume upload (optional)
3. **Dashboard** → Access based on subscription tier
4. **Optional:** Configure own API key to bypass tier limits

### Subscription Tiers:

| Tier | Price | AI Requests/Month | Features |
|------|-------|-------------------|----------|
| FREE | $0 | 50 | Basic job tracking, limited AI analysis |
| PRO | $9.99 | 500 | Full AI features, company research |
| PRO MAX | $24.99 | Unlimited | Priority processing, advanced insights |
| SELF_HOSTED | $0 (own key) | Unlimited | All PRO MAX features, direct OpenAI billing |

### Environment Setup:

```env
DEPLOYMENT_MODE="saas"
# Platform's OpenAI key is required for paying users
OPENAI_API_KEY="sk-proj-platform-key"
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
```

---

## 🔧 Technical Implementation

### Configuration System

**File:** `lib/config.ts`

```typescript
export function getDeploymentMode(): DeploymentMode {
  const mode = process.env.DEPLOYMENT_MODE?.toLowerCase();
  if (mode === 'saas') return 'saas';
  return 'self_hosted'; // Default to self-hosted for safety
}

export function getPlatformConfig(): PlatformConfig {
  const deploymentMode = getDeploymentMode();
  const isSelfHosted = deploymentMode === 'self_hosted';
  const isSaaS = deploymentMode === 'saas';

  return {
    deploymentMode,
    isSelfHosted,
    isSaaS,
    features: {
      subscriptions: isSaaS,
      platformApiKey: isSaaS,
      mandatoryUserApiKey: isSelfHosted,
      stripeIntegration: isSaaS,
      usageTracking: isSaaS,
    }
  };
}
```

### AI Gateway Integration

**File:** `lib/services/ai-gateway.ts`

The AI Gateway respects deployment mode:

```typescript
async request<T>(request: AIGatewayRequest): Promise<AIGatewayResponse<T>> {
  const { tier, mode, apiKey } = await this.getUserContext(request.userId);

  // In self-hosted mode, enforce API key requirement
  if (platformConfig.isSelfHosted && !apiKey) {
    throw new Error('API key required. Please configure your OpenAI API key in Settings.');
  }

  // Check tier limits only in SaaS mode
  if (platformConfig.isSaaS) {
    const limits = getTierLimits(tier);
    // ... tier enforcement logic
  }

  // Track usage only in SaaS platform mode
  if (platformConfig.isSaaS && mode === 'platform') {
    await this.trackUsage(...);
  }
}
```

### Onboarding Flow

**File:** `app/onboarding/page.tsx`

Steps adapt to deployment mode:

- **Self-Hosted:** 4 steps (includes API key setup)
- **SaaS:** 3 steps (API key optional)

```typescript
const TOTAL_STEPS = platformConfig.isSelfHosted ? 4 : 3;
```

### Settings Page

**File:** `app/settings/page.tsx`

UI adapts based on `platformConfig`:

```typescript
const deploymentText = getDeploymentText();

// Self-hosted shows:
// - "Your OpenAI API Key" (mandatory)
// - "Configure your API key to enable AI features"
// - No tier/subscription information

// SaaS shows:
// - "Self-Host with Your Own API Key (Optional)"
// - "Use your own key OR subscribe"
// - Tier badges and subscription status
```

---

## 🚀 Migration Guide

### From Self-Hosted to SaaS Deployment

When you're ready to deploy the SaaS version:

1. **Update Environment:**
   ```env
   DEPLOYMENT_MODE="saas"
   OPENAI_API_KEY="your-platform-key"
   STRIPE_SECRET_KEY="..."
   ```

2. **Database Migration:**
   - Existing users keep their API keys (now "self-hosted mode")
   - New users default to FREE tier (platform mode)

3. **No Code Changes Required:**
   - All logic is already in place
   - Platform adapts automatically based on `DEPLOYMENT_MODE`

### User Impact:

- **Existing self-hosted users:** Continue using their own API keys (no change)
- **New SaaS users:** Start on FREE tier, can upgrade or switch to self-hosted

---

## 📋 Checklist for Deployment

### Self-Hosted (Current):
- [x] `DEPLOYMENT_MODE=self_hosted` in .env
- [x] Onboarding requires API key
- [x] No tier/subscription UI elements
- [x] AI Gateway enforces API key requirement
- [x] Settings page focuses on API key setup

### SaaS (Future):
- [ ] `DEPLOYMENT_MODE=saas` in .env
- [ ] Configure Stripe integration
- [ ] Set platform OpenAI API key
- [ ] Test subscription flow (FREE → PRO → PRO_MAX)
- [ ] Test self-hosted option in SaaS mode
- [ ] Implement usage dashboard
- [ ] Add billing page

---

## 🎯 Best Practices

### For Self-Hosted Deployment:

1. **Emphasize Spending Limits:** Always warn users to set OpenAI spending limits
2. **Clear Documentation:** Provide setup guides (SELF_HOSTING_GUIDE.md)
3. **API Key Security:** Emphasize encryption and privacy
4. **Cost Transparency:** Show estimated costs ($1.50-$6/month typical usage)

### For SaaS Deployment:

1. **Clear Value Proposition:** Show benefits of each tier
2. **Transparent Pricing:** No hidden fees
3. **Self-Hosting Option:** Allow users to bring own keys even in SaaS
4. **Usage Visibility:** Show monthly usage and limits
5. **Easy Upgrades:** Smooth upgrade flow between tiers

---

## 🔍 Testing Both Modes

### Test Self-Hosted Mode:
```bash
# .env
DEPLOYMENT_MODE=self_hosted

# Expected behavior:
# - Onboarding requires API key
# - Settings shows API key as required
# - No tier badges or subscription info
# - AI Gateway enforces API key
```

### Test SaaS Mode:
```bash
# .env
DEPLOYMENT_MODE=saas

# Expected behavior:
# - Onboarding skips API key
# - Settings shows tier and subscription
# - Can optionally add own API key
# - AI Gateway checks tier limits
```

---

## 📞 Support

For questions about deployment modes:
- Review this documentation
- Check `lib/config.ts` for configuration logic
- See `lib/services/ai-gateway.ts` for AI routing
- Refer to `SELF_HOSTING_GUIDE.md` for self-hosted setup

---

**Current Status:** ✅ Self-Hosted Mode (Active)
**Future Deployment:** ☁️ SaaS Mode (Ready, awaiting Stripe integration)

The platform is designed to support both modes seamlessly. When ready to launch the SaaS version, simply change the environment variable and configure Stripe. All user-facing UI and backend logic will adapt automatically.
