"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Target,
  Building2,
  DollarSign,
  Users,
  Shield,
  Zap,
  Globe,
  Award,
  Lightbulb,
  Activity
} from 'lucide-react';
import { aiServiceManagerClient } from '@/lib/services/ai-service-manager-client';
import { webIntelligenceService } from '@/lib/services/web-intelligence';

interface Competitor {
  name: string;
  marketPosition: number; // 1-10 ranking
  marketShare: number; // percentage
  employeeCount: number;
  fundingStage: 'seed' | 'series_a' | 'series_b' | 'series_c' | 'public' | 'private';
  lastFunding: {
    amount: number; // millions
    date: string;
    valuation?: number; // millions
  };
  strengths: string[];
  weaknesses: string[];
  threats: string[];
  opportunities: string[];
}

interface MarketAnalysis {
  marketSize: {
    total: number; // billions
    growthRate: number; // percentage
    projectedSize: number; // billions in 5 years
  };
  competitiveIntensity: 'low' | 'medium' | 'high' | 'very_high';
  barrierToEntry: 'low' | 'medium' | 'high';
  marketMaturity: 'emerging' | 'growth' | 'mature' | 'declining';
  keyTrends: string[];
  disruptors: string[];
}

interface RiskAssessment {
  businessRisks: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
  marketRisks: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
  competitiveRisks: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
  technicalRisks: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
  overallRisk: 'low' | 'medium' | 'high';
  riskMitigation: string[];
}

interface IndustryOutlook {
  growthProjection: 'declining' | 'stable' | 'moderate_growth' | 'high_growth' | 'explosive_growth';
  timeHorizon: '1_year' | '3_years' | '5_years';
  disruptionPotential: 'low' | 'medium' | 'high';
  emergingTechnologies: string[];
  regulatoryChanges: string[];
  opportunityAreas: string[];
  threatsToWatch: string[];
  investmentAttractiveness: number; // 1-10
}

interface CompetitiveAnalysisData {
  companyName: string;
  analysisDate: string;
  marketPosition: {
    rank: number;
    outOf: number;
    category: 'leader' | 'challenger' | 'follower' | 'niche';
    marketShare: number;
  };
  competitors: Competitor[];
  marketAnalysis: MarketAnalysis;
  riskAssessment: RiskAssessment;
  industryOutlook: IndustryOutlook;
  competitiveAdvantages: string[];
  strategicRecommendations: string[];
}

interface CompetitiveAnalysisProps {
  companyName: string;
  jobTitle: string;
  userId: string;
}

export function CompetitiveAnalysis({ companyName, jobTitle, userId }: CompetitiveAnalysisProps) {
  const [analysis, setAnalysis] = useState<CompetitiveAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const generateCompetitiveAnalysis = async () => {
    if (!companyName) {
      setError('Company name is required for competitive analysis');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const companyIntel = await webIntelligenceService.getCompanyIntelligence(companyName, userId);

      const analysisPrompt = `
You are an expert market analyst. Analyze the competitive landscape and market position for this company.

COMPANY INFORMATION:
Company: ${companyName}
Position: ${jobTitle}
Industry: ${companyIntel.industry}
Company Size: ${companyIntel.teamComposition.totalEmployees} employees
Founded: ${companyIntel.foundedYear || 'Unknown'}
Business Model: ${companyIntel.businessModel}
Financial Health: ${companyIntel.financialData.financialHealth}

Based on industry data, company size, and business model, generate a comprehensive competitive analysis.

Return a JSON object with this exact structure:
{
  "companyName": "${companyName}",
  "analysisDate": "${new Date().toISOString()}",
  "marketPosition": {
    "rank": 3,
    "outOf": 10,
    "category": "challenger",
    "marketShare": 12.5
  },
  "competitors": [
    {
      "name": "Competitor A",
      "marketPosition": 1,
      "marketShare": 25.0,
      "employeeCount": 5000,
      "fundingStage": "public",
      "lastFunding": {
        "amount": 500,
        "date": "2023-06-15",
        "valuation": 5000
      },
      "strengths": [
        "Market leader with strong brand",
        "Extensive distribution network",
        "Strong financial position"
      ],
      "weaknesses": [
        "Slower innovation cycles",
        "Higher pricing",
        "Legacy technology debt"
      ],
      "threats": [
        "Market disruption by agile startups",
        "Regulatory changes"
      ],
      "opportunities": [
        "International expansion",
        "New product categories"
      ]
    },
    {
      "name": "Competitor B",
      "marketPosition": 2,
      "marketShare": 18.0,
      "employeeCount": 2500,
      "fundingStage": "series_c",
      "lastFunding": {
        "amount": 150,
        "date": "2024-01-20",
        "valuation": 1500
      },
      "strengths": [
        "Innovative technology platform",
        "Strong customer satisfaction",
        "Agile development"
      ],
      "weaknesses": [
        "Limited market presence",
        "Scaling challenges",
        "Resource constraints"
      ],
      "threats": [
        "Larger competitors copying features",
        "Funding market volatility"
      ],
      "opportunities": [
        "Rapid market expansion",
        "Strategic partnerships"
      ]
    }
  ],
  "marketAnalysis": {
    "marketSize": {
      "total": 25.0,
      "growthRate": 15.0,
      "projectedSize": 48.0
    },
    "competitiveIntensity": "high",
    "barrierToEntry": "medium",
    "marketMaturity": "growth",
    "keyTrends": [
      "AI/ML integration across platforms",
      "Shift to subscription models",
      "Increased focus on user experience",
      "Mobile-first approaches"
    ],
    "disruptors": [
      "AI-powered automation",
      "New regulatory frameworks",
      "Changing consumer preferences"
    ]
  },
  "riskAssessment": {
    "businessRisks": {
      "level": "medium",
      "factors": [
        "Dependency on key customers",
        "Limited product diversification",
        "Scaling operational challenges"
      ]
    },
    "marketRisks": {
      "level": "medium",
      "factors": [
        "Market saturation in core segments",
        "Economic downturn impact",
        "Changing customer preferences"
      ]
    },
    "competitiveRisks": {
      "level": "high",
      "factors": [
        "Large competitors with more resources",
        "Price competition",
        "Technology commoditization"
      ]
    },
    "technicalRisks": {
      "level": "low",
      "factors": [
        "Technology stack modernization needs",
        "Cybersecurity threats",
        "Data privacy compliance"
      ]
    },
    "overallRisk": "medium",
    "riskMitigation": [
      "Diversify customer base",
      "Invest in R&D and innovation",
      "Build strategic partnerships",
      "Strengthen financial position"
    ]
  },
  "industryOutlook": {
    "growthProjection": "high_growth",
    "timeHorizon": "3_years",
    "disruptionPotential": "medium",
    "emergingTechnologies": [
      "Artificial Intelligence",
      "Machine Learning",
      "Blockchain",
      "IoT Integration"
    ],
    "regulatoryChanges": [
      "Data privacy regulations",
      "AI governance frameworks",
      "Industry-specific compliance"
    ],
    "opportunityAreas": [
      "Enterprise AI solutions",
      "International markets",
      "Vertical specialization",
      "Platform ecosystems"
    ],
    "threatsToWatch": [
      "Big tech platform competition",
      "Economic downturn",
      "Regulatory restrictions",
      "Talent acquisition challenges"
    ],
    "investmentAttractiveness": 7
  },
  "competitiveAdvantages": [
    "Innovative technology platform",
    "Strong engineering culture",
    "Agile development processes",
    "Customer-centric approach"
  ],
  "strategicRecommendations": [
    "Focus on product differentiation",
    "Invest in talent acquisition",
    "Build strategic partnerships",
    "Expand into adjacent markets",
    "Strengthen competitive moats"
  ]
}

REQUIREMENTS:
- Base analysis on industry norms and company characteristics
- Include realistic market data and competitor profiles
- Consider ${jobTitle} role in strategic context
- Provide actionable insights and recommendations
- Include both opportunities and threats
- Consider industry-specific competitive dynamics
- Factor in company stage and resources
`;

      const response = await aiServiceManagerClient.generateCompletion(
        analysisPrompt,
        'company_research',
        userId,
        { temperature: 0.3, max_tokens: 4000 }
      );

      const analysisData = JSON.parse(response.content);
      setAnalysis(analysisData);

    } catch (error) {
      console.error('Error generating competitive analysis:', error);
      setError(error instanceof Error ? error.message : 'Competitive analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (companyName && jobTitle) {
      generateCompetitiveAnalysis();
    }
  }, [companyName, jobTitle, userId]);

  const getPositionColor = (category: string) => {
    switch (category) {
      case 'leader': return 'text-green-600 bg-green-100';
      case 'challenger': return 'text-blue-600 bg-blue-100';
      case 'follower': return 'text-yellow-600 bg-yellow-100';
      case 'niche': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getGrowthIcon = (projection: string) => {
    switch (projection) {
      case 'explosive_growth': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'high_growth': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'moderate_growth': return <Activity className="h-4 w-4 text-blue-500" />;
      case 'stable': return <BarChart3 className="h-4 w-4 text-gray-500" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  const getFundingStageColor = (stage: string) => {
    switch (stage) {
      case 'public': return 'text-green-700 bg-green-100';
      case 'series_c': return 'text-blue-700 bg-blue-100';
      case 'series_b': return 'text-purple-700 bg-purple-100';
      case 'series_a': return 'text-yellow-700 bg-yellow-100';
      case 'seed': return 'text-orange-700 bg-orange-100';
      case 'private': return 'text-gray-700 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Competitive Landscape Analysis
        </CardTitle>
        <CardDescription>
          Market position, competitor intelligence, and strategic outlook analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-gray-600">
              Analyzing competitive landscape and market position...
            </span>
          </div>
        )}

        {error && (
          <div className="p-4 border border-red-200 rounded-md bg-red-50">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              onClick={generateCompetitiveAnalysis}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Retry Analysis
            </Button>
          </div>
        )}

        {analysis && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="competitors" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Competitors
              </TabsTrigger>
              <TabsTrigger value="risks" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Risk Analysis
              </TabsTrigger>
              <TabsTrigger value="outlook" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Market Outlook
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Market Position */}
              <Card>
                <CardHeader>
                  <CardTitle>Market Position</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">#{analysis.marketPosition.rank}</div>
                      <p className="text-sm text-gray-600">Market Rank</p>
                      <p className="text-xs text-gray-500">out of {analysis.marketPosition.outOf}</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{analysis.marketPosition.marketShare}%</div>
                      <p className="text-sm text-gray-600">Market Share</p>
                    </div>
                    <div className="text-center">
                      <Badge className={getPositionColor(analysis.marketPosition.category)}>
                        {analysis.marketPosition.category}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-1">Category</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">${analysis.marketAnalysis.marketSize.total}B</div>
                      <p className="text-sm text-gray-600">Market Size</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Market Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Market Dynamics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium">Growth Rate</p>
                      <p className="text-2xl font-bold text-green-600">+{analysis.marketAnalysis.marketSize.growthRate}%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Competitive Intensity</p>
                      <Badge className={getRiskColor(analysis.marketAnalysis.competitiveIntensity)}>
                        {analysis.marketAnalysis.competitiveIntensity}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Market Maturity</p>
                      <Badge variant="outline">{analysis.marketAnalysis.marketMaturity}</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Projected Market Size (5 years)</p>
                    <p className="text-lg font-semibold text-blue-600">${analysis.marketAnalysis.marketSize.projectedSize}B</p>
                  </div>
                </CardContent>
              </Card>

              {/* Competitive Advantages */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Competitive Advantages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.competitiveAdvantages.map((advantage, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        {advantage}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Strategic Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Strategic Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.strategicRecommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Target className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Competitors Tab */}
            <TabsContent value="competitors" className="space-y-6">
              <div className="space-y-4">
                {analysis.competitors.map((competitor, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                            #{competitor.marketPosition}
                          </div>
                          {competitor.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge className={getFundingStageColor(competitor.fundingStage)}>
                            {competitor.fundingStage.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm text-gray-500">{competitor.marketShare}% market share</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium">Employee Count</p>
                          <p className="text-lg font-semibold">{competitor.employeeCount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Last Funding</p>
                          <p className="text-lg font-semibold">${competitor.lastFunding.amount}M</p>
                          <p className="text-xs text-gray-500">{new Date(competitor.lastFunding.date).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Strengths
                          </h4>
                          <ul className="space-y-1">
                            {competitor.strengths.map((strength, idx) => (
                              <li key={idx} className="text-sm flex items-start gap-2">
                                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                {strength}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-medium text-yellow-700 mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Weaknesses
                          </h4>
                          <ul className="space-y-1">
                            {competitor.weaknesses.map((weakness, idx) => (
                              <li key={idx} className="text-sm flex items-start gap-2">
                                <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                                {weakness}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-blue-700 mb-2">Opportunities</h4>
                          <ul className="space-y-1">
                            {competitor.opportunities.map((opp, idx) => (
                              <li key={idx} className="text-sm flex items-start gap-2">
                                <Lightbulb className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                                {opp}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-medium text-red-700 mb-2">Threats</h4>
                          <ul className="space-y-1">
                            {competitor.threats.map((threat, idx) => (
                              <li key={idx} className="text-sm flex items-start gap-2">
                                <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                                {threat}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Risk Analysis Tab */}
            <TabsContent value="risks" className="space-y-6">
              {/* Overall Risk */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Badge className={`text-lg px-4 py-2 ${getRiskColor(analysis.riskAssessment.overallRisk)}`}>
                      {analysis.riskAssessment.overallRisk.toUpperCase()} RISK
                    </Badge>
                    <p className="text-sm text-gray-600 mt-2">Overall Risk Assessment</p>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Business Risks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge className={getRiskColor(analysis.riskAssessment.businessRisks.level)}>
                      {analysis.riskAssessment.businessRisks.level}
                    </Badge>
                    <ul className="mt-3 space-y-1">
                      {analysis.riskAssessment.businessRisks.factors.map((factor, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Market Risks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge className={getRiskColor(analysis.riskAssessment.marketRisks.level)}>
                      {analysis.riskAssessment.marketRisks.level}
                    </Badge>
                    <ul className="mt-3 space-y-1">
                      {analysis.riskAssessment.marketRisks.factors.map((factor, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Competitive Risks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge className={getRiskColor(analysis.riskAssessment.competitiveRisks.level)}>
                      {analysis.riskAssessment.competitiveRisks.level}
                    </Badge>
                    <ul className="mt-3 space-y-1">
                      {analysis.riskAssessment.competitiveRisks.factors.map((factor, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Technical Risks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge className={getRiskColor(analysis.riskAssessment.technicalRisks.level)}>
                      {analysis.riskAssessment.technicalRisks.level}
                    </Badge>
                    <ul className="mt-3 space-y-1">
                      {analysis.riskAssessment.technicalRisks.factors.map((factor, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Risk Mitigation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Risk Mitigation Strategies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.riskAssessment.riskMitigation.map((strategy, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Shield className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                        {strategy}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Market Outlook Tab */}
            <TabsContent value="outlook" className="space-y-6">
              {/* Growth Projection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getGrowthIcon(analysis.industryOutlook.growthProjection)}
                    Industry Growth Outlook
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <Badge variant="outline" className="text-lg px-4 py-2">
                        {analysis.industryOutlook.growthProjection.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-2">Growth Projection</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{analysis.industryOutlook.timeHorizon.replace('_', ' ')}</div>
                      <p className="text-sm text-gray-600">Time Horizon</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{analysis.industryOutlook.investmentAttractiveness}/10</div>
                      <p className="text-sm text-gray-600">Investment Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Emerging Technologies */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Emerging Technologies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {analysis.industryOutlook.emergingTechnologies.map((tech, index) => (
                      <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Opportunities and Threats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="h-5 w-5" />
                      Opportunity Areas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.industryOutlook.opportunityAreas.map((opportunity, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                          {opportunity}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="h-5 w-5" />
                      Threats to Watch
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.industryOutlook.threatsToWatch.map((threat, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                          {threat}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Regulatory Changes */}
              <Card>
                <CardHeader>
                  <CardTitle>Regulatory Landscape</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.industryOutlook.regulatoryChanges.map((change, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Globe className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                        {change}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {analysis && (
          <div className="flex justify-between text-sm text-gray-500">
            <span>Analysis generated: {new Date(analysis.analysisDate).toLocaleDateString()}</span>
            <Button
              onClick={generateCompetitiveAnalysis}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Refresh Analysis
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}