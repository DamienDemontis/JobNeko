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
import { Switch } from '@/components/ui/switch';
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
  Trash,
  Brain,
  Zap,
  Bell,
  Palette,
  Database
} from 'lucide-react';

interface ApiKeyStatus {
  hasApiKey: boolean;
  mode: 'platform' | 'self_hosted';
  tier: string;
  keyPreview?: string;
}

interface UserPreferences {
  autoAnalyzeAfterExtraction: boolean;
  autoMatchScore: boolean;
  autoSalaryAnalysis: boolean;
  autoCompanyResearch: boolean;
  autoSkillGapAnalysis: boolean;
  autoInterviewPrep: boolean;
  theme: string;
  showAnimations: boolean;
  compactView: boolean;
  showDetailedFeedback: boolean;
  emailNotifications: boolean;
  browserNotifications: boolean;
  notifyOnExtraction: boolean;
  notifyOnAnalysis: boolean;
  cacheAnalysisResults: boolean;
  shareAnonymousData: boolean;
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
  const [preferences, setPreferences] = useState<UserPreferences>({
    autoAnalyzeAfterExtraction: false,
    autoMatchScore: true,
    autoSalaryAnalysis: false,
    autoCompanyResearch: false,
    autoSkillGapAnalysis: false,
    autoInterviewPrep: false,
    theme: 'minimal',
    showAnimations: true,
    compactView: false,
    showDetailedFeedback: true,
    emailNotifications: false,
    browserNotifications: true,
    notifyOnExtraction: true,
    notifyOnAnalysis: true,
    cacheAnalysisResults: true,
    shareAnonymousData: false,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    fetchStatus();
    fetchPreferences();
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

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/settings/preferences', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.preferences) {
          setPreferences(data.preferences);
        }
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
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
        });
        setApiKey('');
        await fetchStatus();
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

  const handleDeleteApiKey = async () => {
    if (!confirm('Are you sure? This will switch back to platform API keys.')) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch('/api/settings/api-key', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('API key removed');
        await fetchStatus();
      } else {
        toast.error('Failed to remove API key');
      }
    } catch (error) {
      toast.error('Failed to remove API key');
    } finally {
      setIsDeleting(false);
    }
  };

  const updatePreference = async (key: keyof UserPreferences, value: any) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);

    // Debounced save
    if (!savingPrefs) {
      setSavingPrefs(true);
      setTimeout(async () => {
        try {
          const response = await fetch('/api/settings/preferences', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(newPrefs)
          });

          if (!response.ok) {
            throw new Error('Failed to save preferences');
          }

          toast.success('Preferences saved');
        } catch (error) {
          toast.error('Failed to save preferences');
          console.error('Error saving preferences:', error);
        } finally {
          setSavingPrefs(false);
        }
      }, 1000);
    }
  };

  const getTierBadge = (tier: string) => {
    const tierColors = {
      free: 'bg-gray-100 text-gray-800',
      pro: 'bg-blue-100 text-blue-800',
      pro_max: 'bg-purple-100 text-purple-800',
      self_hosted: 'bg-green-100 text-green-800'
    };

    return (
      <Badge className={tierColors[tier as keyof typeof tierColors] || tierColors.free}>
        {tier.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (!user || !token) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account preferences and API configuration</p>
        </div>

        <Tabs defaultValue="ai" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white border">
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Settings
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="ui" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Interface
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* AI Settings Tab */}
          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Auto-Analysis After Job Extraction
                </CardTitle>
                <CardDescription>
                  Choose which analyses to run automatically when a new job is extracted
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Master Auto-Analysis Toggle</Label>
                    <p className="text-sm text-gray-500">Enable automatic AI analysis after extraction</p>
                  </div>
                  <Switch
                    checked={preferences.autoAnalyzeAfterExtraction}
                    onCheckedChange={(checked) => updatePreference('autoAnalyzeAfterExtraction', checked)}
                  />
                </div>

                {preferences.autoAnalyzeAfterExtraction && (
                  <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Match Score</Label>
                        <p className="text-xs text-gray-500">Calculate resume match automatically</p>
                      </div>
                      <Switch
                        checked={preferences.autoMatchScore}
                        onCheckedChange={(checked) => updatePreference('autoMatchScore', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Salary Analysis</Label>
                        <p className="text-xs text-gray-500">Research expected salary ranges</p>
                      </div>
                      <Switch
                        checked={preferences.autoSalaryAnalysis}
                        onCheckedChange={(checked) => updatePreference('autoSalaryAnalysis', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Company Research</Label>
                        <p className="text-xs text-gray-500">Gather company intelligence</p>
                      </div>
                      <Switch
                        checked={preferences.autoCompanyResearch}
                        onCheckedChange={(checked) => updatePreference('autoCompanyResearch', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Skills Gap Analysis</Label>
                        <p className="text-xs text-gray-500">Identify missing skills</p>
                      </div>
                      <Switch
                        checked={preferences.autoSkillGapAnalysis}
                        onCheckedChange={(checked) => updatePreference('autoSkillGapAnalysis', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Interview Preparation</Label>
                        <p className="text-xs text-gray-500">Generate interview questions</p>
                      </div>
                      <Switch
                        checked={preferences.autoInterviewPrep}
                        onCheckedChange={(checked) => updatePreference('autoInterviewPrep', checked)}
                      />
                    </div>
                  </div>
                )}

                {user?.subscriptionTier === 'free' && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Limited AI Features</AlertTitle>
                    <AlertDescription>
                      Free tier has limited AI analyses per month. Upgrade to Pro for unlimited access.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-500" />
                  Performance & Caching
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Cache AI Results</Label>
                    <p className="text-sm text-gray-500">Store results for faster loading (24hr cache)</p>
                  </div>
                  <Switch
                    checked={preferences.cacheAnalysisResults}
                    onCheckedChange={(checked) => updatePreference('cacheAnalysisResults', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Anonymous Analytics</Label>
                    <p className="text-sm text-gray-500">Help improve the platform with usage data</p>
                  </div>
                  <Switch
                    checked={preferences.shareAnonymousData}
                    onCheckedChange={(checked) => updatePreference('shareAnonymousData', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    API Configuration
                  </span>
                  {status && getTierBadge(status.tier)}
                </CardTitle>
                <CardDescription>
                  {platformConfig.isSelfHosted
                    ? 'Configure your OpenAI API key for AI features'
                    : 'Use platform API or bring your own OpenAI key'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {status?.hasApiKey && status.mode === 'self_hosted' ? (
                  <div className="space-y-4">
                    <Alert>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle>Using Your Own API Key</AlertTitle>
                      <AlertDescription>
                        Key ending in: {status.keyPreview}
                      </AlertDescription>
                    </Alert>

                    <Button
                      variant="destructive"
                      onClick={handleDeleteApiKey}
                      disabled={isDeleting}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isDeleting ? 'Removing...' : 'Remove API Key'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!platformConfig.isSelfHosted && (
                      <Alert>
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        <AlertTitle>Platform API Active</AlertTitle>
                        <AlertDescription>
                          Using JobNeko platform API with {status?.tier || 'free'} tier limits
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="apiKey">OpenAI API Key</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            id="apiKey"
                            type={showApiKey ? 'text' : 'password'}
                            placeholder="sk-..."
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <Button
                          onClick={handleSaveApiKey}
                          disabled={loading || !apiKey.trim()}
                        >
                          {testingKey ? 'Testing...' : 'Save Key'}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Get your API key from{' '}
                        <a
                          href="https://platform.openai.com/api-keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          OpenAI Dashboard
                          <ExternalLink className="inline h-3 w-3 ml-1" />
                        </a>
                      </p>
                    </div>

                    <Alert>
                      <DollarSign className="h-4 w-4" />
                      <AlertTitle>Cost Control Tips</AlertTitle>
                      <AlertDescription className="space-y-1">
                        <p>• Set monthly spending limits in OpenAI dashboard</p>
                        <p>• Monitor usage regularly</p>
                        <p>• AI analyses are cached for 24 hours to reduce costs</p>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* UI Preferences Tab */}
          <TabsContent value="ui" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Interface Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Animations</Label>
                    <p className="text-sm text-gray-500">Display loading animations (cat mascot)</p>
                  </div>
                  <Switch
                    checked={preferences.showAnimations}
                    onCheckedChange={(checked) => updatePreference('showAnimations', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Compact View</Label>
                    <p className="text-sm text-gray-500">Use condensed layouts for more information</p>
                  </div>
                  <Switch
                    checked={preferences.compactView}
                    onCheckedChange={(checked) => updatePreference('compactView', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Detailed Feedback</Label>
                    <p className="text-sm text-gray-500">Show comprehensive match analysis</p>
                  </div>
                  <Switch
                    checked={preferences.showDetailedFeedback}
                    onCheckedChange={(checked) => updatePreference('showDetailedFeedback', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Browser Notifications</Label>
                    <p className="text-sm text-gray-500">Get notified in your browser</p>
                  </div>
                  <Switch
                    checked={preferences.browserNotifications}
                    onCheckedChange={(checked) => updatePreference('browserNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-gray-500">Receive email updates</p>
                  </div>
                  <Switch
                    checked={preferences.emailNotifications}
                    onCheckedChange={(checked) => updatePreference('emailNotifications', checked)}
                  />
                </div>

                <div className="pl-4 border-l-2 border-gray-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Job Extraction Complete</Label>
                      <p className="text-xs text-gray-500">When a job is successfully extracted</p>
                    </div>
                    <Switch
                      checked={preferences.notifyOnExtraction}
                      onCheckedChange={(checked) => updatePreference('notifyOnExtraction', checked)}
                      disabled={!preferences.browserNotifications && !preferences.emailNotifications}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">AI Analysis Complete</Label>
                      <p className="text-xs text-gray-500">When AI finishes analyzing a job</p>
                    </div>
                    <Switch
                      checked={preferences.notifyOnAnalysis}
                      onCheckedChange={(checked) => updatePreference('notifyOnAnalysis', checked)}
                      disabled={!preferences.browserNotifications && !preferences.emailNotifications}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Account Deletion */}
        <Card className="mt-8 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('Are you sure? This action cannot be undone.')) {
                  // Implement account deletion
                  toast.error('Account deletion not yet implemented');
                }
              }}
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}