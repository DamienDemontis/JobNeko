/**
 * Smart AI Communication Assistant
 * Context-aware generation of multiple communication types
 * Shows tool interface directly with on-demand generation
 */

"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MessageSquare,
  Mail,
  FileText,
  Send,
  Copy,
  Download,
  Brain,
  Sparkles,
  Eye,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { enhancedUserContextClient } from '@/lib/services/enhanced-user-context-client';
import { aiServiceManagerClient } from '@/lib/services/ai-service-manager-client';

interface CommunicationAssistantProps {
  jobId: string;
  jobTitle: string;
  company: string;
  userId: string;
  token: string;
  jobData?: {
    description?: string;
    requirements?: string;
    location?: string;
  };
}

interface GeneratedContent {
  type: string;
  title: string;
  content: string;
  subject?: string;
}

export default function CommunicationAssistantSmart({
  jobId,
  jobTitle,
  company,
  userId,
  token,
  jobData = {}
}: CommunicationAssistantProps) {
  const [selectedType, setSelectedType] = useState('cover_letter');
  const [communicationTone, setCommunicationTone] = useState('professional');
  const [contentLength, setContentLength] = useState('medium');
  const [customInstructions, setCustomInstructions] = useState('');
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('generator');

  const COMMUNICATION_TYPES = [
    {
      id: 'cover_letter',
      name: 'Cover Letter',
      description: 'Personalized cover letter for job application',
      icon: <FileText className="h-4 w-4" />
    },
    {
      id: 'linkedin_message',
      name: 'LinkedIn Message',
      description: 'Connection request or direct message to recruiters',
      icon: <MessageSquare className="h-4 w-4" />
    },
    {
      id: 'follow_up_email',
      name: 'Follow-up Email',
      description: 'Professional follow-up after application',
      icon: <Mail className="h-4 w-4" />
    },
    {
      id: 'thank_you_email',
      name: 'Thank You Email',
      description: 'Post-interview thank you message',
      icon: <Send className="h-4 w-4" />
    }
  ];

  const handleGenerate = async () => {
    if (!selectedType) {
      toast.error('Please select a communication type');
      return;
    }

    setIsGenerating(true);
    try {
      const userContext = await enhancedUserContextClient.buildEnhancedContext();

      const selectedTypeData = COMMUNICATION_TYPES.find(t => t.id === selectedType);

      const prompt = `
Generate a ${selectedTypeData?.name} for a job application.

JOB CONTEXT:
Title: ${jobTitle}
Company: ${company}
Description: ${jobData.description || 'Not provided'}
Requirements: ${jobData.requirements || 'Not provided'}

USER CONTEXT:
Name: ${userContext.name}
Industry Focus: ${userContext.industryFocus?.join(', ') || 'Not specified'}
Experience Level: ${userContext.experienceLevel || 'Not specified'}
Skills: ${userContext.professionalProfile.skills?.join(', ') || 'Not specified'}
Current Role: ${userContext.profile.currentRole || 'Not specified'}

GENERATION SETTINGS:
Communication Type: ${selectedTypeData?.name}
Tone: ${communicationTone}
Length: ${contentLength}
Custom Instructions: ${customInstructions || 'None'}

Generate a ${communicationTone} ${selectedTypeData?.name.toLowerCase()} that:
1. Is personalized using the user's background
2. Specifically addresses this ${company} ${jobTitle} role
3. Demonstrates genuine interest and relevant qualifications
4. Follows ${contentLength} length guidelines
5. Incorporates any custom instructions provided

For email subjects, provide a compelling subject line.
For LinkedIn messages, keep it concise and connection-focused.
For cover letters, include proper business formatting.

Return in JSON format:
{
  "type": "${selectedType}",
  "title": "${selectedTypeData?.name}",
  "subject": "Subject line (if applicable)",
  "content": "The generated content"
}
`;

      const response = await aiServiceManagerClient.generateJSON(
        prompt,
        'communication_generation',
        userId,
        { temperature: 0.7, max_tokens: 2000 }
      );

      const newContent: GeneratedContent = {
        type: response.type,
        title: response.title,
        content: response.content,
        subject: response.subject
      };

      setGeneratedContent(prev => [newContent, ...prev]);
      setActiveTab('results');
      toast.success(`${selectedTypeData?.name} generated successfully!`);

    } catch (error) {
      console.error('Error generating communication:', error);
      toast.error('Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard!');
  };

  const downloadContent = (content: GeneratedContent) => {
    const blob = new Blob([content.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${content.title.replace(/\s+/g, '_')}_${company}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${content.title}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-600" />
          AI Communication Assistant
        </CardTitle>
        <CardDescription>
          Generate personalized cover letters, emails, and LinkedIn messages for {company} - {jobTitle}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generator">Generator</TabsTrigger>
            <TabsTrigger value="results">Generated Content ({generatedContent.length})</TabsTrigger>
          </TabsList>

          {/* Generator Tab */}
          <TabsContent value="generator" className="space-y-6">
            {/* Communication Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Communication Type</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {COMMUNICATION_TYPES.map((type) => (
                  <div
                    key={type.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedType === type.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedType(type.id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {type.icon}
                      <span className="font-medium text-sm">{type.name}</span>
                    </div>
                    <p className="text-xs text-gray-600">{type.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Generation Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Communication Tone</Label>
                <Select value={communicationTone} onValueChange={setCommunicationTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                    <SelectItem value="confident">Confident</SelectItem>
                    <SelectItem value="conversational">Conversational</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Content Length</Label>
                <Select value={contentLength} onValueChange={setContentLength}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short & Concise</SelectItem>
                    <SelectItem value="medium">Medium Length</SelectItem>
                    <SelectItem value="long">Comprehensive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom Instructions */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Custom Instructions (Optional)
              </Label>
              <Textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Any specific points you want to highlight or include..."
                className="min-h-[80px]"
              />
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedType}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate {COMMUNICATION_TYPES.find(t => t.id === selectedType)?.name}
                </>
              )}
            </Button>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-4">
            {generatedContent.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No content generated yet. Use the Generator tab to create your first communication.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {generatedContent.map((content, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{content.title}</Badge>
                        {content.subject && (
                          <span className="text-sm text-gray-600">Subject: {content.subject}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(content.content)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadContent(content)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={content.content}
                      readOnly
                      className="min-h-[200px] bg-gray-50"
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}