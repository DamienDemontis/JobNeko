"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  NotebookPen,
  Search,
  Plus,
  Calendar,
  Tag,
  FileText,
  Mic,
  Image,
  CheckSquare,
  Hash,
  Sparkles,
  Edit3,
  Trash2,
  Pin,
  Archive,
  Clock
} from 'lucide-react';
import { aiServiceManagerClient } from '@/lib/services/ai-service-manager-client';

interface SmartNote {
  id: string;
  title: string;
  content: string;
  category: 'general' | 'interview' | 'research' | 'strategy' | 'follow-up' | 'preparation';
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  aiGenerated: boolean;
  metadata?: {
    type: 'voice' | 'text' | 'screenshot' | 'meeting';
    source?: string;
    relatedContacts?: string[];
    actionItems?: string[];
  };
}

interface NoteTemplate {
  id: string;
  name: string;
  category: string;
  template: string;
  description: string;
}

interface SmartNotesProps {
  jobId: string;
  userId: string;
  jobData: {
    title: string;
    company: string;
  };
}

export function SmartNotes({ jobId, userId, jobData }: SmartNotesProps) {
  const [notes, setNotes] = useState<SmartNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState<SmartNote | null>(null);
  const [activeTab, setActiveTab] = useState('notes');
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    category: 'general' as SmartNote['category'],
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');

  const noteTemplates: NoteTemplate[] = [
    {
      id: 'interview-prep',
      name: 'Interview Preparation',
      category: 'interview',
      description: 'Structured interview preparation notes',
      template: `# Interview Preparation - ${jobData.company}

## Company Research
- Key facts about ${jobData.company}
- Recent news and developments
- Company culture and values

## Role Analysis
- Key responsibilities for ${jobData.title}
- Required skills and qualifications
- Growth opportunities

## Questions to Ask
- About the role:
- About the team:
- About the company:
- About growth:

## STAR Examples
- Leadership example:
- Technical challenge:
- Collaboration story:
- Problem-solving situation:

## Logistics
- Interview date:
- Interviewer(s):
- Format: (Phone/Video/In-person)
- Duration:
`
    },
    {
      id: 'company-research',
      name: 'Company Research',
      category: 'research',
      description: 'Comprehensive company research template',
      template: `# Company Research - ${jobData.company}

## Business Overview
- Industry:
- Business model:
- Target market:
- Revenue streams:

## Recent Developments
- News and announcements:
- Product launches:
- Leadership changes:
- Market performance:

## Competitive Landscape
- Main competitors:
- Competitive advantages:
- Market position:
- Threats and opportunities:

## Culture & Values
- Company values:
- Work environment:
- Employee reviews:
- Remote policy:

## Key People
- CEO/Leadership:
- Hiring manager:
- Team members:
- Potential contacts:
`
    },
    {
      id: 'application-strategy',
      name: 'Application Strategy',
      category: 'strategy',
      description: 'Strategic approach planning',
      template: `# Application Strategy - ${jobData.title} at ${jobData.company}

## Application Approach
- Application deadline:
- Submission method:
- Required documents:
- Follow-up plan:

## Resume Customization
- Key skills to highlight:
- Relevant experiences:
- Achievements to emphasize:
- Keywords to include:

## Cover Letter Strategy
- Opening hook:
- Key selling points:
- Company connection:
- Call to action:

## Network Leverage
- Relevant connections:
- Introduction opportunities:
- LinkedIn outreach:
- Employee contacts:

## Timeline
- Application submission:
- Follow-up dates:
- Expected response:
- Interview preparation:
`
    },
    {
      id: 'meeting-notes',
      name: 'Meeting Notes',
      category: 'general',
      description: 'Template for call/meeting notes',
      template: `# Meeting Notes

**Date:**
**Attendees:**
**Duration:**
**Type:** (Phone/Video/In-person)

## Agenda
-

## Discussion Points
-

## Action Items
- [ ]
- [ ]
- [ ]

## Next Steps
-

## Follow-up Required
-

## Additional Notes
-
`
    }
  ];

  useEffect(() => {
    loadNotes();
  }, [jobId]);

  const loadNotes = async () => {
    try {
      // Simulated notes loading - in real implementation, load from database
      const mockNotes: SmartNote[] = [
        {
          id: '1',
          title: `Interview Prep - ${jobData.company}`,
          content: 'Key points to remember for the interview...',
          category: 'interview',
          tags: ['interview', 'preparation', jobData.company.toLowerCase()],
          isPinned: true,
          isArchived: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          aiGenerated: false,
        },
        {
          id: '2',
          title: 'Company Research Notes',
          content: `Research findings about ${jobData.company}...`,
          category: 'research',
          tags: ['research', 'company'],
          isPinned: false,
          isArchived: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          aiGenerated: false,
        }
      ];
      setNotes(mockNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const createNote = async () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return;

    const note: SmartNote = {
      id: Date.now().toString(),
      title: newNote.title,
      content: newNote.content,
      category: newNote.category,
      tags: newNote.tags,
      isPinned: false,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      aiGenerated: false,
    };

    setNotes([note, ...notes]);
    setNewNote({ title: '', content: '', category: 'general', tags: [] });
    setIsCreating(false);
  };

  const updateNote = async (noteId: string, updates: Partial<SmartNote>) => {
    setNotes(notes.map(note =>
      note.id === noteId
        ? { ...note, ...updates, updatedAt: new Date() }
        : note
    ));
  };

  const deleteNote = async (noteId: string) => {
    setNotes(notes.filter(note => note.id !== noteId));
  };

  const generateAINotes = async (template: NoteTemplate) => {
    try {
      const prompt = `
Generate intelligent notes for a job application using this template and context.

JOB CONTEXT:
Position: ${jobData.title}
Company: ${jobData.company}

TEMPLATE: ${template.name}
${template.template}

INSTRUCTIONS:
1. Fill in the template with intelligent, personalized content
2. Use realistic information based on the role and company
3. Provide actionable insights and specific questions
4. Make it comprehensive but focused
5. Include relevant industry insights

Return only the filled template content, ready to use.
`;

      const response = await aiServiceManagerClient.generateCompletion(
        prompt,
        'job_analysis',
        userId,
        { temperature: 0.4, max_tokens: 2000 }
      );

      const generatedNote: SmartNote = {
        id: Date.now().toString(),
        title: `AI Generated: ${template.name} - ${jobData.company}`,
        content: response.content,
        category: template.category as SmartNote['category'],
        tags: ['ai-generated', template.category, jobData.company.toLowerCase()],
        isPinned: false,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        aiGenerated: true,
      };

      setNotes([generatedNote, ...notes]);
    } catch (error) {
      console.error('Error generating AI notes:', error);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !newNote.tags.includes(tagInput.trim())) {
      setNewNote({
        ...newNote,
        tags: [...newNote.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewNote({
      ...newNote,
      tags: newNote.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;

    return matchesSearch && matchesCategory && !note.isArchived;
  });

  const pinnedNotes = filteredNotes.filter(note => note.isPinned);
  const regularNotes = filteredNotes.filter(note => !note.isPinned);

  const getCategoryColor = (category: string) => {
    const colors = {
      general: 'bg-gray-100 text-gray-800',
      interview: 'bg-blue-100 text-blue-800',
      research: 'bg-green-100 text-green-800',
      strategy: 'bg-purple-100 text-purple-800',
      'follow-up': 'bg-orange-100 text-orange-800',
      preparation: 'bg-yellow-100 text-yellow-800',
    };
    return colors[category as keyof typeof colors] || colors.general;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <NotebookPen className="h-5 w-5" />
          Smart Notes
        </CardTitle>
        <CardDescription>
          Intelligent note-taking with AI assistance for {jobData.company}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="notes">My Notes</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="archive">Archive</TabsTrigger>
          </TabsList>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4">
            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="strategy">Strategy</SelectItem>
                  <SelectItem value="follow-up">Follow-up</SelectItem>
                  <SelectItem value="preparation">Preparation</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Note
              </Button>
            </div>

            {/* Create Note Form */}
            {isCreating && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Create New Note</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Note title..."
                    value={newNote.title}
                    onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  />

                  <Select
                    value={newNote.category}
                    onValueChange={(value) => setNewNote({ ...newNote, category: value as SmartNote['category'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="interview">Interview</SelectItem>
                      <SelectItem value="research">Research</SelectItem>
                      <SelectItem value="strategy">Strategy</SelectItem>
                      <SelectItem value="follow-up">Follow-up</SelectItem>
                      <SelectItem value="preparation">Preparation</SelectItem>
                    </SelectContent>
                  </Select>

                  <Textarea
                    placeholder="Write your note content here..."
                    value={newNote.content}
                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                    className="min-h-32"
                  />

                  {/* Tags */}
                  <div>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Add tags..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                      />
                      <Button onClick={addTag} variant="outline" size="sm">
                        <Tag className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {newNote.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="cursor-pointer">
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-1 text-xs hover:text-red-500"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={createNote}>
                      <FileText className="h-4 w-4 mr-2" />
                      Save Note
                    </Button>
                    <Button variant="outline" onClick={() => setIsCreating(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pinned Notes */}
            {pinnedNotes.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Pin className="h-4 w-4" />
                  Pinned Notes
                </h3>
                <div className="space-y-3">
                  {pinnedNotes.map((note) => (
                    <Card key={note.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium">{note.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getCategoryColor(note.category)}>
                                {note.category}
                              </Badge>
                              {note.aiGenerated && (
                                <Badge variant="outline">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  AI Generated
                                </Badge>
                              )}
                              <span className="text-xs text-gray-500">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {formatDate(note.updatedAt)}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateNote(note.id, { isPinned: false })}
                            >
                              <Pin className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingNote(note)}
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteNote(note.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-3">
                          {note.content.substring(0, 200)}...
                        </p>
                        {note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {note.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                <Hash className="h-2 w-2 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Regular Notes */}
            {regularNotes.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">All Notes</h3>
                <div className="space-y-3">
                  {regularNotes.map((note) => (
                    <Card key={note.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium">{note.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getCategoryColor(note.category)}>
                                {note.category}
                              </Badge>
                              {note.aiGenerated && (
                                <Badge variant="outline">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  AI Generated
                                </Badge>
                              )}
                              <span className="text-xs text-gray-500">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {formatDate(note.updatedAt)}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateNote(note.id, { isPinned: true })}
                            >
                              <Pin className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingNote(note)}
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteNote(note.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-3">
                          {note.content.substring(0, 200)}...
                        </p>
                        {note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {note.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                <Hash className="h-2 w-2 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {filteredNotes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <NotebookPen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No notes found</p>
                <p className="text-sm">Create your first note or try a different search</p>
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">AI-Powered Templates</h3>
              <p className="text-sm text-gray-600 mb-4">
                Use these intelligent templates to quickly create structured notes for your job search
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {noteTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        <Badge className={getCategoryColor(template.category)} variant="secondary">
                          {template.category}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => generateAINotes(template)}
                        className="ml-2"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Generate
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    <p className="text-xs text-gray-500">
                      AI will customize this template with relevant content for {jobData.company}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Archive Tab */}
          <TabsContent value="archive" className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              <Archive className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No archived notes</p>
              <p className="text-sm">Archived notes will appear here</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}