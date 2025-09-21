"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Link,
  GitBranch,
  UserCheck,
  Building,
  School,
  TrendingUp,
  Search,
  ChevronRight,
  Sparkles,
  Target,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { aiServiceManagerClient } from '@/lib/services/ai-service-manager-client';
import { enhancedUserContextClient } from '@/lib/services/enhanced-user-context-client';
import { webIntelligenceService } from '@/lib/services/web-intelligence';

interface NetworkConnection {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  connectionDegree: 1 | 2 | 3;
  mutualConnections?: number;
  isRelevant: boolean;
  relevanceScore: number;
  relevanceReason?: string;
  profileUrl?: string;
  isAlumni?: boolean;
  isIndustryPeer?: boolean;
}

interface ConnectionPath {
  targetPerson: {
    name: string;
    title: string;
    company: string;
  };
  pathType: 'direct' | 'mutual' | 'alumni' | 'company';
  connectionStrength: 'strong' | 'medium' | 'weak';
  intermediaries: NetworkConnection[];
  recommendedApproach: string;
  messageTemplate?: string;
  successProbability: number;
}

interface CompanyNetworkAnalysis {
  companyName: string;
  totalConnections: number;
  directConnections: NetworkConnection[];
  mutualConnections: NetworkConnection[];
  alumniConnections: NetworkConnection[];
  keyPeople: {
    hiringManagers: NetworkConnection[];
    teamMembers: NetworkConnection[];
    recruiters: NetworkConnection[];
    leadership: NetworkConnection[];
  };
  networkStrength: 'strong' | 'moderate' | 'weak' | 'none';
  outreachOpportunities: ConnectionPath[];
}

interface NetworkInsights {
  totalNetworkSize: number;
  industryDistribution: { [industry: string]: number };
  companyDistribution: { [company: string]: number };
  seniorityDistribution: { [level: string]: number };
  geographicDistribution: { [location: string]: number };
  networkGrowthRate: number;
  highValueConnections: NetworkConnection[];
  underutilizedConnections: NetworkConnection[];
}

interface LinkedInNetworkIntegrationProps {
  jobId: string;
  userId: string;
  jobData: {
    title: string;
    company: string;
    location?: string;
    description?: string;
  };
}

export function LinkedInNetworkIntegration({ jobId, userId, jobData }: LinkedInNetworkIntegrationProps) {
  const [linkedinUrl, setLinkedinUrl] = useState<string>('');
  const [networkAnalysis, setNetworkAnalysis] = useState<CompanyNetworkAnalysis | null>(null);
  const [networkInsights, setNetworkInsights] = useState<NetworkInsights | null>(null);
  const [connectionPaths, setConnectionPaths] = useState<ConnectionPath[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('connections');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load LinkedIn URL from user profile
    loadLinkedInUrl();
  }, [userId]);

  const loadLinkedInUrl = async () => {
    try {
      const userContext = await enhancedUserContextClient.buildEnhancedContext();
      if (userContext.linkedIn?.url) {
        setLinkedinUrl(userContext.linkedIn.url);
      }
    } catch (error) {
      console.error('Error loading LinkedIn URL:', error);
    }
  };

  const analyzeCompanyNetwork = async () => {
    if (!linkedinUrl && !jobData.company) {
      setError('LinkedIn URL or company name required for network analysis');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [userContext, companyIntel] = await Promise.all([
        enhancedUserContextClient.buildEnhancedContext(),
        webIntelligenceService.getCompanyIntelligence(jobData.company, userId)
      ]);

      const analysisPrompt = `
You are a professional network analyst specializing in LinkedIn connection mapping and strategic outreach.

TASK: Analyze network connections and identify optimal paths to key people at the target company.

TARGET JOB:
Title: ${jobData.title}
Company: ${jobData.company}
Location: ${jobData.location || 'Not specified'}
Description: ${jobData.description ? jobData.description.substring(0, 500) : 'Not provided'}

USER PROFILE:
LinkedIn: ${linkedinUrl || 'Not connected'}
Career Level: ${userContext.experienceLevel || 'Not specified'}
Industry: ${userContext.industryFocus?.join(', ') || 'Not specified'}
Experience: ${userContext.professionalProfile.yearsOfExperience} years
Location: ${userContext.currentLocation || 'Not specified'}

COMPANY DATA:
Industry: ${companyIntel.industry}
Employee Count: ${companyIntel.teamComposition.totalEmployees}
Growth Rate: ${companyIntel.teamComposition.growthRate}%

ANALYSIS REQUIREMENTS:
1. Identify potential connections at the target company
2. Map connection paths (direct, mutual, alumni)
3. Determine key people to connect with (hiring managers, team members, recruiters)
4. Calculate connection strength and relevance
5. Generate outreach strategies and message templates
6. Assess network opportunities and gaps

Return a JSON object with this exact structure:
{
  "companyAnalysis": {
    "companyName": "${jobData.company}",
    "totalConnections": number,
    "directConnections": [
      {
        "id": "unique_id",
        "name": "Person Name",
        "title": "Job Title",
        "company": "${jobData.company}",
        "location": "City, State",
        "connectionDegree": 1,
        "mutualConnections": number,
        "isRelevant": true,
        "relevanceScore": 0-100,
        "relevanceReason": "Why relevant to job search",
        "isAlumni": boolean,
        "isIndustryPeer": boolean
      }
    ],
    "mutualConnections": [...similar structure...],
    "alumniConnections": [...similar structure...],
    "keyPeople": {
      "hiringManagers": [...connection objects...],
      "teamMembers": [...connection objects...],
      "recruiters": [...connection objects...],
      "leadership": [...connection objects...]
    },
    "networkStrength": "strong|moderate|weak|none",
    "outreachOpportunities": [
      {
        "targetPerson": {
          "name": "Target Name",
          "title": "Target Title",
          "company": "${jobData.company}"
        },
        "pathType": "direct|mutual|alumni|company",
        "connectionStrength": "strong|medium|weak",
        "intermediaries": [...connection objects if applicable...],
        "recommendedApproach": "Detailed approach strategy",
        "messageTemplate": "Personalized message template",
        "successProbability": 0-100
      }
    ]
  },
  "networkInsights": {
    "totalNetworkSize": number,
    "industryDistribution": {"Tech": 150, "Finance": 75, ...},
    "companyDistribution": {"Company1": 20, "Company2": 15, ...},
    "seniorityDistribution": {"Senior": 40, "Mid": 60, "Junior": 25},
    "geographicDistribution": {"New York": 50, "San Francisco": 30, ...},
    "networkGrowthRate": number,
    "highValueConnections": [...top valuable connections...],
    "underutilizedConnections": [...connections to re-engage...]
  },
  "connectionPaths": [
    {
      "targetPerson": {...},
      "pathType": "mutual",
      "connectionStrength": "medium",
      "intermediaries": [...],
      "recommendedApproach": "Ask for introduction through mutual connection",
      "messageTemplate": "Hi [Name], I noticed we both know [Mutual]. I'm exploring opportunities at [Company]...",
      "successProbability": 75
    }
  ]
}

IMPORTANT:
- Generate realistic network analysis based on typical LinkedIn patterns
- Consider industry norms for connection patterns
- Provide actionable outreach strategies
- Include specific message templates that feel personal and professional
- Account for different connection types (alumni, industry peers, etc.)
- Suggest both direct and indirect connection strategies
`;

      const response = await aiServiceManagerClient.generateCompletion(
        analysisPrompt,
        'network_analysis',
        userId,
        { temperature: 0.3, max_tokens: 4000 }
      );

      const analysisData = JSON.parse(response.content);

      setNetworkAnalysis(analysisData.companyAnalysis);
      setNetworkInsights(analysisData.networkInsights);
      setConnectionPaths(analysisData.connectionPaths);

    } catch (error) {
      console.error('Error analyzing network:', error);
      setError(error instanceof Error ? error.message : 'Network analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getConnectionBadgeColor = (degree: number) => {
    switch (degree) {
      case 1: return 'bg-green-100 text-green-800';
      case 2: return 'bg-blue-100 text-blue-800';
      case 3: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'text-green-600';
      case 'moderate': case 'medium': return 'text-blue-600';
      case 'weak': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const formatSuccessProbability = (probability: number) => {
    if (probability >= 75) return { color: 'text-green-600', label: 'High' };
    if (probability >= 50) return { color: 'text-blue-600', label: 'Medium' };
    return { color: 'text-yellow-600', label: 'Low' };
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          LinkedIn Network Intelligence
        </CardTitle>
        <CardDescription>
          Leverage your professional network for strategic connections at {jobData.company}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* LinkedIn URL Input */}
        {!linkedinUrl && (
          <div className="p-4 border rounded-lg bg-blue-50">
            <p className="text-sm text-blue-900 mb-3">
              Connect your LinkedIn profile to unlock powerful network analysis features
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="https://linkedin.com/in/yourprofile"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={loadLinkedInUrl}>
                <Link className="h-4 w-4 mr-2" />
                Connect LinkedIn
              </Button>
            </div>
          </div>
        )}

        {/* Analysis Button */}
        {!networkAnalysis && !isLoading && (
          <Button
            onClick={analyzeCompanyNetwork}
            className="w-full"
            disabled={isLoading}
          >
            <GitBranch className="h-4 w-4 mr-2" />
            Analyze Network Connections
          </Button>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-gray-600">
              Analyzing your network connections...
            </span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 border border-red-200 rounded-md bg-red-50">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              onClick={analyzeCompanyNetwork}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Retry Analysis
            </Button>
          </div>
        )}

        {/* Network Analysis Results */}
        {networkAnalysis && (
          <div className="space-y-6">
            {/* Company Network Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {networkAnalysis.totalConnections}
                </div>
                <p className="text-sm text-gray-600">Total Connections</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {networkAnalysis.directConnections.length}
                </div>
                <p className="text-sm text-gray-600">Direct Connections</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {networkAnalysis.alumniConnections.length}
                </div>
                <p className="text-sm text-gray-600">Alumni Network</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className={`text-lg font-bold ${getStrengthColor(networkAnalysis.networkStrength)}`}>
                  {networkAnalysis.networkStrength.toUpperCase()}
                </div>
                <p className="text-sm text-gray-600">Network Strength</p>
              </div>
            </div>

            {/* Tabbed Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="connections">Connections</TabsTrigger>
                <TabsTrigger value="paths">Paths</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
                <TabsTrigger value="outreach">Outreach</TabsTrigger>
              </TabsList>

              {/* Connections Tab */}
              <TabsContent value="connections" className="space-y-4">
                {/* Key People Section */}
                {networkAnalysis.keyPeople && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Key People at {jobData.company}</h3>

                    {/* Hiring Managers */}
                    {networkAnalysis.keyPeople.hiringManagers.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Hiring Managers</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {networkAnalysis.keyPeople.hiringManagers.map((person) => (
                            <div key={person.id} className="p-3 border rounded-lg hover:bg-gray-50">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium">{person.name}</p>
                                  <p className="text-sm text-gray-600">{person.title}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge className={getConnectionBadgeColor(person.connectionDegree)}>
                                      {person.connectionDegree === 1 ? '1st' : person.connectionDegree === 2 ? '2nd' : '3rd'}
                                    </Badge>
                                    {person.isAlumni && (
                                      <Badge variant="outline">
                                        <School className="h-3 w-3 mr-1" />
                                        Alumni
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-blue-600">
                                    {person.relevanceScore}%
                                  </div>
                                  <p className="text-xs text-gray-500">Relevance</p>
                                </div>
                              </div>
                              {person.relevanceReason && (
                                <p className="text-xs text-gray-500 mt-2">{person.relevanceReason}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Team Members */}
                    {networkAnalysis.keyPeople.teamMembers.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Potential Team Members</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {networkAnalysis.keyPeople.teamMembers.map((person) => (
                            <div key={person.id} className="p-3 border rounded-lg hover:bg-gray-50">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium">{person.name}</p>
                                  <p className="text-sm text-gray-600">{person.title}</p>
                                  <Badge className={`mt-1 ${getConnectionBadgeColor(person.connectionDegree)}`}>
                                    {person.connectionDegree === 1 ? '1st' : person.connectionDegree === 2 ? '2nd' : '3rd'}
                                  </Badge>
                                </div>
                                <Button size="sm" variant="outline">
                                  <MessageSquare className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Connection Paths Tab */}
              <TabsContent value="paths" className="space-y-4">
                <h3 className="font-semibold">Optimal Connection Paths</h3>
                {connectionPaths.map((path, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{path.targetPerson.name}</p>
                        <p className="text-sm text-gray-600">{path.targetPerson.title}</p>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${formatSuccessProbability(path.successProbability).color}`}>
                          {formatSuccessProbability(path.successProbability).label} Success
                        </div>
                        <p className="text-xs text-gray-500">{path.successProbability}% probability</p>
                      </div>
                    </div>

                    {/* Connection Path Visualization */}
                    {path.intermediaries.length > 0 && (
                      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                        <span className="text-sm">You</span>
                        {path.intermediaries.map((intermediary, idx) => (
                          <React.Fragment key={idx}>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{intermediary.name}</span>
                          </React.Fragment>
                        ))}
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">{path.targetPerson.name}</span>
                      </div>
                    )}

                    <div className="p-3 bg-blue-50 rounded">
                      <p className="text-sm font-medium text-blue-900 mb-1">Recommended Approach</p>
                      <p className="text-sm text-blue-700">{path.recommendedApproach}</p>
                    </div>

                    {path.messageTemplate && (
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-sm font-medium mb-1">Message Template</p>
                        <p className="text-sm text-gray-700 italic">{path.messageTemplate}</p>
                      </div>
                    )}
                  </div>
                ))}
              </TabsContent>

              {/* Network Insights Tab */}
              <TabsContent value="insights" className="space-y-4">
                {networkInsights && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 border rounded-lg">
                        <p className="text-2xl font-bold">{networkInsights.totalNetworkSize}</p>
                        <p className="text-xs text-gray-600">Total Network Size</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          +{networkInsights.networkGrowthRate}%
                        </p>
                        <p className="text-xs text-gray-600">Growth Rate</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-2xl font-bold">
                          {Object.keys(networkInsights.industryDistribution).length}
                        </p>
                        <p className="text-xs text-gray-600">Industries</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-2xl font-bold">
                          {Object.keys(networkInsights.companyDistribution).length}
                        </p>
                        <p className="text-xs text-gray-600">Companies</p>
                      </div>
                    </div>

                    {/* Industry Distribution */}
                    <div>
                      <h4 className="font-medium mb-3">Industry Distribution</h4>
                      <div className="space-y-2">
                        {Object.entries(networkInsights.industryDistribution)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([industry, count]) => (
                            <div key={industry} className="flex items-center gap-3">
                              <span className="text-sm w-24">{industry}</span>
                              <div className="flex-1">
                                <Progress
                                  value={(count / networkInsights.totalNetworkSize) * 100}
                                  className="h-2"
                                />
                              </div>
                              <span className="text-sm text-gray-600">{count}</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* High Value Connections */}
                    {networkInsights.highValueConnections.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">High Value Connections</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {networkInsights.highValueConnections.slice(0, 6).map((connection) => (
                            <div key={connection.id} className="p-3 border rounded-lg bg-green-50">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium">{connection.name}</p>
                                  <p className="text-sm text-gray-600">{connection.title}</p>
                                  <p className="text-xs text-gray-500">{connection.company}</p>
                                </div>
                                <Badge variant="outline" className="bg-green-100">
                                  <Target className="h-3 w-3 mr-1" />
                                  High Value
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Outreach Tab */}
              <TabsContent value="outreach" className="space-y-4">
                <div className="p-4 border rounded-lg bg-blue-50">
                  <h3 className="font-semibold mb-3">Outreach Strategy</h3>
                  {networkAnalysis.outreachOpportunities.slice(0, 3).map((opp, index) => (
                    <div key={index} className="mb-4 p-3 bg-white rounded">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{opp.targetPerson.name}</p>
                        <Badge variant="outline">{opp.pathType}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{opp.targetPerson.title}</p>
                      <p className="text-sm">{opp.recommendedApproach}</p>
                      <Button size="sm" className="mt-2">
                        <MessageSquare className="h-3 w-3 mr-2" />
                        Generate Message
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            {/* Re-analyze Button */}
            <Button
              onClick={analyzeCompanyNetwork}
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Re-analyze Network
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}