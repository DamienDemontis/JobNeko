'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { platformConfig, getDeploymentText } from '@/lib/config';
import { SiteHeader } from '@/components/ui/site-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Key,
  Shield,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  Sparkles,
  DollarSign,
  Lock,
  Unlock,
  Settings as SettingsIcon,
  Trash
} from 'lucide-react';

interface ApiKeyStatus {
  hasApiKey: boolean;
  mode: 'platform' | 'self_hosted';
  tier: string;
  keyPreview?: string;
}

export default function SettingsPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const deploymentText = getDeploymentText();

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ApiKeyStatus | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/settings/api-key', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch API key status:', error);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      toast.error('Invalid API key format. OpenAI keys start with "sk-"');
      return;
    }

    setLoading(true);
    setTestingKey(true);

    try {
      const response = await fetch('/api/settings/api-key', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ apiKey })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('API key saved successfully!');
        toast.info('⚠️ Set spending limits on OpenAI to control costs', {
          duration: 10000,
          action: {
            label: 'Open OpenAI',
            onClick: () => window.open('https://platform.openai.com/account/limits', '_blank')
          }
        });
        setApiKey('');
        fetchStatus();
      } else {
        toast.error(data.error || 'Failed to save API key');
      }
    } catch (error) {
      toast.error('Failed to save API key');
    } finally {
      setLoading(false);
      setTestingKey(false);
    }
  };

  const handleRemoveApiKey = async () => {
    if (!confirm('Are you sure you want to remove your API key?\n\nYou will switch back to platform mode with FREE tier limits.')) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/settings/api-key', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('API key removed. Switched to platform mode.');
        fetchStatus();
      } else {
        toast.error('Failed to remove API key');
      }
    } catch (error) {
      toast.error('Failed to remove API key');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllJobs = async () => {
    const confirmed = window.confirm(
      'Are you absolutely sure?\n\nThis action cannot be undone. This will permanently delete all your saved job offers, including ratings, notes, and analysis data.'
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/jobs/delete-all', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete jobs');
      }

      const data = await response.json();
      toast.success(`Successfully deleted ${data.deletedCount} jobs`);
      router.push('/dashboard');
    } catch (error) {
      console.error('Error deleting jobs:', error);
      toast.error('Failed to delete jobs. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getTierBadge = (tier: string) => {
    const badges = {
      free: { label: 'Free', variant: 'secondary' as const, icon: Lock },
      pro: { label: 'Pro', variant: 'default' as const, icon: CheckCircle },
      pro_max: { label: 'Pro Max', variant: 'default' as const, icon: Sparkles },
      self_hosted: { label: 'Self-Hosted', variant: 'default' as const, icon: Unlock }
    };

    const badge = badges[tier as keyof typeof badges] || badges.free;
    const Icon = badge.icon;

    return (
      <Badge variant={badge.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {badge.label}
      </Badge>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SiteHeader />
        <div className="max-w-4xl mx-auto px-6 py-12">
          <p className="text-center text-gray-600">Please log in to access settings.</p>
        </div>
      </div>
    );
  }

  const isSelfHosted = status?.mode === 'self_hosted';

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader />

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-gray-600" />
          <div>
            <h1 className="text-3xl font-bold text-black">Settings</h1>
            <p className="text-gray-600">Manage your account and API configuration</p>
          </div>
        </div>

        <Tabs defaultValue="api" className="space-y-6">
          <TabsList>
            <TabsTrigger value="api">API Configuration</TabsTrigger>
            <TabsTrigger value="data">Data Management</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          {/* API Configuration Tab */}
          <TabsContent value="api" className="space-y-6">
            {/* Current Status */}
            <Card className="border-gray-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Current Status</CardTitle>
                    <CardDescription>Your account configuration</CardDescription>
                  </div>
                  {platformConfig.isSaaS && status && getTierBadge(status.tier)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {platformConfig.isSaaS && (
                    <div>
                      <p className="text-sm text-gray-600">Mode</p>
                      <p className="font-semibold capitalize">{status?.mode || 'Loading...'}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">API Key</p>
                    <p className="font-semibold">{status?.hasApiKey ? 'Configured ✓' : 'Not set'}</p>
                  </div>
                </div>

                {platformConfig.isSelfHosted && status?.hasApiKey && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-900">API Key Configured</AlertTitle>
                    <AlertDescription className="text-green-800">
                      You're using your own OpenAI API key. All AI features are active.
                      Costs are charged directly to your OpenAI account.
                    </AlertDescription>
                  </Alert>
                )}

                {platformConfig.isSelfHosted && !status?.hasApiKey && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>API Key Required</AlertTitle>
                    <AlertDescription>
                      Please configure your OpenAI API key below to enable AI features.
                    </AlertDescription>
                  </Alert>
                )}

                {platformConfig.isSaaS && isSelfHosted && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-900">Self-Hosted Mode Active</AlertTitle>
                    <AlertDescription className="text-green-800">
                      You're using your own OpenAI API key. All features are unlocked with no limits.
                      AI costs are charged directly to your OpenAI account.
                    </AlertDescription>
                  </Alert>
                )}

                {platformConfig.isSaaS && !isSelfHosted && (
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertTitle>Platform Mode</AlertTitle>
                    <AlertDescription>
                      You're using our managed AI services. Features and usage depend on your subscription tier.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* API Key Configuration */}
            <Card className="border-gray-200">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Key className="w-5 h-5" />
                  <CardTitle>{deploymentText.apiKeyLabel}</CardTitle>
                </div>
                <CardDescription>
                  {deploymentText.apiKeyDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Benefits - Only show in SaaS mode or if not configured in self-hosted */}
                {(platformConfig.isSaaS || !status?.hasApiKey) && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                      <Sparkles className="w-4 h-4 mr-2" />
                      {platformConfig.isSelfHosted ? 'Why you need an API key' : 'Benefits of Using Your Own API Key'}
                    </h4>
                    <ul className="space-y-1 text-sm text-blue-800">
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                        {platformConfig.isSelfHosted ? 'Required for AI features to work' : 'Unlimited AI requests (no monthly limits)'}
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                        {platformConfig.isSelfHosted ? 'Full control over your AI usage' : 'All PRO MAX features unlocked'}
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                        {platformConfig.isSelfHosted ? 'Pay only for what you use' : 'No subscription fees'}
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                        Full data privacy (stays on your server)
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                        Typical usage: ~$1.50-$6/month
                      </li>
                    </ul>
                  </div>
                )}

                {/* Spending Limit Warning - MOST IMPORTANT */}
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>⚠️ IMPORTANT: Set Spending Limits First!</AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p className="font-semibold">
                      Before adding your API key, you MUST set spending limits on your OpenAI account
                      to prevent unexpected charges.
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        asChild
                        className="w-fit bg-red-600 hover:bg-red-700"
                      >
                        <a
                          href="https://platform.openai.com/account/limits"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          Set Spending Limits on OpenAI (Do This First!)
                        </a>
                      </Button>
                      <p className="text-xs">
                        <strong>Recommended limit:</strong> $10-20/month for typical usage
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>

                {/* API Key Input */}
                {!isSelfHosted && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="apiKey" className="flex items-center space-x-2 mb-2">
                        <Key className="w-4 h-4" />
                        <span>OpenAI API Key</span>
                      </Label>
                      <div className="flex space-x-2">
                        <div className="flex-1 relative">
                          <Input
                            id="apiKey"
                            type={showApiKey ? 'text' : 'password'}
                            placeholder="sk-proj-..."
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="pr-10"
                            disabled={loading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showApiKey ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <Button
                          onClick={handleSaveApiKey}
                          disabled={loading || !apiKey.trim()}
                        >
                          {testingKey ? 'Testing...' : loading ? 'Saving...' : 'Save & Test'}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-500">
                          Get your API key from{' '}
                          <a
                            href="https://platform.openai.com/api-keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            OpenAI Dashboard
                          </a>
                        </p>
                        <Button
                          variant="link"
                          size="sm"
                          asChild
                          className="h-auto p-0 text-xs"
                        >
                          <a
                            href="https://platform.openai.com/usage"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Monitor Usage
                          </a>
                        </Button>
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <h5 className="font-medium text-sm mb-2">How to get your API key:</h5>
                      <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                        <li><strong>FIRST</strong>: Set spending limits at <a href="https://platform.openai.com/account/limits" target="_blank" className="text-blue-600 hover:underline">OpenAI Limits</a></li>
                        <li>Go to <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-600 hover:underline">OpenAI API Keys</a></li>
                        <li>Click "Create new secret key"</li>
                        <li>Copy the key (starts with "sk-" or "sk-proj-")</li>
                        <li>Paste it above and click "Save & Test"</li>
                      </ol>
                    </div>
                  </div>
                )}

                {/* Remove API Key */}
                {isSelfHosted && (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm mb-1">API Key Configured ✓</p>
                          <p className="text-xs text-gray-600">
                            Your API key is securely stored and being used for all AI requests.
                          </p>
                        </div>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                    </div>

                    <Button
                      variant="destructive"
                      onClick={handleRemoveApiKey}
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {loading ? 'Removing...' : 'Remove API Key'}
                    </Button>

                    <p className="text-xs text-gray-500">
                      Removing your API key will switch you back to platform mode (FREE tier with limits).
                    </p>
                  </div>
                )}

                {/* Security Info */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <h5 className="font-medium text-sm mb-2 flex items-center">
                    <Shield className="w-4 h-4 mr-2" />
                    Security & Privacy
                  </h5>
                  <ul className="space-y-1 text-xs text-gray-700">
                    <li>• API keys encrypted with AES-256-GCM before storage</li>
                    <li>• Keys never logged or exposed in responses</li>
                    <li>• Remove your key anytime</li>
                    <li>• Your data stays on your server</li>
                    <li>• HTTPS encryption for all communication</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Management Tab */}
          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>
                  Manage your stored job data and application history
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">Delete All Jobs</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Permanently delete all saved job offers and their associated data. This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    className="flex items-center gap-2"
                    disabled={isDeleting}
                    onClick={handleDeleteAllJobs}
                  >
                    <Trash className="h-4 w-4" />
                    {isDeleting ? 'Deleting...' : 'Delete All Jobs'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About JobNeko</CardTitle>
                <CardDescription>
                  Application information and features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Version:</strong> 1.0.0</p>
                  <p><strong>Built with:</strong> Next.js, TypeScript, Tailwind CSS, GPT-5</p>
                  <p><strong>Features:</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>AI-powered job analysis</li>
                    <li>Resume matching with gap analysis</li>
                    <li>Salary intelligence with web search</li>
                    <li>Company intelligence & culture analysis</li>
                    <li>Interview preparation</li>
                    <li>Self-hosting support</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
