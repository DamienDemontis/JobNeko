/**
 * Enhanced Company Intelligence Center with Unified Caching
 * Fast loading, intelligent cache management, proper button states
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useUnifiedCache } from '@/hooks/use-unified-cache';
import {
  Building2,
  Users,
  TrendingUp,
  Globe,
  Award,
  Target,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Clock,
  ExternalLink,
  Shield,
  Brain,
  Sparkles
} from 'lucide-react';

interface CompanyIntelligenceCenterEnhancedProps {
  jobId: string;
  userId: string;
  jobData: {
    title: string;
    company: string;
    location?: string;
    description?: string;
    requirements?: string;
  };
  token: string;
}

interface CompanyIntelligenceData {
  overview: {
    name: string;
    industry: string;
    size: string;
    founded: string;
    headquarters: string;
    website?: string;
    description: string;
    mission?: string;
    values?: string[];
  };
  culture: {
    workLifeBalance: number;
    diversity: number;
    innovation: number;
    leadership: number;
    benefits: number;
    overall: number;
    highlights: string[];
    concerns: string[];
  };
  growth: {
    revenueGrowth?: string;
    employeeGrowth?: string;
    marketPosition: string;
    fundingStatus?: string;
    recentNews: Array<{
      title: string;
      date: string;
      impact: 'positive' | 'neutral' | 'negative';
    }>;
  };
  technology: {
    techStack: string[];
    innovationLevel: 'cutting-edge' | 'modern' | 'established' | 'legacy';
    engineeringCulture: string;
    openSource?: boolean;
  };
  insights: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    redFlags: string[];
    fitScore: number;
    recommendation: string;
  };
}

export function CompanyIntelligenceCenterEnhanced({
  jobId,
  userId,
  jobData,
  token
}: CompanyIntelligenceCenterEnhancedProps) {
  // Generate function for company intelligence
  const generateCompanyIntelligence = async (): Promise<CompanyIntelligenceData> => {
    const response = await fetch(`/api/ai-analysis/company_intelligence/${jobId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        company: jobData.company,
        jobTitle: jobData.title,
        location: jobData.location,
        description: jobData.description
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate company intelligence');
    }

    const result = await response.json();
    return result.analysis;
  };

  // Use unified cache hook
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
  } = useUnifiedCache<CompanyIntelligenceData>({
    type: 'company_intelligence',
    jobId,
    userId,
    token,
    autoLoad: true,
    generateFunction: generateCompanyIntelligence,
    additionalParams: {
      company: jobData.company
    }
  });

  // Render loading state
  if (isLoading && !data) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Intelligence Center
            <Badge variant="outline" className="ml-auto">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Analyzing
            </Badge>
          </CardTitle>
          <CardDescription>
            Gathering comprehensive intelligence about {jobData.company}...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={33} className="w-full" />
            <div className="text-sm text-muted-foreground">
              Analyzing company data, culture, and market position...
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
            <Building2 className="h-5 w-5" />
            Company Intelligence Center
            <Badge variant="destructive" className="ml-auto">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Error
            </Badge>
          </CardTitle>
          <CardDescription>Unable to analyze {jobData.company}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => generate(true)} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Analysis
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
            <Building2 className="h-5 w-5" />
            Company Intelligence Center
          </CardTitle>
          <CardDescription>
            Get comprehensive intelligence about {jobData.company}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Analyze company culture, growth trajectory, technology stack, and get personalized insights
              about your fit with this organization.
            </p>
            <Button onClick={() => generate()} className="w-full">
              <Brain className="h-4 w-4 mr-2" />
              Analyze Company Intelligence
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render data
  if (!data) return null;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Company Intelligence Center
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
          Comprehensive intelligence about {data.overview.name}
          {lastUpdated && (
            <span className="text-xs ml-2">
              Last updated: {new Date(lastUpdated).toLocaleDateString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Company Overview */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Company Overview
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Industry</p>
              <p className="text-sm">{data.overview.industry}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Size</p>
              <p className="text-sm">{data.overview.size}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Founded</p>
              <p className="text-sm">{data.overview.founded}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Headquarters</p>
              <p className="text-sm">{data.overview.headquarters}</p>
            </div>
          </div>
          {data.overview.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">About</p>
              <p className="text-sm">{data.overview.description}</p>
            </div>
          )}
          {data.overview.values && data.overview.values.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Core Values</p>
              <div className="flex flex-wrap gap-2">
                {data.overview.values.map((value, index) => (
                  <Badge key={index} variant="outline">
                    {value}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Culture Analysis */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Culture Analysis
          </h3>
          <div className="space-y-3">
            {Object.entries(data.culture).map(([key, value]) => {
              if (key === 'highlights' || key === 'concerns') return null;
              if (typeof value !== 'number') return null;

              const labels: Record<string, string> = {
                workLifeBalance: 'Work-Life Balance',
                diversity: 'Diversity & Inclusion',
                innovation: 'Innovation',
                leadership: 'Leadership',
                benefits: 'Benefits',
                overall: 'Overall Culture'
              };

              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{labels[key]}</span>
                    <span className="text-muted-foreground">{value}/10</span>
                  </div>
                  <Progress value={value * 10} className="h-2" />
                </div>
              );
            })}
          </div>

          {data.culture.highlights.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                <CheckCircle className="h-3 w-3 inline mr-1" />
                Culture Highlights
              </p>
              <ul className="space-y-1">
                {data.culture.highlights.map((highlight, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <span className="text-green-500 mt-1">•</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.culture.concerns.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                Areas of Concern
              </p>
              <ul className="space-y-1">
                {data.culture.concerns.map((concern, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <span className="text-yellow-500 mt-1">•</span>
                    <span>{concern}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <Separator />

        {/* Growth & Market Position */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Growth & Market Position
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {data.growth.revenueGrowth && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenue Growth</p>
                <p className="text-sm">{data.growth.revenueGrowth}</p>
              </div>
            )}
            {data.growth.employeeGrowth && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Employee Growth</p>
                <p className="text-sm">{data.growth.employeeGrowth}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Market Position</p>
              <p className="text-sm">{data.growth.marketPosition}</p>
            </div>
            {data.growth.fundingStatus && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Funding Status</p>
                <p className="text-sm">{data.growth.fundingStatus}</p>
              </div>
            )}
          </div>

          {data.growth.recentNews.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Recent News</p>
              <div className="space-y-2">
                {data.growth.recentNews.map((news, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Badge
                      variant={
                        news.impact === 'positive'
                          ? 'default'
                          : news.impact === 'negative'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="mt-0.5"
                    >
                      {news.impact}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{news.title}</p>
                      <p className="text-xs text-muted-foreground">{news.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Technology Stack */}
        {data.technology && (
          <>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Technology & Engineering
              </h3>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Tech Stack</p>
                <div className="flex flex-wrap gap-2">
                  {data.technology.techStack.map((tech, index) => (
                    <Badge key={index} variant="outline">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Innovation Level</p>
                  <Badge
                    variant={
                      data.technology.innovationLevel === 'cutting-edge'
                        ? 'default'
                        : data.technology.innovationLevel === 'modern'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {data.technology.innovationLevel}
                  </Badge>
                </div>
                {data.technology.openSource !== undefined && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Open Source</p>
                    <Badge variant={data.technology.openSource ? 'default' : 'secondary'}>
                      {data.technology.openSource ? 'Active' : 'Limited'}
                    </Badge>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Engineering Culture</p>
                <p className="text-sm">{data.technology.engineeringCulture}</p>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Personalized Insights */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Personalized Insights
          </h3>

          <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium">Fit Score</p>
              <p className="text-2xl font-bold">{data.insights.fitScore}%</p>
            </div>
            <div className="flex-1">
              <Progress value={data.insights.fitScore} className="h-3" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.insights.strengths.length > 0 && (
              <div>
                <p className="text-sm font-medium text-green-600 mb-2">Strengths</p>
                <ul className="space-y-1">
                  {data.insights.strengths.map((strength, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-1" />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.insights.weaknesses.length > 0 && (
              <div>
                <p className="text-sm font-medium text-yellow-600 mb-2">Considerations</p>
                <ul className="space-y-1">
                  {data.insights.weaknesses.map((weakness, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <AlertTriangle className="h-3 w-3 text-yellow-500 mt-1" />
                      <span>{weakness}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {data.insights.opportunities.length > 0 && (
            <div>
              <p className="text-sm font-medium text-blue-600 mb-2">Opportunities</p>
              <ul className="space-y-1">
                {data.insights.opportunities.map((opportunity, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <Target className="h-3 w-3 text-blue-500 mt-1" />
                    <span>{opportunity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.insights.redFlags.length > 0 && (
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm font-medium text-red-600 mb-2">Red Flags</p>
              <ul className="space-y-1">
                {data.insights.redFlags.map((flag, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 text-red-500 mt-1" />
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-4 bg-primary/5 rounded-lg">
            <p className="text-sm font-medium mb-1">Recommendation</p>
            <p className="text-sm">{data.insights.recommendation}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}