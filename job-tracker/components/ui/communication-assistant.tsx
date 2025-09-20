"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, MessageSquare, FileText, Copy, RefreshCw, CheckCircle, Edit3 } from 'lucide-react';
import { aiServiceManagerClient } from '@/lib/services/ai-service-manager-client';
import { enhancedUserContextClient } from '@/lib/services/enhanced-user-context-client';
import { webIntelligenceService } from '@/lib/services/web-intelligence';

interface CommunicationTemplate {
  type: 'cover_letter' | 'follow_up_email' | 'linkedin_message' | 'thank_you_note' | 'inquiry_email';
  title: string;
  content: string;
  tone: 'professional' | 'formal' | 'casual' | 'creative';
  length: 'brief' | 'standard' | 'detailed';
  purpose: string;
  keyPoints: string[];
  personalizations: Record<string, string>;
  complianceScore: number;
  engagementScore: number;
  effectiveness: {
    clarity: number;
    persuasiveness: number;
    professionalism: number;
    personalization: number;
  };
}

interface CommunicationStrategy {
  recommendedSequence: CommunicationStep[];
  timingStrategy: {
    initialContact: string;
    followUpIntervals: string[];
    maxAttempts: number;
  };
  platformOptimization: {
    email: string[];
    linkedin: string[];
    phone: string[];
  };
  keyMessages: string[];
  avoidanceTopics: string[];
}

interface CommunicationStep {
  sequence: number;
  type: string;
  timing: string;
  purpose: string;
  template: string;
  successMetrics: string[];
}

interface CompanyInsights {
  communicationStyle: string;
  culturalValues: string[];
  responsePatterns: string;
  decisionMakers: string[];
  preferredChannels: string[];
}

interface CommunicationAssistantProps {
  jobId: string;
  userId: string;
  jobData: {
    title: string;
    company: string;
    description: string;
    requirements: string;
    recruiterName?: string;
    recruiterEmail?: string;
  };
}

export function CommunicationAssistant({ jobId, userId, jobData }: CommunicationAssistantProps) {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [strategy, setStrategy] = useState<CommunicationStrategy | null>(null);
  const [companyInsights, setCompanyInsights] = useState<CompanyInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("cover-letter");
  const [customInstructions, setCustomInstructions] = useState("");
  const [selectedTone, setSelectedTone] = useState<string>("professional");
  const [selectedLength, setSelectedLength] = useState<string>("standard");
  const [error, setError] = useState<string | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  const generateCommunications = async () => {
    if (!jobData.title || !jobData.company) {
      setError('Job title and company are required for communication generation');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [userContext, companyIntel] = await Promise.all([
        enhancedUserContextClient.buildEnhancedContext(),
        webIntelligenceService.getCompanyIntelligence(jobData.company, userId)
      ]);

      // Generate comprehensive communication strategy
      const strategyPrompt = `
You are an expert communication strategist specializing in job applications. Create a comprehensive communication strategy and templates.

JOB INFORMATION:
Title: ${jobData.title}
Company: ${jobData.company}
Description: ${jobData.description}
Requirements: ${jobData.requirements}
Recruiter: ${jobData.recruiterName || 'Not specified'}
Recruiter Email: ${jobData.recruiterEmail || 'Not specified'}

USER CONTEXT:
Name: ${userContext.name}
Industry Focus: ${userContext.professionalProfile.industryFocus?.join(', ') || 'Not specified'}
Career Level: ${userContext.marketPositioning.experienceLevel}
Communication Style: ${userContext.communicationStyle.tone}
Key Skills: ${userContext.professionalProfile.keySkills.join(', ')}
Years Experience: ${userContext.professionalProfile.yearsOfExperience}
Unique Value Props: ${userContext.marketPositioning.uniqueValueProps.join(', ')}

COMPANY INTELLIGENCE:
Industry: ${companyIntel.industry}
Business Model: ${companyIntel.businessModel}
Employee Count: ${companyIntel.teamComposition.totalEmployees}
Founded: ${companyIntel.foundedYear || 'Unknown'}
Financial Health: ${companyIntel.financialData.financialHealth}
Recent News: ${companyIntel.recentNews.slice(0, 3).map(n => n.title).join('; ')}

CUSTOM INSTRUCTIONS: ${customInstructions || 'None'}
PREFERRED TONE: ${selectedTone}
PREFERRED LENGTH: ${selectedLength}

Generate a comprehensive communication package including:

1. COMMUNICATION STRATEGY
2. MULTIPLE TEMPLATES (cover letter, follow-up emails, LinkedIn messages, thank you notes)
3. COMPANY-SPECIFIC INSIGHTS
4. TIMING RECOMMENDATIONS

Return a JSON object with this exact structure:
{
  "strategy": {
    "recommendedSequence": [
      {
        "sequence": 1,
        "type": "cover_letter",
        "timing": "with application",
        "purpose": "purpose description",
        "template": "template name",
        "successMetrics": ["metric1", "metric2"]
      }
    ],
    "timingStrategy": {
      "initialContact": "timing description",
      "followUpIntervals": ["interval1", "interval2"],
      "maxAttempts": 3
    },
    "platformOptimization": {
      "email": ["tip1", "tip2"],
      "linkedin": ["tip1", "tip2"],
      "phone": ["tip1", "tip2"]
    },
    "keyMessages": ["message1", "message2"],
    "avoidanceTopics": ["topic1", "topic2"]
  },
  "templates": [
    {
      "type": "cover_letter",
      "title": "Professional Cover Letter",
      "content": "complete template text",
      "tone": "${selectedTone}",
      "length": "${selectedLength}",
      "purpose": "primary application document",
      "keyPoints": ["point1", "point2"],
      "personalizations": {"[COMPANY_NAME]": "${jobData.company}", "[ROLE_TITLE]": "${jobData.title}"},
      "complianceScore": 95,
      "engagementScore": 88,
      "effectiveness": {
        "clarity": 92,
        "persuasiveness": 89,
        "professionalism": 96,
        "personalization": 85
      }
    }
  ],
  "companyInsights": {
    "communicationStyle": "style description",
    "culturalValues": ["value1", "value2"],
    "responsePatterns": "pattern description",
    "decisionMakers": ["person1", "person2"],
    "preferredChannels": ["email", "linkedin"]
  }
}

TEMPLATE REQUIREMENTS:
- Create templates for: cover_letter, follow_up_email, linkedin_message, thank_you_note, inquiry_email
- Use placeholder variables like [COMPANY_NAME], [ROLE_TITLE], [YOUR_NAME], [RECRUITER_NAME]
- Match the requested tone and length
- Include specific company and role details
- Demonstrate knowledge of company culture and values
- Highlight relevant user skills and experience
- Include clear call-to-actions
- Ensure ATS and email client compatibility
- Maintain professional standards while showing personality

PERSONALIZATION REQUIREMENTS:
- Reference specific company achievements, values, or recent news
- Connect user's experience to role requirements
- Use industry-appropriate language and terminology
- Include relevant metrics or achievements when possible
- Show understanding of company's market position
- Demonstrate cultural fit awareness
`;

      const response = await aiServiceManagerClient.generateCompletion(
        strategyPrompt,
        'communication',
        userId,
        { temperature: 0.4, max_tokens: 4000 }
      );

      const communicationData = JSON.parse(response.content);

      setStrategy(communicationData.strategy);
      setTemplates(communicationData.templates);
      setCompanyInsights(communicationData.companyInsights);

    } catch (error) {
      console.error('Error generating communications:', error);
      setError(error instanceof Error ? error.message : 'Generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (content: string, templateType: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedTemplate(templateType);
      setTimeout(() => setCopiedTemplate(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTemplate = (template: CommunicationTemplate) => {
    let content = template.content;
    Object.entries(template.personalizations).forEach(([placeholder, value]) => {
      content = content.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });
    return content;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          AI Communication Assistant
        </CardTitle>
        <CardDescription>
          Generate personalized cover letters, emails, and LinkedIn messages optimized for this specific role
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Generation Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Communication Tone</label>
            <Select value={selectedTone} onValueChange={setSelectedTone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="formal">Formal</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Content Length</label>
            <Select value={selectedLength} onValueChange={setSelectedLength}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brief">Brief</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={generateCommunications}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Generate Communications
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Custom Instructions */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Custom Instructions (Optional)
          </label>
          <Textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="Add any specific requirements, talking points, or style preferences..."
            className="min-h-[80px]"
          />
        </div>

        {error && (
          <div className="p-4 border border-red-200 rounded-md bg-red-50">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              onClick={generateCommunications}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Retry Generation
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-gray-600">
              Generating personalized communications...
            </span>
          </div>
        )}

        {templates.length > 0 && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="cover-letter">
                <FileText className="h-4 w-4 mr-1" />
                Cover Letter
              </TabsTrigger>
              <TabsTrigger value="follow-up">
                <Mail className="h-4 w-4 mr-1" />
                Follow-up
              </TabsTrigger>
              <TabsTrigger value="linkedin">
                <MessageSquare className="h-4 w-4 mr-1" />
                LinkedIn
              </TabsTrigger>
              <TabsTrigger value="thank-you">
                <CheckCircle className="h-4 w-4 mr-1" />
                Thank You
              </TabsTrigger>
              <TabsTrigger value="strategy">
                Strategy
              </TabsTrigger>
            </TabsList>

            {/* Cover Letter Tab */}
            <TabsContent value="cover-letter" className="space-y-4">
              {templates
                .filter(t => t.type === 'cover_letter')
                .map((template, index) => (
                <div key={index} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{template.title}</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        Compliance: {template.complianceScore}%
                      </Badge>
                      <Badge variant="outline">
                        Engagement: {template.engagementScore}%
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div className="text-center">
                      <div className={`font-medium ${getScoreColor(template.effectiveness.clarity)}`}>
                        {template.effectiveness.clarity}%
                      </div>
                      <div className="text-gray-600">Clarity</div>
                    </div>
                    <div className="text-center">
                      <div className={`font-medium ${getScoreColor(template.effectiveness.persuasiveness)}`}>
                        {template.effectiveness.persuasiveness}%
                      </div>
                      <div className="text-gray-600">Persuasiveness</div>
                    </div>
                    <div className="text-center">
                      <div className={`font-medium ${getScoreColor(template.effectiveness.professionalism)}`}>
                        {template.effectiveness.professionalism}%
                      </div>
                      <div className="text-gray-600">Professional</div>
                    </div>
                    <div className="text-center">
                      <div className={`font-medium ${getScoreColor(template.effectiveness.personalization)}`}>
                        {template.effectiveness.personalization}%
                      </div>
                      <div className="text-gray-600">Personal</div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-gray-50">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {formatTemplate(template)}
                    </pre>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => copyToClipboard(formatTemplate(template), template.type)}
                      variant="outline"
                      size="sm"
                    >
                      {copiedTemplate === template.type ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Template
                        </>
                      )}
                    </Button>
                    <div className="text-xs text-gray-500">
                      Key Points: {template.keyPoints.join(', ')}
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Follow-up Email Tab */}
            <TabsContent value="follow-up" className="space-y-4">
              {templates
                .filter(t => t.type === 'follow_up_email')
                .map((template, index) => (
                <div key={index} className="space-y-4">
                  <h3 className="font-semibold">{template.title}</h3>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {formatTemplate(template)}
                    </pre>
                  </div>
                  <Button
                    onClick={() => copyToClipboard(formatTemplate(template), template.type)}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Email Template
                  </Button>
                </div>
              ))}
            </TabsContent>

            {/* LinkedIn Message Tab */}
            <TabsContent value="linkedin" className="space-y-4">
              {templates
                .filter(t => t.type === 'linkedin_message')
                .map((template, index) => (
                <div key={index} className="space-y-4">
                  <h3 className="font-semibold">{template.title}</h3>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {formatTemplate(template)}
                    </pre>
                  </div>
                  <Button
                    onClick={() => copyToClipboard(formatTemplate(template), template.type)}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy LinkedIn Message
                  </Button>
                </div>
              ))}
            </TabsContent>

            {/* Thank You Note Tab */}
            <TabsContent value="thank-you" className="space-y-4">
              {templates
                .filter(t => t.type === 'thank_you_note')
                .map((template, index) => (
                <div key={index} className="space-y-4">
                  <h3 className="font-semibold">{template.title}</h3>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {formatTemplate(template)}
                    </pre>
                  </div>
                  <Button
                    onClick={() => copyToClipboard(formatTemplate(template), template.type)}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Thank You Note
                  </Button>
                </div>
              ))}
            </TabsContent>

            {/* Strategy Tab */}
            <TabsContent value="strategy" className="space-y-6">
              {strategy && (
                <>
                  {/* Communication Sequence */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Recommended Communication Sequence</h3>
                    {strategy.recommendedSequence.map((step, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Step {step.sequence}: {step.type.replace('_', ' ')}</h4>
                          <Badge variant="outline">{step.timing}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{step.purpose}</p>
                        <div className="text-xs text-gray-500">
                          Success Metrics: {step.successMetrics.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Key Messages */}
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <h3 className="font-semibold mb-2">Key Messages to Emphasize</h3>
                    <ul className="text-sm space-y-1">
                      {strategy.keyMessages.map((message, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                          {message}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Company Insights */}
                  {companyInsights && (
                    <div className="p-4 border rounded-lg bg-green-50">
                      <h3 className="font-semibold mb-3">Company Communication Insights</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-medium mb-1">Communication Style</h4>
                          <p className="text-gray-600">{companyInsights.communicationStyle}</p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">Response Patterns</h4>
                          <p className="text-gray-600">{companyInsights.responsePatterns}</p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">Cultural Values</h4>
                          <div className="flex flex-wrap gap-1">
                            {companyInsights.culturalValues.map((value, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {value}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">Preferred Channels</h4>
                          <div className="flex flex-wrap gap-1">
                            {companyInsights.preferredChannels.map((channel, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {channel}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Platform Optimization */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(strategy.platformOptimization).map(([platform, tips]) => (
                      <div key={platform} className="p-3 border rounded-lg">
                        <h4 className="font-medium mb-2 capitalize">{platform} Tips</h4>
                        <ul className="text-sm space-y-1">
                          {tips.map((tip, index) => (
                            <li key={index} className="text-gray-600">• {tip}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}

        {templates.length > 0 && (
          <Button
            onClick={generateCommunications}
            variant="outline"
            className="w-full"
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerate All Communications
          </Button>
        )}
      </CardContent>
    </Card>
  );
}