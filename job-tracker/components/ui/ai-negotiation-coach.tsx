'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  SparklesIcon,
  DocumentTextIcon,
  UserCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LightBulbIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  TrophyIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface NegotiationCoachProps {
  jobId: string;
  jobTitle: string;
  company: string;
  currentOffer?: {
    baseSalary: number;
    bonus?: number;
    equity?: string;
    benefits?: string[];
  };
  location: string;
  workMode: string;
  userId: string;
  token: string;
  userHasResume?: boolean;
  userHasAdditionalInfo?: boolean;
  onStrategyGenerated?: (strategy: any) => void;
}

interface CompetingOffer {
  company: string;
  salary: number;
  totalComp?: number;
}

export default function AINegotiationCoach({
  jobId,
  jobTitle,
  company,
  currentOffer,
  location,
  workMode,
  userId,
  token,
  userHasResume,
  userHasAdditionalInfo,
  onStrategyGenerated
}: NegotiationCoachProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [strategy, setStrategy] = useState<any>(null);
  const [targetSalary, setTargetSalary] = useState(currentOffer?.baseSalary || 0);
  const [hasCompetingOffers, setHasCompetingOffers] = useState(false);
  const [competingOffers, setCompetingOffers] = useState<CompetingOffer[]>([]);
  const [priorities, setPriorities] = useState<string[]>(['salary']);
  const [activeTab, setActiveTab] = useState('overview');

  const generateStrategy = async () => {
    setIsGenerating(true);

    try {
      const request = {
        userId,
        jobId,
        jobTitle,
        company,
        currentOffer,
        targetSalary: targetSalary > 0 ? targetSalary : undefined,
        location,
        workMode,
        hasCompetingOffers,
        competingOffers: hasCompetingOffers ? competingOffers : undefined,
        negotiationPriorities: priorities
      };

      const response = await fetch('/api/salary/negotiation-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to generate strategy');
      }

      const { data } = await response.json();
      setStrategy(data);
      onStrategyGenerated?.(data);
      toast.success('Negotiation strategy generated!');
    } catch (error) {
      console.error('Failed to generate strategy:', error);
      toast.error('Failed to generate negotiation strategy');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getLeverageColor = (score: string) => {
    switch (score) {
      case 'very_high': return 'text-green-600 bg-green-50';
      case 'high': return 'text-blue-600 bg-blue-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Profile Completeness Alert - only show if missing resume AND missing additional info */}
      {!userHasResume && !userHasAdditionalInfo && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium text-yellow-900">Complete Your Profile for Better Negotiation Strategy</p>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li className="flex items-center gap-2">
                  <DocumentTextIcon className="w-4 h-4" />
                  Upload your resume for personalized negotiation tactics
                </li>
                <li className="flex items-center gap-2">
                  <UserCircleIcon className="w-4 h-4" />
                  Add additional context in your profile (achievements, certifications, etc.)
                </li>
              </ul>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => window.location.href = '/profile'}
              >
                Complete Your Profile
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Partial profile alert - show if has resume but missing additional info */}
      {userHasResume && !userHasAdditionalInfo && (
        <Alert className="border-blue-200 bg-blue-50">
          <InformationCircleIcon className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium text-blue-900">Enhance Your Negotiation Strategy</p>
              <p className="text-sm text-blue-800">
                Add additional context in your profile (achievements, certifications, recent projects)
                for more personalized negotiation tactics.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => window.location.href = '/profile'}
              >
                Update Profile
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5" />
            AI Negotiation Coach
            <Badge variant="outline" className="ml-auto">
              Powered by Your Profile
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Target Salary */}
          <div>
            <Label>Target Salary (Optional)</Label>
            <Input
              type="number"
              value={targetSalary}
              onChange={(e) => setTargetSalary(Number(e.target.value))}
              placeholder="What salary do you want?"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave blank for AI recommendation based on market data
            </p>
          </div>

          {/* Competing Offers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Do you have competing offers?</Label>
              <Switch
                checked={hasCompetingOffers}
                onCheckedChange={setHasCompetingOffers}
              />
            </div>

            {hasCompetingOffers && (
              <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                {competingOffers.map((offer, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Company"
                      value={offer.company}
                      onChange={(e) => {
                        const updated = [...competingOffers];
                        updated[index].company = e.target.value;
                        setCompetingOffers(updated);
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Salary"
                      value={offer.salary}
                      onChange={(e) => {
                        const updated = [...competingOffers];
                        updated[index].salary = Number(e.target.value);
                        setCompetingOffers(updated);
                      }}
                    />
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCompetingOffers([...competingOffers, { company: '', salary: 0 }])}
                >
                  Add Offer
                </Button>
              </div>
            )}
          </div>

          {/* Negotiation Priorities */}
          <div>
            <Label>Negotiation Priorities</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {['salary', 'equity', 'flexibility', 'title', 'signing_bonus'].map((priority) => (
                <Badge
                  key={priority}
                  variant={priorities.includes(priority) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    if (priorities.includes(priority)) {
                      setPriorities(priorities.filter(p => p !== priority));
                    } else {
                      setPriorities([...priorities, priority]);
                    }
                  }}
                >
                  {priority.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>

          <Button
            onClick={generateStrategy}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? 'Generating Strategy...' : 'Generate Negotiation Strategy'}
          </Button>
        </CardContent>
      </Card>

      {/* Strategy Results */}
      {strategy && (
        <>
          {/* Readiness Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrophyIcon className="w-5 h-5" />
                Negotiation Readiness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold">{strategy.readiness.score}%</div>
                    <div className="text-sm text-gray-500">Readiness Score</div>
                  </div>
                  <div className={cn('px-4 py-2 rounded-lg', getLeverageColor(strategy.leverage.score))}>
                    <div className="font-medium capitalize">{strategy.leverage.score.replace('_', ' ')}</div>
                    <div className="text-sm">Leverage</div>
                  </div>
                </div>

                {strategy.readiness.missingElements && strategy.readiness.missingElements.length > 0 && (
                  <Alert>
                    <InformationCircleIcon className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-medium mb-1">Improve your position by adding:</p>
                      <ul className="text-sm space-y-1">
                        {strategy.readiness.missingElements.map((element: string, index: number) => (
                          <li key={index}>• {element}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900">{strategy.readiness.recommendation}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Strategy Tabs */}
          <Card>
            <CardHeader>
              <CardTitle>Your Negotiation Strategy</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="scripts">Scripts</TabsTrigger>
                  <TabsTrigger value="tactics">Tactics</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  {/* Salary Recommendations */}
                  <div>
                    <h4 className="font-medium mb-3">Salary Recommendations</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <ArrowDownIcon className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium">Conservative</span>
                        </div>
                        <div className="text-xl font-bold">
                          {formatCurrency(strategy.salaryRecommendations.conservative.amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {strategy.salaryRecommendations.conservative.successRate}% success rate
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          {strategy.salaryRecommendations.conservative.rationale}
                        </p>
                      </div>

                      <div className="p-3 border-2 border-green-500 rounded-lg bg-green-50">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium">Target</span>
                        </div>
                        <div className="text-xl font-bold text-green-900">
                          {formatCurrency(strategy.salaryRecommendations.target.amount)}
                        </div>
                        <div className="text-sm text-green-600">
                          {strategy.salaryRecommendations.target.successRate}% success rate
                        </div>
                        <p className="text-xs text-green-700 mt-2">
                          {strategy.salaryRecommendations.target.rationale}
                        </p>
                      </div>

                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <ArrowUpIcon className="w-4 h-4 text-orange-500" />
                          <span className="text-sm font-medium">Aggressive</span>
                        </div>
                        <div className="text-xl font-bold">
                          {formatCurrency(strategy.salaryRecommendations.aggressive.amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {strategy.salaryRecommendations.aggressive.successRate}% success rate
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          {strategy.salaryRecommendations.aggressive.rationale}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Leverage Factors */}
                  <div>
                    <h4 className="font-medium mb-3">Your Leverage</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm font-medium text-green-600 mb-2">Strengths</p>
                        <ul className="space-y-1">
                          {strategy.leverage.strengths.map((strength: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5" />
                              <span className="text-sm">{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-orange-600 mb-2">Areas to Address</p>
                        <ul className="space-y-1">
                          {strategy.leverage.weaknesses.map((weakness: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <ExclamationTriangleIcon className="w-4 h-4 text-orange-500 mt-0.5" />
                              <span className="text-sm">{weakness}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="scripts" className="space-y-4">
                  {/* Negotiation Script */}
                  <div>
                    <h4 className="font-medium mb-3">Negotiation Script</h4>

                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="font-medium text-blue-900 mb-2">Opening Statement</p>
                        <p className="text-sm text-blue-800">{strategy.negotiationScript.opening}</p>
                      </div>

                      <div>
                        <p className="font-medium mb-2">Key Points to Cover</p>
                        <ul className="space-y-2">
                          {strategy.negotiationScript.keyPoints.map((point: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-medium mt-0.5">
                                {index + 1}
                              </div>
                              <span className="text-sm">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="font-medium mb-2">Handling Objections</p>
                        <div className="space-y-3">
                          {strategy.negotiationScript.handlingObjections.map((item: any, index: number) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <p className="text-sm font-medium text-red-600 mb-1">
                                If they say: &quot;{item.objection}&quot;
                              </p>
                              <p className="text-sm text-gray-700">
                                You respond: &quot;{item.response}&quot;
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="font-medium text-green-900 mb-2">Closing Strategy</p>
                        <p className="text-sm text-green-800">{strategy.negotiationScript.closingStrategy}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tactics" className="space-y-4">
                  {/* Negotiation Strategies */}
                  <div>
                    <h4 className="font-medium mb-3">Recommended Approaches</h4>
                    <div className="space-y-3">
                      {strategy.strategies.map((approach: any, index: number) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">{approach.approach}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <Badge className={getRiskColor(approach.riskLevel)}>
                                  {approach.riskLevel} risk
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  {approach.successProbability}% success rate
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2 mt-3">
                            <div className="p-3 bg-gray-50 rounded">
                              <p className="text-xs font-medium text-gray-600 mb-1">Script:</p>
                              <p className="text-sm text-gray-800">{approach.script}</p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded">
                              <p className="text-xs font-medium text-blue-600 mb-1">When to use:</p>
                              <p className="text-sm text-blue-800">{approach.whenToUse}</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded">
                              <p className="text-xs font-medium text-green-600 mb-1">Expected outcome:</p>
                              <p className="text-sm text-green-800">{approach.expectedOutcome}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Non-Monetary Negotiations */}
                  <div>
                    <h4 className="font-medium mb-3">Non-Monetary Benefits to Negotiate</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(strategy.nonMonetaryNegotiations).map(([key, value]) => (
                        <div key={key} className="p-3 border rounded-lg">
                          <p className="font-medium text-sm capitalize mb-1">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                          <p className="text-xs text-gray-600">{value as string}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-3">Negotiation Timeline</h4>
                    <div className="space-y-3">
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <ClockIcon className="w-4 h-4 text-blue-500" />
                          <p className="font-medium text-sm">Ideal Window</p>
                        </div>
                        <p className="text-sm text-gray-600">{strategy.timeline.idealNegotiationWindow}</p>
                      </div>

                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <ChatBubbleLeftRightIcon className="w-4 h-4 text-green-500" />
                          <p className="font-medium text-sm">Response Time</p>
                        </div>
                        <p className="text-sm text-gray-600">{strategy.timeline.responseTimeframe}</p>
                      </div>

                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircleIcon className="w-4 h-4 text-orange-500" />
                          <p className="font-medium text-sm">Decision Deadline</p>
                        </div>
                        <p className="text-sm text-gray-600">{strategy.timeline.decisionDeadline}</p>
                      </div>

                      {strategy.timeline.followUpSchedule && (
                        <div>
                          <p className="font-medium text-sm mb-2">Follow-Up Schedule</p>
                          <ul className="space-y-1">
                            {strategy.timeline.followUpSchedule.map((followUp: string, index: number) => (
                              <li key={index} className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-sm">{followUp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Best Practices & Red Flags */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-3 text-green-600">Best Practices</h4>
                      <ul className="space-y-2">
                        {strategy.bestPractices.map((practice: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5" />
                            <span className="text-sm">{practice}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3 text-red-600">Red Flags to Watch</h4>
                      <ul className="space-y-2">
                        {strategy.redFlags.map((flag: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <ExclamationTriangleIcon className="w-4 h-4 text-red-500 mt-0.5" />
                            <span className="text-sm">{flag}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Personalized Insights */}
          {strategy.personalizedInsights && strategy.personalizedInsights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LightBulbIcon className="w-5 h-5" />
                  Personalized Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {strategy.personalizedInsights.map((insight: string, index: number) => (
                    <div key={index} className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-900">{insight}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}