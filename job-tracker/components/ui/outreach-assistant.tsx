"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare,
  Mail,
  Linkedin,
  Clock,
  Calendar,
  Send,
  Edit,
  Copy,
  Check,
  BarChart3,
  Target,
  TrendingUp,
  Users,
  Zap,
  Bell,
  RefreshCw
} from 'lucide-react';
import { aiServiceManagerClient } from '@/lib/services/ai-service-manager-client';
import { enhancedUserContextClient } from '@/lib/services/enhanced-user-context-client';

interface MessageTemplate {
  id: string;
  type: 'linkedin_connection' | 'linkedin_message' | 'email' | 'follow_up' | 'thank_you';
  platform: 'linkedin' | 'email' | 'phone';
  subject?: string;
  content: string;
  tone: 'professional' | 'casual' | 'friendly' | 'formal';
  purpose: 'networking' | 'information' | 'referral' | 'follow_up' | 'thank_you';
  effectiveness: number; // 1-10
  personalizationLevel: 'high' | 'medium' | 'low';
  estimatedResponseRate: number; // percentage
  bestTiming: {
    days: string[];
    hours: string[];
    timeZone?: string;
  };
}

interface OutreachCampaign {
  id: string;
  name: string;
  targetCompany: string;
  targetRole: string;
  contacts: CampaignContact[];
  templates: MessageTemplate[];
  status: 'draft' | 'active' | 'completed' | 'paused';
  analytics: {
    messagesSent: number;
    responsesReceived: number;
    responseRate: number;
    conversionsToMeeting: number;
    conversionRate: number;
  };
  schedule: {
    startDate: string;
    followUpIntervals: number[]; // days
    maxFollowUps: number;
  };
}

interface CampaignContact {
  id: string;
  name: string;
  title: string;
  company: string;
  platform: 'linkedin' | 'email' | 'both';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'contacted' | 'responded' | 'meeting_scheduled' | 'closed';
  lastContact?: string;
  nextFollowUp?: string;
  notes?: string;
  responseReceived?: boolean;
}

interface OptimalTiming {
  platform: string;
  bestDays: string[];
  bestHours: string[];
  responseRates: { [key: string]: number };
  recommendations: string[];
  timeZoneConsiderations: string[];
}

interface OutreachAnalytics {
  totalCampaigns: number;
  activeCampaigns: number;
  overallResponseRate: number;
  bestPerformingTemplate: string;
  optimalSendTimes: OptimalTiming[];
  improvementSuggestions: string[];
}

interface OutreachAssistantProps {
  companyName: string;
  jobTitle: string;
  userId: string;
}

export function OutreachAssistant({ companyName, jobTitle, userId }: OutreachAssistantProps) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [analytics, setAnalytics] = useState<OutreachAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customRequest, setCustomRequest] = useState<string>("");
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  const generateMessageTemplates = async () => {
    if (!companyName || !jobTitle) {
      setError('Company name and job title are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userContext = await enhancedUserContextClient.buildEnhancedContext();

      const templatesPrompt = `
You are an expert outreach strategist and communication specialist. Generate highly effective, personalized message templates for job search outreach.

CONTEXT:
Target Company: ${companyName}
Target Role: ${jobTitle}
User Experience Level: ${userContext.experienceLevel || 'Not specified'}
User Skills: ${userContext.professionalProfile.skills?.join(', ') || 'Not specified'}
User Industry Focus: ${userContext.industryFocus?.join(', ') || 'Not specified'}
Current Role: ${userContext.profile.currentRole || 'Not specified'}

Generate diverse, effective message templates for different outreach scenarios and platforms.

Return a JSON object with this exact structure:
{
  "templates": [
    {
      "id": "linkedin_connection_1",
      "type": "linkedin_connection",
      "platform": "linkedin",
      "content": "Hi [Name], I'm a [Your Title] interested in [specific aspect of their work/company]. I'd love to connect and learn from your experience at ${companyName}. Looking forward to connecting!",
      "tone": "professional",
      "purpose": "networking",
      "effectiveness": 8,
      "personalizationLevel": "high",
      "estimatedResponseRate": 65,
      "bestTiming": {
        "days": ["Tuesday", "Wednesday", "Thursday"],
        "hours": ["9:00 AM", "2:00 PM", "4:00 PM"],
        "timeZone": "Target's timezone"
      }
    },
    {
      "id": "linkedin_message_1",
      "type": "linkedin_message",
      "platform": "linkedin",
      "content": "Hi [Name], I hope this message finds you well! I'm currently exploring opportunities in [industry/role] and came across your impressive background at ${companyName}. I'd love to learn more about your experience there and the company culture. Would you be open to a brief coffee chat or quick call? I'm happy to work around your schedule. Thank you for your time!",
      "tone": "friendly",
      "purpose": "information",
      "effectiveness": 7,
      "personalizationLevel": "high",
      "estimatedResponseRate": 45,
      "bestTiming": {
        "days": ["Monday", "Tuesday", "Wednesday"],
        "hours": ["10:00 AM", "2:00 PM"],
        "timeZone": "Business hours"
      }
    },
    {
      "id": "email_outreach_1",
      "type": "email",
      "platform": "email",
      "subject": "Fellow [University] alum interested in ${companyName}",
      "content": "Dear [Name],\\n\\nI hope this email finds you well. My name is [Your Name], and I'm a fellow [University] graduate currently exploring opportunities in [field]. I came across your profile and was impressed by your work at ${companyName}.\\n\\nI'm particularly interested in [specific aspect of company/role] and would love to learn more about your experience there. Would you be available for a brief 15-20 minute coffee chat or phone call? I'm happy to work around your schedule.\\n\\nThank you for your time and consideration.\\n\\nBest regards,\\n[Your Name]",
      "tone": "professional",
      "purpose": "information",
      "effectiveness": 6,
      "personalizationLevel": "high",
      "estimatedResponseRate": 35,
      "bestTiming": {
        "days": ["Tuesday", "Wednesday", "Thursday"],
        "hours": ["9:00 AM", "11:00 AM", "2:00 PM"],
        "timeZone": "Business hours"
      }
    },
    {
      "id": "follow_up_1",
      "type": "follow_up",
      "platform": "linkedin",
      "content": "Hi [Name], I wanted to follow up on my previous message about connecting regarding opportunities at ${companyName}. I understand you're busy, but I'd still love the chance to learn from your experience. Would a brief 15-minute call work for you in the coming weeks?",
      "tone": "professional",
      "purpose": "follow_up",
      "effectiveness": 6,
      "personalizationLevel": "medium",
      "estimatedResponseRate": 25,
      "bestTiming": {
        "days": ["Tuesday", "Wednesday"],
        "hours": ["10:00 AM", "3:00 PM"],
        "timeZone": "Business hours"
      }
    },
    {
      "id": "thank_you_1",
      "type": "thank_you",
      "platform": "linkedin",
      "content": "Hi [Name], Thank you so much for taking the time to speak with me about ${companyName} and your experience there. Your insights about [specific topic discussed] were incredibly valuable. I'll definitely [specific action based on conversation]. I appreciate your guidance and look forward to staying in touch!",
      "tone": "friendly",
      "purpose": "thank_you",
      "effectiveness": 9,
      "personalizationLevel": "high",
      "estimatedResponseRate": 80,
      "bestTiming": {
        "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "hours": ["9:00 AM", "1:00 PM", "4:00 PM"],
        "timeZone": "Business hours"
      }
    }
  ],
  "optimalTiming": [
    {
      "platform": "linkedin",
      "bestDays": ["Tuesday", "Wednesday", "Thursday"],
      "bestHours": ["9:00 AM", "2:00 PM", "4:00 PM"],
      "responseRates": {
        "Tuesday": 45,
        "Wednesday": 48,
        "Thursday": 42
      },
      "recommendations": [
        "Avoid Monday mornings and Friday afternoons",
        "Mid-week messages perform 35% better",
        "Messages sent at 2 PM have highest response rates"
      ],
      "timeZoneConsiderations": [
        "Adjust timing to recipient's timezone",
        "Avoid late evening messages",
        "Consider international business hours"
      ]
    },
    {
      "platform": "email",
      "bestDays": ["Tuesday", "Wednesday"],
      "bestHours": ["9:00 AM", "11:00 AM", "2:00 PM"],
      "responseRates": {
        "Tuesday": 38,
        "Wednesday": 35
      },
      "recommendations": [
        "Tuesday morning emails have best open rates",
        "Keep subject lines under 50 characters",
        "Personalize with specific company references"
      ],
      "timeZoneConsiderations": [
        "Send in recipient's business hours",
        "Consider time zone differences",
        "Avoid holidays and vacation periods"
      ]
    }
  ],
  "analytics": {
    "totalCampaigns": 0,
    "activeCampaigns": 0,
    "overallResponseRate": 0,
    "bestPerformingTemplate": "linkedin_connection_1",
    "optimalSendTimes": [],
    "improvementSuggestions": [
      "Personalize messages with specific company research",
      "Reference mutual connections when possible",
      "Keep initial messages brief and value-focused",
      "Follow up professionally but don't be pushy",
      "Always include a clear call-to-action"
    ]
  }
}

REQUIREMENTS:
- Generate 5-6 diverse message templates
- Include LinkedIn connection requests, messages, and email templates
- Provide specific timing recommendations
- Include realistic response rate estimates
- Make templates easily customizable
- Consider ${jobTitle} role context
- Include follow-up and thank you templates
- Provide platform-specific optimization
- Include personalization placeholders
- Consider user's experience level and communication style
`;

      const response = await aiServiceManagerClient.generateCompletion(
        templatesPrompt,
        'communication_generation',
        userId,
        { temperature: 0.3, max_tokens: 4000 }
      );

      const templatesData = JSON.parse(response.content);
      setTemplates(templatesData.templates);
      setAnalytics(templatesData.analytics);

    } catch (error) {
      console.error('Error generating message templates:', error);
      setError(error instanceof Error ? error.message : 'Template generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const generateCustomTemplate = async () => {
    if (!customRequest.trim()) return;

    setIsLoading(true);

    try {
      const customPrompt = `
Based on this specific request: "${customRequest}"

Generate a customized outreach message template for ${jobTitle} role at ${companyName}.

Return a JSON object with this structure:
{
  "id": "custom_" + Date.now(),
  "type": "custom",
  "platform": "appropriate_platform",
  "subject": "if_email",
  "content": "customized message content",
  "tone": "appropriate_tone",
  "purpose": "derived_purpose",
  "effectiveness": estimated_score,
  "personalizationLevel": "high",
  "estimatedResponseRate": estimated_percentage,
  "bestTiming": {
    "days": ["optimal_days"],
    "hours": ["optimal_hours"],
    "timeZone": "business_hours"
  }
}
`;

      const response = await aiServiceManagerClient.generateCompletion(
        customPrompt,
        'communication_generation',
        userId,
        { temperature: 0.3, max_tokens: 1000 }
      );

      const customTemplate = JSON.parse(response.content);
      setTemplates([...templates, customTemplate]);
      setCustomRequest("");

    } catch (error) {
      console.error('Error generating custom template:', error);
      setError('Failed to generate custom template');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedItems(prev => new Set([...prev, id]));
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  const getEffectivenessColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'professional': return 'text-blue-600 bg-blue-100';
      case 'friendly': return 'text-green-600 bg-green-100';
      case 'casual': return 'text-yellow-600 bg-yellow-100';
      case 'formal': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'linkedin': return <Linkedin className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'phone': return <MessageSquare className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    if (companyName && jobTitle) {
      generateMessageTemplates();
    }
  }, [companyName, jobTitle, userId]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Smart Outreach Assistant
        </CardTitle>
        <CardDescription>
          AI-powered message templates, timing optimization, and outreach campaign management
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-gray-600">
              Generating personalized outreach templates...
            </span>
          </div>
        )}

        {error && (
          <div className="p-4 border border-red-200 rounded-md bg-red-50">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              onClick={generateMessageTemplates}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Retry Generation
            </Button>
          </div>
        )}

        {templates.length > 0 && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="timing" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timing
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Campaigns
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Templates Tab */}
            <TabsContent value="templates" className="space-y-6">
              {/* Custom Template Generator */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Custom Template Generator
                  </CardTitle>
                  <CardDescription>
                    Describe your specific outreach needs and get a customized template
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={customRequest}
                    onChange={(e) => setCustomRequest(e.target.value)}
                    placeholder="Describe your outreach scenario (e.g., 'LinkedIn message to a hiring manager asking for a referral', 'Follow-up email after meeting at a conference', etc.)"
                    rows={3}
                  />
                  <Button
                    onClick={generateCustomTemplate}
                    disabled={!customRequest.trim() || isLoading}
                  >
                    Generate Custom Template
                  </Button>
                </CardContent>
              </Card>

              {/* Message Templates */}
              <div className="space-y-4">
                {templates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          {getPlatformIcon(template.platform)}
                          {template.type.replace('_', ' ').toUpperCase()}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge className={getToneColor(template.tone)}>
                            {template.tone}
                          </Badge>
                          <Badge variant="outline">
                            {template.estimatedResponseRate}% response rate
                          </Badge>
                          <div className={`text-sm font-medium ${getEffectivenessColor(template.effectiveness)}`}>
                            {template.effectiveness}/10
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {template.subject && (
                        <div>
                          <h5 className="font-medium text-sm mb-1">Subject:</h5>
                          <p className="text-sm bg-gray-50 p-2 rounded">{template.subject}</p>
                        </div>
                      )}

                      <div>
                        <h5 className="font-medium text-sm mb-1">Message:</h5>
                        <div className="text-sm bg-blue-50 p-3 rounded whitespace-pre-line">
                          {template.content}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Purpose:</span> {template.purpose}
                        </div>
                        <div>
                          <span className="font-medium">Platform:</span> {template.platform}
                        </div>
                        <div>
                          <span className="font-medium">Personalization:</span> {template.personalizationLevel}
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-sm mb-2">Optimal Timing:</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Best Days:</span> {template.bestTiming.days.join(', ')}
                          </div>
                          <div>
                            <span className="font-medium">Best Hours:</span> {template.bestTiming.hours.join(', ')}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(template.content, template.id)}
                        >
                          {copiedItems.has(template.id) ? (
                            <Check className="h-4 w-4 mr-2" />
                          ) : (
                            <Copy className="h-4 w-4 mr-2" />
                          )}
                          Copy Template
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Customize
                        </Button>
                        <Button variant="outline" size="sm">
                          <Send className="h-4 w-4 mr-2" />
                          Use Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Timing Tab */}
            <TabsContent value="timing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Optimal Timing Analysis
                  </CardTitle>
                  <CardDescription>
                    Data-driven insights for maximum response rates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Linkedin className="h-5 w-5" />
                          LinkedIn Optimal Timing
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h5 className="font-medium mb-2">Best Days:</h5>
                          <div className="flex flex-wrap gap-2">
                            {['Tuesday', 'Wednesday', 'Thursday'].map((day) => (
                              <Badge key={day} variant="secondary">{day}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h5 className="font-medium mb-2">Best Hours:</h5>
                          <div className="flex flex-wrap gap-2">
                            {['9:00 AM', '2:00 PM', '4:00 PM'].map((hour) => (
                              <Badge key={hour} variant="outline">{hour}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h5 className="font-medium mb-2">Response Rates by Day:</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Tuesday:</span>
                              <span className="font-medium">45%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Wednesday:</span>
                              <span className="font-medium">48%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Thursday:</span>
                              <span className="font-medium">42%</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Mail className="h-5 w-5" />
                          Email Optimal Timing
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h5 className="font-medium mb-2">Best Days:</h5>
                          <div className="flex flex-wrap gap-2">
                            {['Tuesday', 'Wednesday'].map((day) => (
                              <Badge key={day} variant="secondary">{day}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h5 className="font-medium mb-2">Best Hours:</h5>
                          <div className="flex flex-wrap gap-2">
                            {['9:00 AM', '11:00 AM', '2:00 PM'].map((hour) => (
                              <Badge key={hour} variant="outline">{hour}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h5 className="font-medium mb-2">Response Rates by Day:</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Tuesday:</span>
                              <span className="font-medium">38%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Wednesday:</span>
                              <span className="font-medium">35%</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Timing Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2 text-sm">
                          <Clock className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                          Mid-week messages perform 35% better than Monday/Friday
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <Clock className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                          Messages sent at 2 PM have highest response rates
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <Clock className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                          Avoid Monday mornings and Friday afternoons
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <Clock className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                          Consider recipient's timezone for optimal timing
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Campaigns Tab */}
            <TabsContent value="campaigns" className="space-y-6">
              <div className="text-center py-8 text-gray-500">
                <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Campaign management coming soon</p>
                <p className="text-sm">Track your outreach efforts and measure success rates</p>
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              {analytics && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Outreach Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{analytics.totalCampaigns}</div>
                          <p className="text-sm text-gray-600">Total Campaigns</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{analytics.activeCampaigns}</div>
                          <p className="text-sm text-gray-600">Active</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">{analytics.overallResponseRate}%</div>
                          <p className="text-sm text-gray-600">Response Rate</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">Templates</div>
                          <p className="text-sm text-gray-600">{templates.length} Available</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Improvement Suggestions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analytics.improvementSuggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <TrendingUp className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}

        {templates.length > 0 && (
          <div className="flex justify-between text-sm text-gray-500">
            <span>Templates generated for {companyName}</span>
            <Button
              onClick={generateMessageTemplates}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate Templates
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}