/**
 * Smart AI Communication Assistant
 * Context-aware generation of multiple communication types
 * Uses user profile + job context for personalized content
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
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import SmartAIComponent from './smart-ai-component';

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

interface CommunicationType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

const COMMUNICATION_TYPES: CommunicationType[] = [
  {
    id: 'cover_letter',
    name: 'Cover Letter',
    description: 'Professional cover letter tailored to the role',
    icon: <FileText className="h-4 w-4" />,
    enabled: true
  },
  {
    id: 'application_email',
    name: 'Application Email',
    description: 'Email to accompany your application',
    icon: <Mail className="h-4 w-4" />,
    enabled: true
  },
  {
    id: 'follow_up_email',
    name: 'Follow-up Email',
    description: 'Professional follow-up after application',
    icon: <Send className="h-4 w-4" />,
    enabled: false
  },
  {
    id: 'linkedin_message',
    name: 'LinkedIn Message',
    description: 'Connection request to hiring manager',
    icon: <MessageSquare className="h-4 w-4" />,
    enabled: false
  },
  {
    id: 'thank_you_note',
    name: 'Thank You Note',
    description: 'Post-interview thank you message',
    icon: <CheckCircle className="h-4 w-4" />,
    enabled: false
  }
];

export default function CommunicationAssistantSmart({
  jobId,
  jobTitle,
  company,
  userId,
  token,
  jobData = {}
}: CommunicationAssistantProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['cover_letter', 'application_email']);
  const [communicationTone, setCommunicationTone] = useState('professional');
  const [contentLength, setContentLength] = useState('standard');
  const [customInstructions, setCustomInstructions] = useState('');
  const [activeTab, setActiveTab] = useState('cover_letter');

  const handleTypeToggle = (typeId: string, checked: boolean) => {
    if (checked) {
      setSelectedTypes(prev => [...prev, typeId]);
    } else {
      setSelectedTypes(prev => prev.filter(id => id !== typeId));
    }
  };

  const copyToClipboard = (content: string, type: string) => {
    navigator.clipboard.writeText(content);
    toast.success(`${type} copied to clipboard`);
  };

  const downloadAsFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  return (
    <SmartAIComponent
      jobId={jobId}
      userId={userId}
      token={token}
      analysisType="communication_generation"
      title="AI Communication Assistant"
      description="Generate personalized cover letters, emails, and LinkedIn messages optimized for this specific role"
      icon={<Brain className="h-5 w-5" />}
      autoLoad={false}
      additionalData={{
        communicationTypes: selectedTypes,
        tone: communicationTone,
        length: contentLength,
        customInstructions: customInstructions,
        jobData
      }}
    >
      {(data, helpers) => (
        <div className="space-y-6">
          {/* Generation Controls */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-semibold text-gray-900 mb-4">Generation Settings</h4>

            {/* Communication Types Selection */}
            <div className="space-y-3 mb-4">
              <Label className="text-sm font-medium">Select Communication Types:</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {COMMUNICATION_TYPES.map((type) => (
                  <div key={type.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={type.id}
                      checked={selectedTypes.includes(type.id)}
                      onCheckedChange={(checked) => handleTypeToggle(type.id, checked as boolean)}
                    />
                    <div className="flex items-center gap-2">
                      {type.icon}
                      <Label htmlFor={type.id} className="text-sm font-medium cursor-pointer">
                        {type.name}
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Generation Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                    <SelectItem value="concise">Concise</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom Instructions */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Custom Instructions (Optional)</Label>
              <Textarea
                placeholder="Add specific requirements, experiences to highlight, or tone adjustments..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* Generate Button */}
            <div className="flex justify-center mt-4">
              <Button
                onClick={() => helpers.refresh(true)}
                disabled={selectedTypes.length === 0 || helpers.isLoading}
                className="flex items-center gap-2"
                size="lg"
              >
                <Sparkles className="h-4 w-4" />
                {helpers.isLoading ? 'Generating...' : `Generate ${selectedTypes.length} Communication${selectedTypes.length > 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>

          {/* Generated Content */}
          {data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900">Generated Communications</h4>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {selectedTypes.length} Generated
                </Badge>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 md:grid-cols-5">
                  {selectedTypes.map((typeId) => {
                    const type = COMMUNICATION_TYPES.find(t => t.id === typeId);
                    return (
                      <TabsTrigger key={typeId} value={typeId} className="flex items-center gap-1">
                        {type?.icon}
                        <span className="hidden md:inline">{type?.name}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {selectedTypes.map((typeId) => (
                  <TabsContent key={typeId} value={typeId} className="space-y-4">
                    <div className="border rounded-lg">
                      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                        <div className="flex items-center gap-2">
                          {COMMUNICATION_TYPES.find(t => t.id === typeId)?.icon}
                          <h5 className="font-semibold text-gray-900">
                            {COMMUNICATION_TYPES.find(t => t.id === typeId)?.name}
                          </h5>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(
                              helpers.safeGet(`generated.${typeId}.content`, ''),
                              COMMUNICATION_TYPES.find(t => t.id === typeId)?.name || ''
                            )}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadAsFile(
                              helpers.safeGet(`generated.${typeId}.content`, ''),
                              `${typeId}_${company}_${jobTitle.replace(/\s+/g, '_')}.txt`
                            )}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>

                      <div className="p-4">
                        {/* Preview/Edit Toggle */}
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Eye className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Preview</span>
                          </div>
                          <div className="bg-white border rounded p-4 min-h-[300px] whitespace-pre-wrap font-mono text-sm">
                            {helpers.safeGet(`generated.${typeId}.content`, 'Content will appear here after generation...')}
                          </div>
                        </div>

                        {/* Content Analysis */}
                        <div className="border-t pt-4">
                          <h6 className="font-medium text-gray-700 mb-2">Content Analysis</h6>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Word Count:</span>
                              <p className="font-medium">{helpers.safeGet(`generated.${typeId}.analysis.wordCount`, 'N/A')}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Tone Score:</span>
                              <p className="font-medium">{helpers.safeGet(`generated.${typeId}.analysis.toneScore`, 'N/A')}/10</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Personalization:</span>
                              <p className="font-medium">{helpers.safeGet(`generated.${typeId}.analysis.personalizationLevel`, 'High')}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Impact:</span>
                              <p className="font-medium">{helpers.safeGet(`generated.${typeId}.analysis.impactScore`, 'Strong')}</p>
                            </div>
                          </div>
                        </div>

                        {/* Key Points Highlighted */}
                        {helpers.safeGet(`generated.${typeId}.keyPoints`, []).length > 0 && (
                          <div className="border-t pt-4 mt-4">
                            <h6 className="font-medium text-gray-700 mb-2">Key Points Highlighted</h6>
                            <ul className="space-y-1">
                              {helpers.safeMap(helpers.safeGet(`generated.${typeId}.keyPoints`, []), (point, index) => (
                                <li key={index} className="flex items-center gap-2 text-sm">
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  <span className="text-gray-600">{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>

              {/* Context Information */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <h6 className="font-medium text-blue-900 mb-2">Context Used in Generation</h6>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Profile Context:</span>
                    <ul className="mt-1 space-y-1">
                      <li className="text-blue-600">• Experience Level: {helpers.safeGet('context.userProfile.experienceLevel', 'Professional')}</li>
                      <li className="text-blue-600">• Key Skills: {helpers.safeJoin(helpers.safeGet('context.userProfile.skills', []))}</li>
                      <li className="text-blue-600">• Industry Focus: {helpers.safeJoin(helpers.safeGet('context.userProfile.industryFocus', []))}</li>
                    </ul>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Job Context:</span>
                    <ul className="mt-1 space-y-1">
                      <li className="text-blue-600">• Company: {company}</li>
                      <li className="text-blue-600">• Role: {jobTitle}</li>
                      <li className="text-blue-600">• Tone: {communicationTone}</li>
                      <li className="text-blue-600">• Length: {contentLength}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </SmartAIComponent>
  );
}