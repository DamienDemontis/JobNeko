/**
 * Enhanced LinkedIn Network Integration with Unified Caching
 * Provides instant loading of network analysis with smart cache management
 */

"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useUnifiedCache } from '@/hooks/use-unified-cache';
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
  ArrowRight,
  RefreshCw,
  Clock,
  AlertTriangle
} from 'lucide-react';

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
  pathSteps: Array<{
    name: string;
    title: string;
    company: string;
    connectionType: string;
  }>;
  pathStrength: number;
  approachStrategy: string;
}

interface NetworkAnalysisData {
  summary: {
    totalRelevantConnections: number;
    directConnections: number;
    secondDegreeConnections: number;
    thirdDegreeConnections: number;
    employeesInCompany: number;
    averageRelevanceScore: number;
  };
  priorityConnections: NetworkConnection[];
  connectionPaths: ConnectionPath[];
  strategies: {
    warmIntroductions: Array<{
      strategy: string;
      description: string;
      connections: string[];
      successProbability: number;
    }>;
    directOutreach: Array<{
      strategy: string;
      description: string;
      targetConnections: string[];
      messageTemplate: string;
    }>;
    contentEngagement: Array<{
      strategy: string;
      description: string;
      targetProfiles: string[];
      contentTypes: string[];
    }>;
  };
  insights: {
    networkStrength: number;
    bestApproachVector: string;
    timelineRecommendation: string;
    successPrediction: number;
    keyOpportunities: string[];
    potentialChallenges: string[];
  };
}

interface LinkedInNetworkIntegrationEnhancedProps {
  jobId: string;
  userId: string;
  token: string;
  jobData: {
    title: string;
    company: string;
    location?: string;
    description?: string;
  };
}

export function LinkedInNetworkIntegrationEnhanced({
  jobId,
  userId,
  token,
  jobData
}: LinkedInNetworkIntegrationEnhancedProps) {
  // Generate function for network analysis
  const generateNetworkAnalysis = async (): Promise<NetworkAnalysisData> => {
    const response = await fetch(`/api/ai-analysis/network_analysis/${jobId}`, {
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
      throw new Error('Failed to generate network analysis');
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
  } = useUnifiedCache<NetworkAnalysisData>({
    type: 'network_analysis',
    jobId,
    userId,
    token,
    autoLoad: true,
    generateFunction: generateNetworkAnalysis,
    additionalParams: {
      company: jobData.company,
      jobTitle: jobData.title
    }
  });

  // Render loading state
  if (isLoading && !data) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            LinkedIn Network Intelligence
            <Badge variant="outline" className="ml-auto">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Analyzing
            </Badge>
          </CardTitle>
          <CardDescription>
            Analyzing your LinkedIn network for connections to {jobData.company}...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={33} className="w-full" />
            <div className="text-sm text-muted-foreground">
              Scanning network connections, analyzing relationship paths...
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
            <Users className="h-5 w-5" />
            LinkedIn Network Intelligence
            <Badge variant="destructive" className="ml-auto">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Error
            </Badge>
          </CardTitle>
          <CardDescription>Unable to analyze network connections</CardDescription>
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
            <Users className="h-5 w-5" />
            LinkedIn Network Intelligence
          </CardTitle>
          <CardDescription>
            Discover and leverage your LinkedIn network for {jobData.company}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Analyze your LinkedIn network to find connections at {jobData.company},
              identify warm introduction paths, and get strategic networking recommendations.
            </p>
            <Button onClick={() => generate()} className="w-full">
              <Search className="h-4 w-4 mr-2" />
              Analyze Network Connections
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
          <Users className="h-5 w-5" />
          LinkedIn Network Intelligence
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
          Network analysis for {jobData.company}
          {lastUpdated && (
            <span className="text-xs ml-2">
              Last updated: {new Date(lastUpdated).toLocaleDateString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="connections">Connections</TabsTrigger>
            <TabsTrigger value="paths">Connection Paths</TabsTrigger>
            <TabsTrigger value="strategies">Strategies</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Network Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{data.summary.totalRelevantConnections}</div>
                <div className="text-sm text-muted-foreground">Relevant Connections</div>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{data.summary.employeesInCompany}</div>
                <div className="text-sm text-muted-foreground">Company Employees</div>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{data.summary.directConnections}</div>
                <div className="text-sm text-muted-foreground">Direct Connections</div>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{Math.round(data.summary.averageRelevanceScore * 100)}%</div>
                <div className="text-sm text-muted-foreground">Avg Relevance</div>
              </div>
            </div>

            {/* Network Strength */}
            <div className="space-y-4">
              <h3 className="font-semibold">Network Strength Analysis</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Network Strength</span>
                  <span>{data.insights.networkStrength}/10</span>
                </div>
                <Progress value={data.insights.networkStrength * 10} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Success Prediction</span>
                  <span>{data.insights.successPrediction}%</span>
                </div>
                <Progress value={data.insights.successPrediction} className="h-2" />
              </div>
            </div>

            {/* Key Insights */}
            <div className="space-y-4">
              <h3 className="font-semibold">Key Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-green-600 mb-2">Opportunities</h4>
                  <ul className="space-y-1">
                    {data.insights.keyOpportunities.map((opportunity, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <Target className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                        <span>{opportunity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-yellow-600 mb-2">Challenges</h4>
                  <ul className="space-y-1">
                    {data.insights.potentialChallenges.map((challenge, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 text-yellow-500 mt-1 flex-shrink-0" />
                        <span>{challenge}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Best Approach */}
            <div className="p-4 bg-primary/5 rounded-lg">
              <h3 className="font-semibold mb-2">Recommended Approach</h3>
              <p className="text-sm mb-2">{data.insights.bestApproachVector}</p>
              <p className="text-sm text-muted-foreground">
                <Clock className="h-3 w-3 inline mr-1" />
                Timeline: {data.insights.timelineRecommendation}
              </p>
            </div>
          </TabsContent>

          {/* Priority Connections Tab */}
          <TabsContent value="connections" className="space-y-4">
            <div className="space-y-4">
              {data.priorityConnections.map((connection, index) => (
                <div key={connection.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{connection.name}</h4>
                        <Badge variant="outline">
                          {connection.connectionDegree === 1 ? '1st' :
                           connection.connectionDegree === 2 ? '2nd' : '3rd'} degree
                        </Badge>
                        {connection.isAlumni && (
                          <Badge variant="secondary">
                            <School className="h-3 w-3 mr-1" />
                            Alumni
                          </Badge>
                        )}
                        {connection.isIndustryPeer && (
                          <Badge variant="secondary">
                            <Building className="h-3 w-3 mr-1" />
                            Industry Peer
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{connection.title}</p>
                      <p className="text-sm text-muted-foreground">{connection.company} • {connection.location}</p>
                      {connection.relevanceReason && (
                        <p className="text-sm mt-2 text-green-600">{connection.relevanceReason}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {Math.round(connection.relevanceScore * 100)}% match
                      </div>
                      {connection.mutualConnections && (
                        <div className="text-xs text-muted-foreground">
                          {connection.mutualConnections} mutual connections
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Connection Paths Tab */}
          <TabsContent value="paths" className="space-y-4">
            <div className="space-y-4">
              {data.connectionPaths.map((path, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-medium">Path to {path.targetPerson.name}</h4>
                    <Badge variant={path.pathStrength > 7 ? 'default' : path.pathStrength > 4 ? 'secondary' : 'outline'}>
                      Strength: {path.pathStrength}/10
                    </Badge>
                  </div>

                  <div className="text-sm text-muted-foreground mb-3">
                    {path.targetPerson.title} at {path.targetPerson.company}
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <UserCheck className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">You</span>
                    {path.pathSteps.map((step, stepIndex) => (
                      <React.Fragment key={stepIndex}>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <div className="text-sm">
                          <span className="font-medium">{step.name}</span>
                          <div className="text-xs text-muted-foreground">
                            {step.title} at {step.company}
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <div className="text-sm font-medium text-green-600">Target</div>
                  </div>

                  <div className="p-3 bg-secondary/50 rounded">
                    <h5 className="text-sm font-medium mb-1">Approach Strategy:</h5>
                    <p className="text-sm">{path.approachStrategy}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Strategies Tab */}
          <TabsContent value="strategies" className="space-y-6">
            {/* Warm Introductions */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Warm Introduction Strategies
              </h3>
              <div className="space-y-3">
                {data.strategies.warmIntroductions.map((strategy, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{strategy.strategy}</h4>
                      <Badge variant="secondary">{strategy.successProbability}% success rate</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{strategy.description}</p>
                    <div className="text-sm">
                      <span className="font-medium">Through: </span>
                      {strategy.connections.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Direct Outreach */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Direct Outreach Strategies
              </h3>
              <div className="space-y-3">
                {data.strategies.directOutreach.map((strategy, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">{strategy.strategy}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{strategy.description}</p>
                    <div className="text-sm mb-3">
                      <span className="font-medium">Target: </span>
                      {strategy.targetConnections.join(', ')}
                    </div>
                    <div className="p-3 bg-secondary/50 rounded">
                      <h5 className="text-sm font-medium mb-1">Message Template:</h5>
                      <p className="text-sm font-mono">{strategy.messageTemplate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Engagement */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Content Engagement Strategies
              </h3>
              <div className="space-y-3">
                {data.strategies.contentEngagement.map((strategy, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">{strategy.strategy}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{strategy.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Target Profiles: </span>
                        {strategy.targetProfiles.join(', ')}
                      </div>
                      <div>
                        <span className="font-medium">Content Types: </span>
                        {strategy.contentTypes.join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}