/**
 * AI Resume Optimizer - Intelligent resume tailoring for specific jobs
 * Provides keyword optimization, experience highlighting, and gap analysis
 * NO FALLBACKS - Only AI-driven optimization suggestions
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  TrendingUp,
  Target,
  AlertCircle,
  CheckCircle,
  Download,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { aiServiceManagerClient } from '@/lib/services/ai-service-manager-client';

export interface ResumeOptimizationData {
  overallScore: number; // 0-100
  atsCompatibility: ATSAnalysis;
  keywordOptimization: KeywordOptimization;
  experienceOptimization: ExperienceOptimization;
  skillsOptimization: SkillsOptimization;
  gapAnalysis: GapAnalysis;
  optimizedSections: OptimizedSections;
  improvementSuggestions: ImprovementSuggestion[];
  lastOptimized: Date;
  confidence: number;
}

export interface ATSAnalysis {
  score: number; // 0-100
  issues: ATSIssue[];
  recommendations: string[];
  keywordDensity: { [keyword: string]: number };
  formatIssues: string[];
  improvementPriority: 'high' | 'medium' | 'low';
}

export interface ATSIssue {
  type: 'missing_keywords' | 'formatting' | 'structure' | 'length';
  severity: 'high' | 'medium' | 'low';
  description: string;
  solution: string;
}

export interface KeywordOptimization {
  missingKeywords: MissingKeyword[];
  weakKeywords: WeakKeyword[];
  strongKeywords: string[];
  suggestedPlacements: KeywordPlacement[];
  densityAnalysis: { optimal: number; current: number; target: number };
}

export interface MissingKeyword {
  keyword: string;
  importance: 'critical' | 'high' | 'medium';
  suggestedContext: string;
  alternativeTerms: string[];
  where: 'skills' | 'experience' | 'summary' | 'education';
}

export interface WeakKeyword {
  keyword: string;
  currentUsage: string;
  suggestedImprovement: string;
  impactLevel: 'high' | 'medium' | 'low';
}

export interface KeywordPlacement {
  keyword: string;
  section: string;
  suggestedText: string;
  reasoning: string;
}

export interface ExperienceOptimization {
  reorderSuggestions: ExperienceReorder[];
  bulletPointOptimizations: BulletOptimization[];
  quantificationSuggestions: QuantificationSuggestion[];
  relevanceScores: { [experience: string]: number };
}

export interface ExperienceReorder {
  originalOrder: number;
  suggestedOrder: number;
  experience: string;
  reasoning: string;
  relevanceScore: number;
}

export interface BulletOptimization {
  originalBullet: string;
  optimizedBullet: string;
  improvements: string[];
  impactIncrease: number; // percentage
}

export interface QuantificationSuggestion {
  experience: string;
  originalText: string;
  suggestedText: string;
  metricType: 'percentage' | 'number' | 'time' | 'money';
  reasoning: string;
}

export interface SkillsOptimization {
  skillsToAdd: SkillSuggestion[];
  skillsToEmphasize: string[];
  skillsToReword: SkillReword[];
  technicalVsSoft: { technical: number; soft: number; ideal: { technical: number; soft: number } };
}

export interface SkillSuggestion {
  skill: string;
  category: 'technical' | 'soft' | 'industry';
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  whereToAdd: string;
}

export interface SkillReword {
  originalSkill: string;
  suggestedSkill: string;
  reasoning: string;
  industryStandard: boolean;
}

export interface GapAnalysis {
  criticalGaps: CriticalGap[];
  minorGaps: MinorGap[];
  strengthAreas: StrengthArea[];
  compensationStrategies: CompensationStrategy[];
  overallFitScore: number;
}

export interface CriticalGap {
  requirement: string;
  gapSeverity: 'major' | 'moderate';
  compensationOptions: string[];
  learningPath: string;
  timeToAcquire: string;
}

export interface MinorGap {
  requirement: string;
  alternatives: string[];
  priority: 'medium' | 'low';
}

export interface StrengthArea {
  area: string;
  advantage: string;
  howToEmphasize: string;
}

export interface CompensationStrategy {
  gap: string;
  strategy: string;
  effectiveness: 'high' | 'medium' | 'low';
  implementation: string;
}

export interface OptimizedSections {
  summary: OptimizedSection;
  experience: OptimizedSection;
  skills: OptimizedSection;
  education: OptimizedSection;
}

export interface OptimizedSection {
  original: string;
  optimized: string;
  changes: string[];
  improvements: string[];
  score: number;
}

export interface ImprovementSuggestion {
  category: 'structure' | 'content' | 'keywords' | 'formatting';
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
  implementation: string;
  expectedImpact: string;
}

interface ResumeOptimizerProps {
  jobId: string;
  jobTitle: string;
  company: string;
  description?: string;
  requirements?: string;
  userId: string;
  token: string;
  hasResume: boolean;
}

export function ResumeOptimizer({
  jobId,
  jobTitle,
  company,
  description,
  requirements,
  userId,
  token,
  hasResume
}: ResumeOptimizerProps) {
  const [optimization, setOptimization] = useState<ResumeOptimizationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState<string | null>(null);

  // Auto-load optimization if user has resume
  useEffect(() => {
    if (hasResume && description && description.length > 50) {
      loadOptimization();
    }
  }, [jobId, hasResume, description]);

  const loadOptimization = async () => {
    if (!hasResume) {
      setError('Resume required for optimization analysis');
      return;
    }

    if (!description || description.length < 50) {
      setError('Job description too short for meaningful optimization');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check cache first
      const cachedOptimization = await checkCachedOptimization();
      if (cachedOptimization) {
        setOptimization(cachedOptimization);
        setIsLoading(false);
        return;
      }

      // Get user's resume
      const resumeData = await fetchUserResume();
      if (!resumeData) {
        throw new Error('Could not fetch resume data');
      }

      // Generate optimization analysis
      const optimizationPrompt = buildOptimizationPrompt(resumeData);

      const response = await aiServiceManagerClient.generateCompletion(
        optimizationPrompt,
        'resume_optimization',
        userId,
        {
          temperature: 0.2,
          max_tokens: 3000,
          format: 'json'
        }
      );

      const parsedOptimization = parseOptimizationResponse(response.content);

      // Save to cache
      await saveOptimizationToCache(parsedOptimization);

      setOptimization(parsedOptimization);
      toast.success('Resume optimization completed!');

    } catch (error) {
      console.error('Resume optimization failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Optimization failed';
      setError(errorMessage);
      toast.error(`Optimization failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const buildOptimizationPrompt = (resumeData: any): string => {
    return `Analyze and optimize the resume for this specific job opportunity:

JOB DETAILS:
Title: ${jobTitle}
Company: ${company}
Description: ${description}
Requirements: ${requirements || 'Not specified'}

CURRENT RESUME:
${resumeData.content}

OPTIMIZATION ANALYSIS:
Provide comprehensive resume optimization covering:

1. ATS COMPATIBILITY ANALYSIS:
   - Keyword analysis and density optimization
   - Format compatibility assessment
   - Structure recommendations
   - Critical missing keywords

2. KEYWORD OPTIMIZATION:
   - Missing critical keywords from job posting
   - Weak keyword usage that could be strengthened
   - Optimal keyword placement suggestions
   - Density analysis (current vs target)

3. EXPERIENCE OPTIMIZATION:
   - Reorder experiences by relevance to this role
   - Optimize bullet points for impact and relevance
   - Add quantification where missing
   - Emphasize most relevant achievements

4. SKILLS OPTIMIZATION:
   - Technical skills to add or emphasize
   - Soft skills alignment with job requirements
   - Skills to reword for industry standards
   - Skills gap identification

5. GAP ANALYSIS:
   - Critical gaps that must be addressed
   - Minor gaps with workaround strategies
   - Strength areas to emphasize
   - Compensation strategies for weaknesses

6. OPTIMIZED SECTIONS:
   - Rewrite key sections for this specific job
   - Professional summary optimization
   - Experience descriptions improvement
   - Skills section enhancement

Return as JSON with this EXACT structure:
{
  "overallScore": 75,
  "atsCompatibility": {
    "score": 70,
    "issues": [
      {
        "type": "missing_keywords",
        "severity": "high",
        "description": "Missing key technical skills",
        "solution": "Add React, TypeScript to skills section"
      }
    ],
    "recommendations": ["recommendation1", "recommendation2"],
    "keywordDensity": {"react": 0.02, "javascript": 0.03},
    "formatIssues": ["issue1", "issue2"],
    "improvementPriority": "high"
  },
  "keywordOptimization": {
    "missingKeywords": [
      {
        "keyword": "React",
        "importance": "critical",
        "suggestedContext": "Experience with React in building user interfaces",
        "alternativeTerms": ["React.js", "ReactJS"],
        "where": "skills"
      }
    ],
    "weakKeywords": [
      {
        "keyword": "JavaScript",
        "currentUsage": "Basic JavaScript knowledge",
        "suggestedImprovement": "Advanced JavaScript with ES6+ features",
        "impactLevel": "high"
      }
    ],
    "strongKeywords": ["Node.js", "Python"],
    "suggestedPlacements": [
      {
        "keyword": "API development",
        "section": "experience",
        "suggestedText": "Developed RESTful APIs using Node.js",
        "reasoning": "Matches job requirement for API experience"
      }
    ],
    "densityAnalysis": {"optimal": 0.02, "current": 0.01, "target": 0.025}
  },
  "experienceOptimization": {
    "reorderSuggestions": [
      {
        "originalOrder": 2,
        "suggestedOrder": 1,
        "experience": "Full Stack Developer at XYZ",
        "reasoning": "Most relevant to target role",
        "relevanceScore": 95
      }
    ],
    "bulletPointOptimizations": [
      {
        "originalBullet": "Worked on website development",
        "optimizedBullet": "Developed responsive web applications using React and Node.js, serving 10,000+ users",
        "improvements": ["Added specific technologies", "Quantified impact"],
        "impactIncrease": 85
      }
    ],
    "quantificationSuggestions": [
      {
        "experience": "Project Manager",
        "originalText": "Managed multiple projects",
        "suggestedText": "Managed 5 concurrent projects with budgets totaling $2M",
        "metricType": "number",
        "reasoning": "Quantifies scope and responsibility"
      }
    ],
    "relevanceScores": {"Frontend Developer": 90, "Project Manager": 70}
  },
  "skillsOptimization": {
    "skillsToAdd": [
      {
        "skill": "TypeScript",
        "category": "technical",
        "priority": "high",
        "reasoning": "Listed as required skill in job posting",
        "whereToAdd": "Technical Skills section"
      }
    ],
    "skillsToEmphasize": ["React", "Node.js"],
    "skillsToReword": [
      {
        "originalSkill": "JS",
        "suggestedSkill": "JavaScript (ES6+)",
        "reasoning": "More professional and specific",
        "industryStandard": true
      }
    ],
    "technicalVsSoft": {
      "technical": 70,
      "soft": 30,
      "ideal": {"technical": 80, "soft": 20}
    }
  },
  "gapAnalysis": {
    "criticalGaps": [
      {
        "requirement": "5+ years React experience",
        "gapSeverity": "moderate",
        "compensationOptions": ["Highlight 3 years + learning agility", "Showcase complex React projects"],
        "learningPath": "Advanced React patterns and hooks",
        "timeToAcquire": "3-6 months"
      }
    ],
    "minorGaps": [
      {
        "requirement": "Docker experience",
        "alternatives": ["Container orchestration knowledge", "DevOps exposure"],
        "priority": "medium"
      }
    ],
    "strengthAreas": [
      {
        "area": "Full-stack development",
        "advantage": "Rare combination of frontend and backend skills",
        "howToEmphasize": "Lead with full-stack projects in experience section"
      }
    ],
    "compensationStrategies": [
      {
        "gap": "Limited enterprise experience",
        "strategy": "Emphasize scalability and best practices in smaller projects",
        "effectiveness": "medium",
        "implementation": "Add metrics showing scale of personal projects"
      }
    ],
    "overallFitScore": 78
  },
  "optimizedSections": {
    "summary": {
      "original": "Software developer with experience...",
      "optimized": "Full-stack developer with 4+ years building scalable web applications using React, Node.js, and TypeScript...",
      "changes": ["Added specific technologies", "Quantified experience", "Aligned with job requirements"],
      "improvements": ["Better keyword density", "More compelling opening"],
      "score": 85
    },
    "experience": {
      "original": "...",
      "optimized": "...",
      "changes": ["Reordered by relevance", "Added quantification", "Emphasized matching skills"],
      "improvements": ["Higher relevance score", "Better ATS compatibility"],
      "score": 80
    },
    "skills": {
      "original": "...",
      "optimized": "...",
      "changes": ["Added missing keywords", "Reordered by job relevance", "Grouped by category"],
      "improvements": ["Better keyword match", "Professional presentation"],
      "score": 88
    },
    "education": {
      "original": "...",
      "optimized": "...",
      "changes": ["Added relevant coursework", "Emphasized technical focus"],
      "improvements": ["Better alignment with role"],
      "score": 75
    }
  },
  "improvementSuggestions": [
    {
      "category": "keywords",
      "priority": "high",
      "suggestion": "Add missing critical keywords: TypeScript, REST APIs",
      "implementation": "Include in skills section and experience descriptions",
      "expectedImpact": "40% improvement in ATS score"
    }
  ],
  "confidence": 0.85
}

IMPORTANT: Base all suggestions on actual job requirements and resume content. Provide specific, actionable recommendations.`;
  };

  const parseOptimizationResponse = (content: string): ResumeOptimizationData => {
    try {
      const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        ...parsed,
        lastOptimized: new Date(),
        confidence: parsed.confidence || 0.7
      };
    } catch (error) {
      console.error('Failed to parse optimization response:', error);
      throw new Error('Invalid optimization response format');
    }
  };

  const fetchUserResume = async (): Promise<any> => {
    try {
      const response = await fetch('/api/resumes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch resume');
      }

      const data = await response.json();
      return data.resumes?.[0];
    } catch (error) {
      console.error('Error fetching resume:', error);
      throw error;
    }
  };

  const checkCachedOptimization = async (): Promise<ResumeOptimizationData | null> => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/analysis-cache?type=resume_optimization`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.analysis;
      }
    } catch (error) {
      console.error('Error checking cache:', error);
    }
    return null;
  };

  const saveOptimizationToCache = async (optimizationData: ResumeOptimizationData): Promise<void> => {
    try {
      await fetch(`/api/jobs/${jobId}/analysis-cache`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'resume_optimization',
          analysis: optimizationData
        })
      });
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!hasResume) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            AI Resume Optimizer
            <Badge variant="outline" className="text-blue-600">
              Intelligent
            </Badge>
          </CardTitle>
          <CardDescription>
            AI-powered resume optimization requires an uploaded resume
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No resume uploaded</p>
            <p className="text-sm">Upload your resume in your profile to enable optimization</p>
            <Button className="mt-4" variant="outline" asChild>
              <a href="/profile">Upload Resume</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          AI Resume Optimizer
          <Badge variant="outline" className="text-blue-600">
            <Sparkles className="w-3 h-3 mr-1" />
            Intelligent
          </Badge>
        </CardTitle>
        <CardDescription>
          AI-powered resume optimization tailored for this specific job
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadOptimization} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Optimization
            </Button>
          </div>
        ) : !optimization && !isLoading ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600 mb-4">Ready to optimize your resume for this job</p>
            <Button onClick={loadOptimization} className="bg-blue-600 hover:bg-blue-700">
              <Sparkles className="w-4 h-4 mr-2" />
              Start Optimization
            </Button>
          </div>
        ) : isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-12 h-12 mx-auto mb-4">
              <FileText className="w-12 h-12 text-blue-500" />
            </div>
            <p className="text-gray-600">Analyzing and optimizing resume...</p>
            <p className="text-sm text-gray-500">This may take a few moments</p>
          </div>
        ) : optimization ? (
          <div className="space-y-6">
            {/* Overview Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(optimization.overallScore)}`}>
                  {optimization.overallScore}
                </div>
                <div className="text-sm text-gray-600">Overall Score</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(optimization.atsCompatibility.score)}`}>
                  {optimization.atsCompatibility.score}
                </div>
                <div className="text-sm text-gray-600">ATS Score</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(optimization.gapAnalysis.overallFitScore)}`}>
                  {optimization.gapAnalysis.overallFitScore}
                </div>
                <div className="text-sm text-gray-600">Job Fit</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(optimization.confidence * 100)}%
                </div>
                <div className="text-sm text-gray-600">Confidence</div>
              </div>
            </div>

            {/* Priority Issues */}
            {optimization.atsCompatibility.issues.filter(issue => issue.severity === 'high').length > 0 && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-700 flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4" />
                  Critical Issues ({optimization.atsCompatibility.issues.filter(issue => issue.severity === 'high').length})
                </h4>
                <div className="space-y-2">
                  {optimization.atsCompatibility.issues
                    .filter(issue => issue.severity === 'high')
                    .map((issue, index) => (
                      <div key={index} className="text-sm">
                        <div className="font-medium text-red-900">{issue.description}</div>
                        <div className="text-red-700 mt-1">💡 {issue.solution}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Detailed Analysis Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="keywords">Keywords</TabsTrigger>
                <TabsTrigger value="experience">Experience</TabsTrigger>
                <TabsTrigger value="gaps">Gaps</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* ATS Compatibility */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-700 mb-2">ATS Compatibility Analysis</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">ATS Score:</span>
                      <div className="flex items-center gap-2">
                        <Progress value={optimization.atsCompatibility.score} className="w-20 h-2" />
                        <span className="text-sm font-medium">{optimization.atsCompatibility.score}%</span>
                      </div>
                    </div>
                    <div className="text-xs text-blue-600">
                      Priority: <Badge className={getPriorityColor(optimization.atsCompatibility.improvementPriority)}>
                        {optimization.atsCompatibility.improvementPriority}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Top Recommendations */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">Top Improvement Suggestions</h4>
                  <div className="space-y-2">
                    {optimization.improvementSuggestions.slice(0, 3).map((suggestion, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{suggestion.suggestion}</div>
                            <div className="text-sm text-gray-600 mt-1">{suggestion.implementation}</div>
                            <div className="text-xs text-green-600 mt-1">Expected impact: {suggestion.expectedImpact}</div>
                          </div>
                          <Badge className={getPriorityColor(suggestion.priority)}>
                            {suggestion.priority}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="keywords" className="space-y-4 mt-4">
                {/* Missing Keywords */}
                {optimization.keywordOptimization.missingKeywords.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-red-700 mb-3">Missing Critical Keywords</h4>
                    <div className="space-y-2">
                      {optimization.keywordOptimization.missingKeywords.map((keyword, index) => (
                        <div key={index} className="p-3 bg-red-50 rounded border border-red-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-red-900">{keyword.keyword}</div>
                              <div className="text-sm text-red-700 mt-1">{keyword.suggestedContext}</div>
                              <div className="text-xs text-red-600 mt-1">
                                Add to: {keyword.where} • Alternatives: {keyword.alternativeTerms.join(', ')}
                              </div>
                            </div>
                            <Badge className={getPriorityColor(keyword.importance)}>
                              {keyword.importance}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Keyword Placements */}
                {optimization.keywordOptimization.suggestedPlacements.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-blue-700 mb-3">Suggested Keyword Placements</h4>
                    <div className="space-y-2">
                      {optimization.keywordOptimization.suggestedPlacements.map((placement, index) => (
                        <div key={index} className="p-3 bg-blue-50 rounded border border-blue-200">
                          <div className="font-medium text-blue-900">{placement.keyword}</div>
                          <div className="text-sm text-blue-700 mt-1 font-mono bg-white p-2 rounded">
                            "{placement.suggestedText}"
                          </div>
                          <div className="text-xs text-blue-600 mt-1">
                            Section: {placement.section} • {placement.reasoning}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="experience" className="space-y-4 mt-4">
                {/* Experience Reordering */}
                {optimization.experienceOptimization.reorderSuggestions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-purple-700 mb-3">Experience Reordering</h4>
                    <div className="space-y-2">
                      {optimization.experienceOptimization.reorderSuggestions.map((reorder, index) => (
                        <div key={index} className="p-3 bg-purple-50 rounded border border-purple-200">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-purple-900">{reorder.experience}</div>
                              <div className="text-sm text-purple-700 mt-1">{reorder.reasoning}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-purple-600">Position {reorder.originalOrder} → {reorder.suggestedOrder}</div>
                              <div className="text-xs text-green-600">Relevance: {reorder.relevanceScore}%</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bullet Point Optimizations */}
                {optimization.experienceOptimization.bulletPointOptimizations.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-green-700 mb-3">Bullet Point Improvements</h4>
                    <div className="space-y-3">
                      {optimization.experienceOptimization.bulletPointOptimizations.slice(0, 3).map((bullet, index) => (
                        <div key={index} className="p-3 bg-green-50 rounded border border-green-200">
                          <div className="space-y-2">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">BEFORE:</div>
                              <div className="text-sm text-gray-700 bg-white p-2 rounded border">
                                {bullet.originalBullet}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-green-600 mb-1">OPTIMIZED:</div>
                              <div className="text-sm text-green-800 bg-white p-2 rounded border border-green-300">
                                {bullet.optimizedBullet}
                              </div>
                            </div>
                            <div className="text-xs text-green-600">
                              Improvements: {bullet.improvements.join(', ')} • Impact: +{bullet.impactIncrease}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="gaps" className="space-y-4 mt-4">
                {/* Critical Gaps */}
                {optimization.gapAnalysis.criticalGaps.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-red-700 mb-3">Critical Skill Gaps</h4>
                    <div className="space-y-2">
                      {optimization.gapAnalysis.criticalGaps.map((gap, index) => (
                        <div key={index} className="p-3 bg-red-50 rounded border border-red-200">
                          <div className="font-medium text-red-900">{gap.requirement}</div>
                          <div className="text-sm text-red-700 mt-1">
                            <strong>Learning path:</strong> {gap.learningPath}
                          </div>
                          <div className="text-sm text-red-700">
                            <strong>Time needed:</strong> {gap.timeToAcquire}
                          </div>
                          <div className="text-xs text-red-600 mt-2">
                            <strong>Compensation options:</strong> {gap.compensationOptions.join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strength Areas */}
                {optimization.gapAnalysis.strengthAreas.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-green-700 mb-3">Your Strength Areas</h4>
                    <div className="space-y-2">
                      {optimization.gapAnalysis.strengthAreas.map((strength, index) => (
                        <div key={index} className="p-3 bg-green-50 rounded border border-green-200">
                          <div className="font-medium text-green-900">{strength.area}</div>
                          <div className="text-sm text-green-700 mt-1">{strength.advantage}</div>
                          <div className="text-xs text-green-600 mt-1">
                            <strong>How to emphasize:</strong> {strength.howToEmphasize}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

            </Tabs>

            {/* Analysis Meta */}
            <div className="text-xs text-gray-500 pt-2 border-t">
              Optimized on {new Date(optimization.lastOptimized).toLocaleDateString()} •
              Confidence: {Math.round(optimization.confidence * 100)}%
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}