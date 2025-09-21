"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  GraduationCap,
  Coffee,
  MessageCircle,
  Star,
  Target,
  UserCheck,
  Clock,
  TrendingUp,
  Building,
  Mail,
  Linkedin,
  Calendar,
  Award,
  Network,
  Route
} from 'lucide-react';
import { aiServiceManagerClient } from '@/lib/services/ai-service-manager-client';
import { enhancedUserContextClient } from '@/lib/services/enhanced-user-context-client';
import { webIntelligenceService } from '@/lib/services/web-intelligence';

interface InsiderConnection {
  id: string;
  name: string;
  title: string;
  department: string;
  tenure: string; // e.g., "2 years"
  connectionType: 'current_employee' | 'alumni' | 'mutual_connection' | 'industry_contact';
  relevanceScore: number; // 1-10
  approachability: 'high' | 'medium' | 'low';
  commonGround: string[];
  linkedinUrl?: string;
  email?: string;
  lastActive?: string;
  responseRate?: number; // percentage
}

interface OutreachStrategy {
  connectionId: string;
  approach: 'coffee_chat' | 'informational_interview' | 'direct_referral' | 'industry_insights';
  priority: 'high' | 'medium' | 'low';
  timing: {
    bestDays: string[];
    bestTimes: string[];
    followUpSchedule: string[];
  };
  messageTemplate: {
    subject: string;
    opening: string;
    body: string;
    closing: string;
    callToAction: string;
  };
  expectedOutcome: string;
  successProbability: number; // 1-10
}

interface AlumniConnection {
  id: string;
  name: string;
  currentTitle: string;
  currentCompany: string;
  sharedBackground: {
    institution?: string;
    program?: string;
    graduationYear?: string;
    commonActivities?: string[];
  };
  careerProgression: string[];
  industryExpertise: string[];
  helpfulnessScore: number; // 1-10
  lastContact?: string;
}

interface InsiderIntelligenceData {
  companyName: string;
  analysisDate: string;
  currentEmployees: InsiderConnection[];
  alumniConnections: AlumniConnection[];
  outreachStrategies: OutreachStrategy[];
  networkAnalysis: {
    totalConnections: number;
    directConnections: number;
    secondDegreeConnections: number;
    optimalPaths: string[];
    networkStrength: number; // 1-10
  };
  recommendations: {
    topPriority: string[];
    quickWins: string[];
    longTermStrategy: string[];
  };
}

interface InsiderIntelligenceProps {
  companyName: string;
  jobTitle: string;
  userId: string;
}

export function InsiderIntelligence({ companyName, jobTitle, userId }: InsiderIntelligenceProps) {
  const [intelligence, setIntelligence] = useState<InsiderIntelligenceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("employees");
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState<string>("");

  const generateInsiderIntelligence = async () => {
    if (!companyName) {
      setError('Company name is required for insider intelligence');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [userContext, companyIntel] = await Promise.all([
        enhancedUserContextClient.buildEnhancedContext(),
        webIntelligenceService.getCompanyIntelligence(companyName, userId)
      ]);

      const intelligencePrompt = `
You are an expert networking strategist and insider intelligence analyst. Generate comprehensive insider intelligence for strategic networking.

COMPANY INFORMATION:
Company: ${companyName}
Position: ${jobTitle}
Industry: ${companyIntel.industry}
Company Size: ${companyIntel.teamComposition.totalEmployees} employees
Founded: ${companyIntel.foundedYear || 'Unknown'}
Business Model: ${companyIntel.businessModel}

USER BACKGROUND:
Key Skills: ${userContext.professionalProfile.skills?.join(', ') || 'Not specified'}
Industry Focus: ${userContext.industryFocus?.join(', ') || 'Not specified'}
Experience Level: ${userContext.experienceLevel || 'Not specified'}
Current Role: ${userContext.profile.currentRole || 'Not specified'}

Generate realistic insider intelligence based on typical networking patterns for companies of this size and industry.

Return a JSON object with this exact structure:
{
  "companyName": "${companyName}",
  "analysisDate": "${new Date().toISOString()}",
  "currentEmployees": [
    {
      "id": "emp1",
      "name": "Sarah Chen",
      "title": "Senior Software Engineer",
      "department": "Engineering",
      "tenure": "3 years",
      "connectionType": "current_employee",
      "relevanceScore": 8,
      "approachability": "high",
      "commonGround": [
        "Same university background",
        "Similar technical stack experience",
        "Active in tech community"
      ],
      "linkedinUrl": "linkedin.com/in/sarah-chen-engineer",
      "lastActive": "2 days ago",
      "responseRate": 75
    },
    {
      "id": "emp2",
      "name": "Michael Rodriguez",
      "title": "Engineering Manager",
      "department": "Engineering",
      "tenure": "5 years",
      "connectionType": "current_employee",
      "relevanceScore": 9,
      "approachability": "medium",
      "commonGround": [
        "Leadership experience",
        "Scale-up company background",
        "Similar career trajectory"
      ],
      "linkedinUrl": "linkedin.com/in/mrodriguez-mgr",
      "lastActive": "1 week ago",
      "responseRate": 60
    }
  ],
  "alumniConnections": [
    {
      "id": "alum1",
      "name": "Alex Kim",
      "currentTitle": "Principal Engineer",
      "currentCompany": "${companyName}",
      "sharedBackground": {
        "institution": "University of Technology",
        "program": "Computer Science",
        "graduationYear": "2018",
        "commonActivities": ["Tech Club", "Hackathons"]
      },
      "careerProgression": [
        "Software Engineer at Startup A",
        "Senior Engineer at Tech Corp",
        "Principal Engineer at ${companyName}"
      ],
      "industryExpertise": [
        "Distributed Systems",
        "Cloud Architecture",
        "Team Leadership"
      ],
      "helpfulnessScore": 9,
      "lastContact": "6 months ago"
    }
  ],
  "outreachStrategies": [
    {
      "connectionId": "emp1",
      "approach": "coffee_chat",
      "priority": "high",
      "timing": {
        "bestDays": ["Tuesday", "Wednesday", "Thursday"],
        "bestTimes": ["10am-11am", "2pm-3pm"],
        "followUpSchedule": ["1 week", "2 weeks", "1 month"]
      },
      "messageTemplate": {
        "subject": "Fellow [University] alum interested in ${companyName}",
        "opening": "Hi Sarah, I hope this message finds you well!",
        "body": "I'm a fellow [University] graduate currently exploring opportunities in [industry]. I noticed your impressive work at ${companyName} and would love to learn more about your experience there. Would you be open to a brief coffee chat to share insights about the company culture and the ${jobTitle} role?",
        "closing": "I understand you're busy, so I'd be happy to work around your schedule.",
        "callToAction": "Would you have 20-30 minutes for a coffee chat in the next couple of weeks?"
      },
      "expectedOutcome": "Company insights and potential internal referral",
      "successProbability": 7
    }
  ],
  "networkAnalysis": {
    "totalConnections": 12,
    "directConnections": 3,
    "secondDegreeConnections": 9,
    "optimalPaths": [
      "Alumni connection → Current employee referral",
      "Mutual connection → Warm introduction",
      "Industry contact → Informational interview"
    ],
    "networkStrength": 6
  },
  "recommendations": {
    "topPriority": [
      "Connect with Sarah Chen for technical insights",
      "Reach out to Alex Kim for alumni connection",
      "Schedule informational interview with Michael Rodriguez"
    ],
    "quickWins": [
      "Send LinkedIn connection requests with personalized messages",
      "Engage with company posts and employee content",
      "Attend virtual company events or webinars"
    ],
    "longTermStrategy": [
      "Build relationships before applying",
      "Establish ongoing industry connections",
      "Create value-first networking approach"
    ]
  }
}

REQUIREMENTS:
- Generate 4-6 current employee connections with varying relevance scores
- Include 2-3 alumni connections with realistic shared backgrounds
- Create detailed outreach strategies for top connections
- Base connection types and approachability on company culture
- Include realistic response rates and timing recommendations
- Consider user's background for commonality identification
- Provide actionable networking strategies
- Factor in company size for connection accessibility
- Include both technical and non-technical connections for ${jobTitle}
- Generate specific, personalized outreach templates
`;

      const response = await aiServiceManagerClient.generateCompletion(
        intelligencePrompt,
        'networking_analysis',
        userId,
        { temperature: 0.3, max_tokens: 4000 }
      );

      const intelligenceData = JSON.parse(response.content);
      setIntelligence(intelligenceData);

    } catch (error) {
      console.error('Error generating insider intelligence:', error);
      setError(error instanceof Error ? error.message : 'Insider intelligence generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getApproachabilityColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getConnectionTypeIcon = (type: string) => {
    switch (type) {
      case 'current_employee': return <Building className="h-4 w-4" />;
      case 'alumni': return <GraduationCap className="h-4 w-4" />;
      case 'mutual_connection': return <Users className="h-4 w-4" />;
      case 'industry_contact': return <Network className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    if (companyName && jobTitle) {
      generateInsiderIntelligence();
    }
  }, [companyName, jobTitle, userId]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Company Insider Intelligence
        </CardTitle>
        <CardDescription>
          Strategic networking analysis with current employees, alumni connections, and outreach strategies
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-gray-600">
              Analyzing network connections and insider intelligence...
            </span>
          </div>
        )}

        {error && (
          <div className="p-4 border border-red-200 rounded-md bg-red-50">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              onClick={generateInsiderIntelligence}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Retry Analysis
            </Button>
          </div>
        )}

        {intelligence && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="employees" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Employees
              </TabsTrigger>
              <TabsTrigger value="alumni" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Alumni
              </TabsTrigger>
              <TabsTrigger value="outreach" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Outreach
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Analysis
              </TabsTrigger>
            </TabsList>

            {/* Current Employees Tab */}
            <TabsContent value="employees" className="space-y-4">
              <div className="space-y-4">
                {intelligence.currentEmployees.map((employee) => (
                  <Card key={employee.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                {getConnectionTypeIcon(employee.connectionType)}
                                <h4 className="font-semibold text-lg">{employee.name}</h4>
                              </div>
                              <Badge className={getRelevanceColor(employee.relevanceScore)}>
                                {employee.relevanceScore}/10 relevance
                              </Badge>
                              <Badge className={getApproachabilityColor(employee.approachability)}>
                                {employee.approachability} approachability
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">{employee.title}</p>
                            <p className="text-sm text-gray-500 mb-3">{employee.department} • {employee.tenure}</p>

                            <div className="mb-3">
                              <h5 className="font-medium text-sm mb-2">Common Ground:</h5>
                              <div className="flex flex-wrap gap-1">
                                {employee.commonGround.map((ground, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {ground}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              {employee.lastActive && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Last active: {employee.lastActive}
                                </div>
                              )}
                              {employee.responseRate && (
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  {employee.responseRate}% response rate
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {employee.linkedinUrl && (
                              <Button variant="outline" size="sm">
                                <Linkedin className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Alumni Connections Tab */}
            <TabsContent value="alumni" className="space-y-4">
              <div className="space-y-4">
                {intelligence.alumniConnections.map((alumni) => (
                  <Card key={alumni.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <GraduationCap className="h-5 w-5 text-blue-600" />
                              <h4 className="font-semibold text-lg">{alumni.name}</h4>
                              <Badge className="text-purple-600 bg-purple-100">
                                {alumni.helpfulnessScore}/10 helpfulness
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">{alumni.currentTitle}</p>
                            <p className="text-sm text-gray-500 mb-3">{alumni.currentCompany}</p>

                            {alumni.sharedBackground && (
                              <div className="mb-3">
                                <h5 className="font-medium text-sm mb-2">Shared Background:</h5>
                                <div className="text-sm space-y-1">
                                  {alumni.sharedBackground.institution && (
                                    <p><span className="font-medium">Institution:</span> {alumni.sharedBackground.institution}</p>
                                  )}
                                  {alumni.sharedBackground.program && (
                                    <p><span className="font-medium">Program:</span> {alumni.sharedBackground.program}</p>
                                  )}
                                  {alumni.sharedBackground.graduationYear && (
                                    <p><span className="font-medium">Graduation:</span> {alumni.sharedBackground.graduationYear}</p>
                                  )}
                                  {alumni.sharedBackground.commonActivities && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {alumni.sharedBackground.commonActivities.map((activity, index) => (
                                        <Badge key={index} variant="outline" className="text-xs">
                                          {activity}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="mb-3">
                              <h5 className="font-medium text-sm mb-2">Career Progression:</h5>
                              <div className="space-y-1">
                                {alumni.careerProgression.map((role, index) => (
                                  <div key={index} className="flex items-center gap-2 text-sm">
                                    <Route className="h-3 w-3 text-gray-400" />
                                    {role}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="mb-3">
                              <h5 className="font-medium text-sm mb-2">Industry Expertise:</h5>
                              <div className="flex flex-wrap gap-1">
                                {alumni.industryExpertise.map((expertise, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {expertise}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            {alumni.lastContact && (
                              <div className="text-sm text-gray-500">
                                <Clock className="h-3 w-3 inline mr-1" />
                                Last contact: {alumni.lastContact}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Linkedin className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Outreach Strategies Tab */}
            <TabsContent value="outreach" className="space-y-4">
              <div className="space-y-4">
                {intelligence.outreachStrategies.map((strategy) => {
                  const connection = intelligence.currentEmployees.find(emp => emp.id === strategy.connectionId) ||
                                  intelligence.alumniConnections.find(alum => alum.id === strategy.connectionId);

                  return (
                    <Card key={strategy.connectionId} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <Coffee className="h-5 w-5" />
                            Outreach Strategy: {connection?.name}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge className={getPriorityColor(strategy.priority)}>
                              {strategy.priority} priority
                            </Badge>
                            <Badge variant="outline">
                              {strategy.successProbability}/10 success rate
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h5 className="font-medium mb-2">Approach: {strategy.approach.replace('_', ' ')}</h5>
                          <p className="text-sm text-gray-600">{strategy.expectedOutcome}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-medium mb-2">Optimal Timing:</h5>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium">Best Days:</span> {strategy.timing.bestDays.join(', ')}
                              </div>
                              <div>
                                <span className="font-medium">Best Times:</span> {strategy.timing.bestTimes.join(', ')}
                              </div>
                              <div>
                                <span className="font-medium">Follow-up:</span> {strategy.timing.followUpSchedule.join(', ')}
                              </div>
                            </div>
                          </div>

                          <div>
                            <h5 className="font-medium mb-2">Message Template:</h5>
                            <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-2">
                              <div><span className="font-medium">Subject:</span> {strategy.messageTemplate.subject}</div>
                              <div><span className="font-medium">Opening:</span> {strategy.messageTemplate.opening}</div>
                              <div className="text-xs text-gray-600">
                                {strategy.messageTemplate.body.substring(0, 100)}...
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <h5 className="font-medium mb-2">Full Message Template:</h5>
                          <div className="p-4 bg-blue-50 rounded-lg text-sm space-y-2">
                            <div><strong>Subject:</strong> {strategy.messageTemplate.subject}</div>
                            <div className="pt-2">
                              <div>{strategy.messageTemplate.opening}</div>
                              <div className="mt-2">{strategy.messageTemplate.body}</div>
                              <div className="mt-2">{strategy.messageTemplate.closing}</div>
                              <div className="mt-2"><strong>{strategy.messageTemplate.callToAction}</strong></div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Send Message
                          </Button>
                          <Button variant="outline" size="sm">
                            <Calendar className="h-4 w-4 mr-2" />
                            Schedule Follow-up
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Network Analysis Tab */}
            <TabsContent value="analysis" className="space-y-6">
              {/* Network Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Network Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{intelligence.networkAnalysis.totalConnections}</div>
                      <p className="text-sm text-gray-600">Total Connections</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{intelligence.networkAnalysis.directConnections}</div>
                      <p className="text-sm text-gray-600">Direct</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{intelligence.networkAnalysis.secondDegreeConnections}</div>
                      <p className="text-sm text-gray-600">2nd Degree</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{intelligence.networkAnalysis.networkStrength}/10</div>
                      <p className="text-sm text-gray-600">Network Strength</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Optimal Paths */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Route className="h-5 w-5" />
                    Optimal Connection Paths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {intelligence.networkAnalysis.optimalPaths.map((path, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Route className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                        {path}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700">
                      <Target className="h-5 w-5" />
                      Top Priority
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {intelligence.recommendations.topPriority.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Target className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <Star className="h-5 w-5" />
                      Quick Wins
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {intelligence.recommendations.quickWins.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Star className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <TrendingUp className="h-5 w-5" />
                      Long-term Strategy
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {intelligence.recommendations.longTermStrategy.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <TrendingUp className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {intelligence && (
          <div className="flex justify-between text-sm text-gray-500">
            <span>Analysis generated: {new Date(intelligence.analysisDate).toLocaleDateString()}</span>
            <Button
              onClick={generateInsiderIntelligence}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Refresh Intelligence
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}