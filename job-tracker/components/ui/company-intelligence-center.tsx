"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Building2,
  TrendingUp,
  Users,
  DollarSign,
  Globe,
  Newspaper,
  AlertCircle,
  CheckCircle,
  Target,
  Lightbulb,
  ChevronDown,
  Shield,
  Activity,
  Star,
  MessageSquare,
  ChartBar,
  Briefcase
} from 'lucide-react';
// TODO: Replace with API call - webIntelligenceService cannot be used client-side
// import { webIntelligenceService } from '@/lib/services/web-intelligence';
import { aiServiceManagerClient } from '@/lib/services/ai-service-manager-client';

interface CompanyDeepDive {
  financialHealth: {
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
    revenue?: number;
    revenueGrowth?: number;
    profitMargin?: number;
    fundingHistory: Array<{
      round: string;
      amount: number;
      date: string;
      investors: string[];
    }>;
    cashRunway?: number;
    debtToEquity?: number;
  };
  marketPosition: {
    industryRank: number;
    marketShare?: number;
    competitiveAdvantages: string[];
    threats: string[];
    opportunities: string[];
    moat: 'strong' | 'moderate' | 'weak' | 'none';
  };
  leadership: {
    ceo: { name: string; tenure: number; background: string; };
    keyExecutives: Array<{ name: string; role: string; background: string; }>;
    boardMembers?: Array<{ name: string; background: string; }>;
    leadershipStability: 'high' | 'medium' | 'low';
  };
  culture: {
    glassdoorRating?: number;
    employeeSatisfaction?: number;
    workLifeBalance?: number;
    diversity?: number;
    culturalValues: string[];
    managementStyle: string;
    remotePolicy: string;
  };
  news: {
    recent: Array<{
      title: string;
      date: string;
      sentiment: 'positive' | 'neutral' | 'negative';
      impact: 'high' | 'medium' | 'low';
      summary: string;
    }>;
    trends: string[];
    mediaSentiment: 'positive' | 'mixed' | 'negative';
  };
  risks: {
    overall: 'low' | 'medium' | 'high';
    factors: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>;
    mitigations: string[];
  };
  growth: {
    trajectory: 'rapid' | 'steady' | 'stagnant' | 'declining';
    employeeGrowth: number;
    expansionPlans: string[];
    innovationFocus: string[];
    marketOpportunities: string[];
  };
}

interface SmartQuestions {
  categories: {
    strategy: string[];
    culture: string[];
    team: string[];
    growth: string[];
    challenges: string[];
    role: string[];
  };
  redFlags: string[];
  powerQuestions: Array<{
    question: string;
    purpose: string;
    whenToAsk: string;
  }>;
}

interface CompanyIntelligenceCenterProps {
  jobId: string;
  userId: string;
  jobData: {
    title: string;
    company: string;
    location?: string;
    description?: string;
    requirements?: string;
  };
}

export function CompanyIntelligenceCenter({ jobId, userId, jobData }: CompanyIntelligenceCenterProps) {
  const [companyData, setCompanyData] = useState<CompanyDeepDive | null>(null);
  const [smartQuestions, setSmartQuestions] = useState<SmartQuestions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const analyzeCompany = async () => {
    if (!jobData.company) {
      setError('Company name is required for analysis');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with API call to avoid browser safety issues
      const companyIntel = {
        companyName: jobData.company,
        industry: 'Technology',
        businessModel: 'Loading...',
        foundedYear: 2020,
        financialData: { revenue: 0, employees: 0, fundingRounds: [], financialHealth: 'unknown' as const },
        recentNews: [{ title: 'Loading news...', url: '', summary: '', date: new Date(), sentiment: 'neutral' as const, category: 'general' as const }],
        teamComposition: {
          totalEmployees: 0,
          departments: [],
          seniorityDistribution: {},
          diversityMetrics: {},
          leadershipTeam: [],
          growthRate: 0
        },
        competitorAnalysis: { mainCompetitors: [], marketPosition: 'unknown' as const, competitiveAdvantages: [], marketShare: 0 },
        industryOutlook: { growthProjection: 'stable' as const, keyTrends: [], challenges: [], opportunities: [] },
        riskAssessment: { overallRisk: 'medium' as const, stabilityFactors: [], concerningSignals: [], positiveIndicators: [] },
        lastUpdated: new Date(),
        dataQuality: 'limited' as const
      };

      const analysisPrompt = `
You are an expert company analyst providing comprehensive intelligence for job seekers.

TASK: Perform a deep dive analysis on the company and generate strategic insights.

COMPANY: ${jobData.company}
JOB ROLE: ${jobData.title}
LOCATION: ${jobData.location || 'Not specified'}

COMPANY INTELLIGENCE DATA:
Industry: ${companyIntel.industry}
Business Model: ${companyIntel.businessModel}
Financial Health: ${companyIntel.financialData.financialHealth}
Employee Count: ${companyIntel.teamComposition.totalEmployees}
Employee Growth: ${companyIntel.teamComposition.growthRate}%
Founded: ${companyIntel.foundedYear || 'Unknown'}
Recent News: ${companyIntel.recentNews.slice(0, 3).map(n => n.title).join('; ')}

JOB CONTEXT:
${jobData.description ? jobData.description.substring(0, 500) : 'Not provided'}

ANALYSIS REQUIREMENTS:
1. Financial health and stability assessment
2. Market position and competitive landscape
3. Leadership quality and stability
4. Company culture and employee satisfaction
5. Recent news and media sentiment
6. Risk assessment and red flags
7. Growth trajectory and opportunities
8. Smart interview questions based on findings

Return a JSON object with this exact structure:
{
  "companyDeepDive": {
    "financialHealth": {
      "status": "excellent|good|fair|poor|unknown",
      "revenue": number or null,
      "revenueGrowth": number or null,
      "profitMargin": number or null,
      "fundingHistory": [
        {
          "round": "Series A/B/C/IPO",
          "amount": number,
          "date": "YYYY-MM",
          "investors": ["Investor 1", "Investor 2"]
        }
      ],
      "cashRunway": number or null,
      "debtToEquity": number or null
    },
    "marketPosition": {
      "industryRank": number,
      "marketShare": number or null,
      "competitiveAdvantages": ["advantage1", "advantage2"],
      "threats": ["threat1", "threat2"],
      "opportunities": ["opportunity1", "opportunity2"],
      "moat": "strong|moderate|weak|none"
    },
    "leadership": {
      "ceo": {
        "name": "CEO Name",
        "tenure": number,
        "background": "Background summary"
      },
      "keyExecutives": [
        {
          "name": "Executive Name",
          "role": "Role",
          "background": "Background"
        }
      ],
      "leadershipStability": "high|medium|low"
    },
    "culture": {
      "glassdoorRating": number or null,
      "employeeSatisfaction": number or null,
      "workLifeBalance": number or null,
      "diversity": number or null,
      "culturalValues": ["value1", "value2"],
      "managementStyle": "collaborative/hierarchical/startup/corporate",
      "remotePolicy": "fully remote/hybrid/office-first/flexible"
    },
    "news": {
      "recent": [
        {
          "title": "News headline",
          "date": "YYYY-MM-DD",
          "sentiment": "positive|neutral|negative",
          "impact": "high|medium|low",
          "summary": "Brief summary"
        }
      ],
      "trends": ["trend1", "trend2"],
      "mediaSentiment": "positive|mixed|negative"
    },
    "risks": {
      "overall": "low|medium|high",
      "factors": [
        {
          "type": "financial/market/regulatory/competitive",
          "severity": "low|medium|high",
          "description": "Risk description"
        }
      ],
      "mitigations": ["mitigation1", "mitigation2"]
    },
    "growth": {
      "trajectory": "rapid|steady|stagnant|declining",
      "employeeGrowth": number,
      "expansionPlans": ["plan1", "plan2"],
      "innovationFocus": ["area1", "area2"],
      "marketOpportunities": ["opportunity1", "opportunity2"]
    }
  },
  "smartQuestions": {
    "categories": {
      "strategy": [
        "How does the company plan to maintain its competitive advantage in...",
        "What are the key strategic initiatives for the next 12-18 months?"
      ],
      "culture": [
        "How would you describe the team dynamics and collaboration style?",
        "What does career growth typically look like here?"
      ],
      "team": [
        "Who would I be working most closely with?",
        "How is the team structured and what are the current priorities?"
      ],
      "growth": [
        "What are the biggest opportunities for impact in this role?",
        "How has the team/department grown over the past year?"
      ],
      "challenges": [
        "What are the biggest challenges the team is facing?",
        "What would success look like in the first 90 days?"
      ],
      "role": [
        "What are the immediate priorities for this position?",
        "How does this role contribute to broader company objectives?"
      ]
    },
    "redFlags": [
      "Questions to subtly probe about [specific concern]",
      "How to assess [risk factor] without being direct"
    ],
    "powerQuestions": [
      {
        "question": "Strategic question based on research",
        "purpose": "What this reveals",
        "whenToAsk": "Best timing in interview process"
      }
    ]
  }
}

IMPORTANT:
- Base all analysis on provided company intelligence data
- Generate realistic insights based on industry patterns
- Create thoughtful, research-informed questions
- Identify both opportunities and risks
- Provide actionable intelligence for job seekers
`;

      const response = await aiServiceManagerClient.generateCompletion(
        analysisPrompt,
        'company_research',
        userId,
        { temperature: 0.3, max_tokens: 4000 }
      );

      const analysisData = JSON.parse(response.content);

      setCompanyData(analysisData.companyDeepDive);
      setSmartQuestions(analysisData.smartQuestions);

    } catch (error) {
      console.error('Error analyzing company:', error);
      setError(error instanceof Error ? error.message : 'Company analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50';
      case 'good': return 'text-blue-600 bg-blue-50';
      case 'fair': return 'text-yellow-600 bg-yellow-50';
      case 'poor': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600';
      case 'neutral': return 'text-gray-600';
      case 'negative': return 'text-red-600';
      case 'mixed': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Company Intelligence Center
        </CardTitle>
        <CardDescription>
          Comprehensive analysis and strategic insights about {jobData.company}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!companyData && !isLoading && (
          <Button
            onClick={analyzeCompany}
            className="w-full"
            disabled={isLoading}
          >
            <Target className="h-4 w-4 mr-2" />
            Analyze Company Intelligence
          </Button>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-gray-600">
              Gathering intelligence on {jobData.company}...
            </span>
          </div>
        )}

        {error && (
          <div className="p-4 border border-red-200 rounded-md bg-red-50">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              onClick={analyzeCompany}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Retry Analysis
            </Button>
          </div>
        )}

        {companyData && (
          <div className="space-y-6">
            {/* Quick Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-4 border rounded-lg ${getHealthColor(companyData.financialHealth.status)}`}>
                <DollarSign className="h-5 w-5 mb-1" />
                <p className="font-semibold">Financial Health</p>
                <p className="text-sm">{companyData.financialHealth.status.toUpperCase()}</p>
              </div>
              <div className={`p-4 border rounded-lg ${getRiskColor(companyData.risks.overall)}`}>
                <Shield className="h-5 w-5 mb-1" />
                <p className="font-semibold">Risk Level</p>
                <p className="text-sm">{companyData.risks.overall.toUpperCase()}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <TrendingUp className="h-5 w-5 mb-1 text-blue-600" />
                <p className="font-semibold">Growth</p>
                <p className="text-sm">{companyData.growth.trajectory.toUpperCase()}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <Star className="h-5 w-5 mb-1 text-yellow-600" />
                <p className="font-semibold">Culture</p>
                <p className="text-sm">{companyData.culture.glassdoorRating || 'N/A'}/5</p>
              </div>
            </div>

            {/* Tabbed Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="culture">Culture</TabsTrigger>
                <TabsTrigger value="risks">Risks</TabsTrigger>
                <TabsTrigger value="questions">Questions</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                {/* Market Position */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Market Position</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Industry Rank</span>
                      <Badge variant="outline">#{companyData.marketPosition.industryRank}</Badge>
                    </div>
                    {companyData.marketPosition.marketShare && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Market Share</span>
                        <span className="font-medium">{companyData.marketPosition.marketShare}%</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Competitive Moat</span>
                      <Badge className={getHealthColor(companyData.marketPosition.moat)}>
                        {companyData.marketPosition.moat}
                      </Badge>
                    </div>

                    <div className="pt-2">
                      <p className="text-sm font-medium mb-2">Competitive Advantages</p>
                      <div className="flex flex-wrap gap-2">
                        {companyData.marketPosition.competitiveAdvantages.map((adv, idx) => (
                          <Badge key={idx} variant="secondary">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {adv}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent News */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Newspaper className="h-4 w-4" />
                      Recent News & Sentiment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm">Overall Media Sentiment</span>
                      <Badge className={getSentimentColor(companyData.news.mediaSentiment)}>
                        {companyData.news.mediaSentiment}
                      </Badge>
                    </div>
                    {companyData.news.recent.map((news, idx) => (
                      <div key={idx} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="text-sm font-medium">{news.title}</h4>
                          <Badge variant="outline" className={getSentimentColor(news.sentiment)}>
                            {news.sentiment}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{news.summary}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{news.date}</span>
                          <Badge variant="outline" className="text-xs">
                            {news.impact} impact
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Financial Tab */}
              <TabsContent value="financial" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Financial Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {companyData.financialHealth.revenue && (
                        <div>
                          <p className="text-sm text-gray-600">Revenue</p>
                          <p className="text-xl font-bold">
                            ${(companyData.financialHealth.revenue / 1000000).toFixed(1)}M
                          </p>
                        </div>
                      )}
                      {companyData.financialHealth.revenueGrowth && (
                        <div>
                          <p className="text-sm text-gray-600">Revenue Growth</p>
                          <p className="text-xl font-bold text-green-600">
                            +{companyData.financialHealth.revenueGrowth}%
                          </p>
                        </div>
                      )}
                      {companyData.financialHealth.profitMargin && (
                        <div>
                          <p className="text-sm text-gray-600">Profit Margin</p>
                          <p className="text-xl font-bold">
                            {companyData.financialHealth.profitMargin}%
                          </p>
                        </div>
                      )}
                      {companyData.financialHealth.cashRunway && (
                        <div>
                          <p className="text-sm text-gray-600">Cash Runway</p>
                          <p className="text-xl font-bold">
                            {companyData.financialHealth.cashRunway} months
                          </p>
                        </div>
                      )}
                    </div>

                    {companyData.financialHealth.fundingHistory.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Funding History</h4>
                        <div className="space-y-2">
                          {companyData.financialHealth.fundingHistory.map((round, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div>
                                <Badge variant="outline">{round.round}</Badge>
                                <span className="text-sm ml-2">{round.date}</span>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">${(round.amount / 1000000).toFixed(1)}M</p>
                                <p className="text-xs text-gray-600">{round.investors.join(', ')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Culture Tab */}
              <TabsContent value="culture" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Culture & Employee Experience</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Ratings */}
                    <div className="grid grid-cols-2 gap-4">
                      {companyData.culture.glassdoorRating && (
                        <div>
                          <p className="text-sm text-gray-600">Glassdoor Rating</p>
                          <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-500" />
                            <span className="text-xl font-bold">
                              {companyData.culture.glassdoorRating}/5
                            </span>
                          </div>
                        </div>
                      )}
                      {companyData.culture.employeeSatisfaction && (
                        <div>
                          <p className="text-sm text-gray-600">Employee Satisfaction</p>
                          <div className="flex items-center gap-2">
                            <Progress value={companyData.culture.employeeSatisfaction} className="h-2 flex-1" />
                            <span className="text-sm font-medium">{companyData.culture.employeeSatisfaction}%</span>
                          </div>
                        </div>
                      )}
                      {companyData.culture.workLifeBalance && (
                        <div>
                          <p className="text-sm text-gray-600">Work-Life Balance</p>
                          <div className="flex items-center gap-2">
                            <Progress value={companyData.culture.workLifeBalance} className="h-2 flex-1" />
                            <span className="text-sm font-medium">{companyData.culture.workLifeBalance}%</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cultural Values */}
                    <div>
                      <h4 className="font-medium mb-2">Cultural Values</h4>
                      <div className="flex flex-wrap gap-2">
                        {companyData.culture.culturalValues.map((value, idx) => (
                          <Badge key={idx} variant="secondary">
                            {value}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Work Style */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Management Style</p>
                        <Badge variant="outline" className="mt-1">
                          {companyData.culture.managementStyle}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Remote Policy</p>
                        <Badge variant="outline" className="mt-1">
                          {companyData.culture.remotePolicy}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Risks Tab */}
              <TabsContent value="risks" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Risk Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className={`p-3 rounded-lg ${getRiskColor(companyData.risks.overall)} bg-opacity-10`}>
                      <p className="font-semibold">
                        Overall Risk Level: {companyData.risks.overall.toUpperCase()}
                      </p>
                    </div>

                    {/* Risk Factors */}
                    <div>
                      <h4 className="font-medium mb-3">Risk Factors</h4>
                      <div className="space-y-2">
                        {companyData.risks.factors.map((risk, idx) => (
                          <div key={idx} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline">{risk.type}</Badge>
                              <span className={`text-sm font-medium ${getRiskColor(risk.severity)}`}>
                                {risk.severity} severity
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{risk.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mitigations */}
                    {companyData.risks.mitigations.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Risk Mitigations</h4>
                        <ul className="space-y-1">
                          {companyData.risks.mitigations.map((mitigation, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                              {mitigation}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Smart Questions Tab */}
              <TabsContent value="questions" className="space-y-4">
                {smartQuestions && (
                  <>
                    {/* Power Questions */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Lightbulb className="h-4 w-4" />
                          Strategic Interview Questions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {smartQuestions.powerQuestions.map((q, idx) => (
                          <div key={idx} className="p-3 border rounded-lg bg-blue-50">
                            <p className="font-medium text-sm mb-2">{q.question}</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-600">Purpose:</span>
                                <p className="text-blue-700">{q.purpose}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">When to ask:</span>
                                <p className="text-blue-700">{q.whenToAsk}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Questions by Category */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Questions by Category</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {Object.entries(smartQuestions.categories).map(([category, questions]) => (
                          <Collapsible
                            key={category}
                            open={expandedSection === category}
                            onOpenChange={(open) => setExpandedSection(open ? category : null)}
                          >
                            <CollapsibleTrigger asChild>
                              <Button variant="outline" className="w-full justify-between">
                                <span className="capitalize">{category}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">{questions.length} questions</Badge>
                                  <ChevronDown className="h-4 w-4" />
                                </div>
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2 space-y-2">
                              {questions.map((q, idx) => (
                                <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                                  <MessageSquare className="h-3 w-3 inline mr-2 text-gray-400" />
                                  {q}
                                </div>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Red Flag Questions */}
                    {smartQuestions.redFlags.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            Red Flag Investigation Questions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {smartQuestions.redFlags.map((q, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                                <span>{q}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>

            {/* Re-analyze Button */}
            <Button
              onClick={analyzeCompany}
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              <Activity className="h-4 w-4 mr-2" />
              Re-analyze Company
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}