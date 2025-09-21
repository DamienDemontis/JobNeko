/**
 * Enhanced Outreach Assistant with Unified Caching
 * Provides instant loading of outreach templates with smart cache management
 */

"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useUnifiedCache } from '@/hooks/use-unified-cache';
import { Textarea } from '@/components/ui/textarea';
import {
  Send,
  MessageSquare,
  Mail,
  Users,
  RefreshCw,
  Clock,
  AlertTriangle,
  Copy,
  CheckCircle,
  Target,
  Lightbulb,
  Edit3
} from 'lucide-react';
import { toast } from 'sonner';

interface OutreachTemplate {
  id: string;
  type: 'linkedin_message' | 'email' | 'follow_up' | 'referral_request';
  title: string;
  subject?: string;
  content: string;
  tone: 'professional' | 'casual' | 'friendly' | 'formal';
  useCase: string;
  successRate: number;
  personalizations: string[];
  tips: string[];
}

interface OutreachStrategy {
  strategy: string;
  description: string;
  timing: string;
  successProbability: number;
  templates: string[];
  followUpSequence: Array<{
    delay: string;
    action: string;
    template?: string;
  }>;
}

interface OutreachAssistantData {
  analysis: {
    companySize: string;
    communicationStyle: 'formal' | 'casual' | 'mixed';
    responseRate: string;
    bestApproach: string;
    timing: {
      bestDays: string[];
      bestTimes: string[];
      avoidTimes: string[];
    };
  };
  templates: OutreachTemplate[];
  strategies: OutreachStrategy[];
  personalization: {
    companySpecific: string[];
    roleSpecific: string[];
    industrySpecific: string[];
  };
  followUpGuidance: {
    sequence: Array<{
      step: number;
      timing: string;
      approach: string;
      template: string;
    }>;
    doNots: string[];
    successMetrics: string[];
  };
}

interface OutreachAssistantEnhancedProps {
  companyName: string;
  jobTitle: string;
  userId: string;
  token: string;
  jobId: string;
}

export function OutreachAssistantEnhanced({
  companyName,
  jobTitle,
  userId,
  token,
  jobId
}: OutreachAssistantEnhancedProps) {
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  // Generate function for outreach templates
  const generateOutreachTemplates = async (): Promise<OutreachAssistantData> => {
    const response = await fetch(`/api/ai-analysis/outreach_generation/${jobId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        companyName,
        jobTitle
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate outreach templates');
    }

    const result = await response.json();
    return result.analysis;
  };

  // Use unified cache hook (manual load for user control)
  const {
    data,
    isLoading,
    isCached,
    isExpired,
    error,
    lastUpdated,
    shouldShowGenerateButton,
    generate,
    refresh
  } = useUnifiedCache<OutreachAssistantData>({
    type: 'outreach_generation',
    jobId,
    userId,
    token,
    autoLoad: false, // User-triggered generation
    generateFunction: generateOutreachTemplates,
    additionalParams: {
      companyName,
      jobTitle
    }
  });

  const copyToClipboard = async (content: string, templateId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedTemplate(templateId);
      toast.success('Template copied to clipboard');
      setTimeout(() => setCopiedTemplate(null), 2000);
    } catch (err) {
      toast.error('Failed to copy template');
    }
  };

  // Render loading state
  if (isLoading && !data) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Outreach Assistant
            <Badge variant="outline" className="ml-auto">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Generating
            </Badge>
          </CardTitle>
          <CardDescription>
            Creating personalized outreach templates for {companyName}...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={65} className="w-full" />
            <div className="text-sm text-muted-foreground">
              Crafting personalized messages and outreach strategies...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (error && !data) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Outreach Assistant
            <Badge variant="destructive" className="ml-auto">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Error
            </Badge>
          </CardTitle>
          <CardDescription>Unable to generate outreach templates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => generate(true)} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Generation
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render empty state (no cache, not loading)
  if (!data && shouldShowGenerateButton) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Outreach Assistant
          </CardTitle>
          <CardDescription>
            Generate personalized outreach templates for {companyName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Get AI-powered, personalized outreach templates including LinkedIn messages,
              emails, follow-up sequences, and referral requests tailored for {companyName}.
            </p>
            <Button onClick={() => generate()} className="w-full">
              <MessageSquare className="h-4 w-4 mr-2" />
              Generate Outreach Templates
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render data
  if (!data) return null;

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'linkedin_message': return <Users className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'follow_up': return <RefreshCw className="h-4 w-4" />;
      case 'referral_request': return <Target className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Outreach Assistant
          <div className="ml-auto flex items-center gap-2">
            {isCached && !isExpired && (
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                Cached
              </Badge>
            )}
            {isExpired && (
              <Badge variant="outline">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Outdated
              </Badge>
            )}
            <Button
              onClick={() => refresh()}
              variant="ghost"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Personalized outreach templates for {companyName} - {jobTitle}
          {lastUpdated && (
            <span className="text-xs ml-2">
              Last updated: {new Date(lastUpdated).toLocaleDateString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="strategies">Strategies</TabsTrigger>
            <TabsTrigger value="timing">Timing</TabsTrigger>
            <TabsTrigger value="follow-up">Follow-up</TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="space-y-4">
              {data.templates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getTemplateIcon(template.type)}
                      <h4 className="font-medium">{template.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {template.tone}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {template.successRate}% success rate
                      </Badge>
                    </div>
                    <Button
                      onClick={() => copyToClipboard(template.content, template.id)}
                      variant="ghost"
                      size="sm"
                    >
                      {copiedTemplate === template.id ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {template.subject && (
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-muted-foreground mb-1">Subject:</h5>
                      <p className="text-sm font-medium">{template.subject}</p>
                    </div>
                  )}

                  <div className="mb-3">
                    <h5 className="text-sm font-medium text-muted-foreground mb-1">Template:</h5>
                    <Textarea
                      value={template.content}
                      readOnly
                      className="min-h-[120px] font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h5 className="text-sm font-medium text-muted-foreground mb-1">Use Case:</h5>
                      <p className="text-sm">{template.useCase}</p>
                    </div>

                    {template.personalizations.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground mb-1">Personalization Points:</h5>
                        <div className="flex flex-wrap gap-1">
                          {template.personalizations.map((point, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {point}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {template.tips.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground mb-1">Pro Tips:</h5>
                        <ul className="space-y-1">
                          {template.tips.map((tip, index) => (
                            <li key={index} className="text-sm flex items-start gap-2">
                              <Lightbulb className="h-3 w-3 text-yellow-500 mt-1 flex-shrink-0" />
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Strategies Tab */}
          <TabsContent value="strategies" className="space-y-6">
            <div className="space-y-4">
              {data.strategies.map((strategy, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{strategy.strategy}</h4>
                    <Badge variant="secondary">
                      {strategy.successProbability}% success rate
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">{strategy.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h5 className="font-medium mb-1">Timing</h5>
                      <p>{strategy.timing}</p>
                    </div>
                    <div>
                      <h5 className="font-medium mb-1">Templates to Use</h5>
                      <div className="flex flex-wrap gap-1">
                        {strategy.templates.map((templateId, tIndex) => (
                          <Badge key={tIndex} variant="outline" className="text-xs">
                            {templateId}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {strategy.followUpSequence.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-medium mb-2">Follow-up Sequence</h5>
                      <div className="space-y-2">
                        {strategy.followUpSequence.map((step, stepIndex) => (
                          <div key={stepIndex} className="flex items-center gap-3 text-sm">
                            <Badge variant="outline" className="text-xs">
                              {step.delay}
                            </Badge>
                            <span>{step.action}</span>
                            {step.template && (
                              <Badge variant="secondary" className="text-xs">
                                {step.template}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Timing Tab */}
          <TabsContent value="timing" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3 text-green-600">Best Days</h4>
                <div className="space-y-2">
                  {data.analysis.timing.bestDays.map((day, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span className="text-sm">{day}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3 text-blue-600">Best Times</h4>
                <div className="space-y-2">
                  {data.analysis.timing.bestTimes.map((time, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-blue-500" />
                      <span className="text-sm">{time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3 text-red-600">Avoid Times</h4>
                <div className="space-y-2">
                  {data.analysis.timing.avoidTimes.map((time, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                      <span className="text-sm">{time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Company Analysis</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Company Size:</span>
                  <span className="ml-2 font-medium">{data.analysis.companySize}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Communication Style:</span>
                  <span className="ml-2 font-medium">{data.analysis.communicationStyle}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Response Rate:</span>
                  <span className="ml-2 font-medium">{data.analysis.responseRate}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Best Approach:</span>
                  <p className="mt-1">{data.analysis.bestApproach}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Follow-up Tab */}
          <TabsContent value="follow-up" className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Follow-up Sequence</h3>
              <div className="space-y-3">
                {data.followUpGuidance.sequence.map((step, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Step {step.step}</Badge>
                      <Badge variant="secondary">{step.timing}</Badge>
                    </div>
                    <h4 className="font-medium mb-2">{step.approach}</h4>
                    <Textarea
                      value={step.template}
                      readOnly
                      className="min-h-[80px] font-mono text-sm"
                    />
                    <Button
                      onClick={() => copyToClipboard(step.template, `step-${step.step}`)}
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                    >
                      {copiedTemplate === `step-${step.step}` ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      Copy Template
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3 text-red-600">Don'ts</h4>
                <ul className="space-y-2">
                  {data.followUpGuidance.doNots.map((dont, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <AlertTriangle className="h-3 w-3 text-red-500 mt-1 flex-shrink-0" />
                      <span>{dont}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3 text-green-600">Success Metrics</h4>
                <ul className="space-y-2">
                  {data.followUpGuidance.successMetrics.map((metric, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <Target className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                      <span>{metric}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}