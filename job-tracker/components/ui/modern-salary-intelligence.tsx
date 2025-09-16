'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  Target,
  Brain,
  Users,
  MapPin,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Zap,
  Search,
  Clock,
  BarChart3,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import type { PersonalizedSalaryAnalysis } from '@/lib/services/enhanced-salary-rag';
import { salaryAnalysisCache } from '@/lib/services/salary-analysis-cache';

interface ModernSalaryIntelligenceProps {
  jobId: string;
  jobTitle: string;
  company: string;
  location: string;
  hasResume: boolean;
  token: string;
}

interface AnalysisState {
  status: 'idle' | 'searching' | 'analyzing' | 'complete' | 'error';
  progress: number;
  currentStep: string;
  analysis: PersonalizedSalaryAnalysis | null;
  error: string | null;
}

export default function ModernSalaryIntelligence({
  jobId,
  jobTitle,
  company,
  location,
  hasResume,
  token
}: ModernSalaryIntelligenceProps) {
  const [state, setState] = useState<AnalysisState>({
    status: 'idle',
    progress: 0,
    currentStep: '',
    analysis: null,
    error: null,
  });

  const runAnalysis = async () => {
    setState({
      status: 'searching',
      progress: 10,
      currentStep: 'Gathering your profile context...',
      analysis: null,
      error: null,
    });

    try {
      // Step 1: Profile context
      await new Promise(resolve => setTimeout(resolve, 800));
      setState(prev => ({
        ...prev,
        progress: 25,
        currentStep: 'Searching live salary databases...',
      }));

      // Step 2: Web search
      await new Promise(resolve => setTimeout(resolve, 1200));
      setState(prev => ({
        ...prev,
        progress: 50,
        currentStep: 'Analyzing market intelligence...',
      }));

      // Step 3: Analysis
      setState(prev => ({
        ...prev,
        status: 'analyzing',
        progress: 75,
        currentStep: 'Generating personalized insights...',
      }));

      const response = await fetch(`/api/jobs/${jobId}/enhanced-salary-analysis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to analyze salary');
      }

      const data = await response.json();

      setState(prev => ({
        ...prev,
        status: 'complete',
        progress: 100,
        currentStep: 'Analysis complete!',
        analysis: data.analysis,
      }));

      toast.success('Salary analysis completed successfully!');
    } catch (error) {
      console.error('Salary analysis failed:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Analysis failed',
      }));
      toast.error('Failed to analyze salary. Please try again.');
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 0.6) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (confidence >= 0.4) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const renderInitialState = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          Enhanced Salary Intelligence
          <Badge className="bg-purple-100 text-purple-700 border-purple-200">
            <Zap className="w-3 h-3 mr-1" />
            AI + Live Data
          </Badge>
        </CardTitle>
        <CardDescription>
          Get personalized salary insights using your profile and real market data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Search className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <h3 className="font-semibold text-blue-900 mb-1">Live Web Search</h3>
            <p className="text-sm text-blue-700">
              Search salary databases, company reviews, and market data
            </p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <h3 className="font-semibold text-green-900 mb-1">Your Profile Context</h3>
            <p className="text-sm text-green-700">
              {hasResume ? 'Uses your resume, experience, and preferences' : 'Uses your profile data and preferences'}
            </p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
            <Brain className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <h3 className="font-semibold text-purple-900 mb-1">Personalized Insights</h3>
            <p className="text-sm text-purple-700">
              Get advice tailored to your specific situation
            </p>
          </div>
        </div>

        {!hasResume && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Enhanced Analysis Available</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Upload your resume in your profile for more detailed skill matching and career progression insights.
                </p>
              </div>
            </div>
          </div>
        )}

        <Button onClick={runAnalysis} className="w-full" size="lg">
          <TrendingUp className="w-4 h-4 mr-2" />
          Start Intelligent Analysis
        </Button>
      </CardContent>
    </Card>
  );

  const renderProgress = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          Analyzing Salary Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{state.currentStep}</span>
            <span className="text-sm text-gray-500">{state.progress}%</span>
          </div>
          <Progress value={state.progress} className="h-2" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-3 rounded-lg border ${state.progress >= 25 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${state.progress >= 25 ? 'bg-blue-500' : 'bg-gray-300'}`} />
              <span className="text-sm font-medium">Profile Context</span>
            </div>
          </div>
          <div className={`p-3 rounded-lg border ${state.progress >= 50 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${state.progress >= 50 ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm font-medium">Web Intelligence</span>
            </div>
          </div>
          <div className={`p-3 rounded-lg border ${state.progress >= 100 ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${state.progress >= 100 ? 'bg-purple-500' : 'bg-gray-300'}`} />
              <span className="text-sm font-medium">AI Analysis</span>
            </div>
          </div>
        </div>

        {state.status === 'analyzing' && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-purple-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              <span className="text-sm font-medium">AI is analyzing your personalized context...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderAnalysis = () => {
    const { analysis } = state;
    if (!analysis) return null;

    return (
      <div className="space-y-6">
        {/* Salary Intelligence Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Salary Intelligence
              <Badge className={`${getConfidenceColor(analysis.salaryIntelligence.confidence)} border`}>
                {Math.round(analysis.salaryIntelligence.confidence * 100)}% confidence
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-700">
                  {formatCurrency(analysis.salaryIntelligence.range.min, analysis.salaryIntelligence.range.currency)}
                </div>
                <div className="text-sm text-green-600">Minimum</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">
                  {formatCurrency(analysis.salaryIntelligence.range.median, analysis.salaryIntelligence.range.currency)}
                </div>
                <div className="text-sm text-blue-600">Market Rate</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-700">
                  {formatCurrency(analysis.salaryIntelligence.range.max, analysis.salaryIntelligence.range.currency)}
                </div>
                <div className="text-sm text-purple-600">Maximum</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-gray-600" />
                <span className="font-medium">Market Position</span>
              </div>
              <Badge variant={analysis.salaryIntelligence.marketPosition === 'above_market' ? 'default' : 'secondary'}>
                {analysis.salaryIntelligence.marketPosition.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                <span className="font-medium">Negotiation Power</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={analysis.salaryIntelligence.negotiationPower} className="w-20 h-2" />
                <span className="text-sm font-medium">{analysis.salaryIntelligence.negotiationPower}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personalized Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Personalized for Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Profile Fit</span>
                  <Badge variant={analysis.personalizedInsights.fitForProfile === 'excellent' ? 'default' : 'secondary'}>
                    {analysis.personalizedInsights.fitForProfile}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Skills Match</span>
                  <div className="flex items-center gap-2">
                    <Progress value={analysis.personalizedInsights.skillsMatch} className="w-16 h-2" />
                    <span className="text-sm">{analysis.personalizedInsights.skillsMatch}%</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Experience Alignment</span>
                  <p className="text-sm text-gray-700 mt-1">{analysis.personalizedInsights.experienceAlignment}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-2">Career Progression Analysis</h4>
              <p className="text-sm text-gray-700">{analysis.personalizedInsights.careerProgression}</p>
            </div>

            {analysis.personalizedInsights.salaryProgression && (
              <div className="space-y-2">
                <h4 className="font-semibold">Salary Progression</h4>
                {analysis.personalizedInsights.salaryProgression.currentVsOffer && (
                  <p className="text-sm text-gray-700">
                    <strong>vs Current:</strong> {analysis.personalizedInsights.salaryProgression.currentVsOffer}
                  </p>
                )}
                {analysis.personalizedInsights.salaryProgression.expectedVsOffer && (
                  <p className="text-sm text-gray-700">
                    <strong>vs Expected:</strong> {analysis.personalizedInsights.salaryProgression.expectedVsOffer}
                  </p>
                )}
                <p className="text-sm text-gray-700">
                  <strong>Growth Potential:</strong> {analysis.personalizedInsights.salaryProgression.growthPotential}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-600" />
              Personalized Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.contextualRecommendations.redFlags.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900 mb-2">Potential Concerns</h4>
                    <ul className="space-y-1">
                      {analysis.contextualRecommendations.redFlags.map((flag, index) => (
                        <li key={index} className="text-sm text-red-700">• {flag}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Negotiation Strategy
                </h4>
                <ul className="space-y-1">
                  {analysis.contextualRecommendations.negotiationStrategy.map((strategy, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                      <ArrowRight className="w-3 h-3 mt-1 text-blue-500 flex-shrink-0" />
                      {strategy}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Action Items
                </h4>
                <ul className="space-y-1">
                  {analysis.contextualRecommendations.actionItems.map((item, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                      <ArrowRight className="w-3 h-3 mt-1 text-green-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-gray-600" />
              Data Sources
              <Badge variant="outline" className="text-xs">
                {analysis.sources.webSources.length} sources
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.sources.webSources.slice(0, 6).map((source, index) => (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-blue-600">{source.title}</p>
                      <p className="text-xs text-gray-500 truncate group-hover:text-blue-500">{source.url}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {source.type.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(source.relevance * 100)}% relevance
                        </Badge>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button
            onClick={() => setState(prev => ({ ...prev, status: 'idle', analysis: null }))}
            variant="outline"
          >
            Run New Analysis
          </Button>
        </div>
      </div>
    );
  };

  const renderError = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          Analysis Failed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-700">{state.error}</p>
        <Button onClick={runAnalysis} variant="outline">
          Try Again
        </Button>
      </CardContent>
    </Card>
  );

  if (state.status === 'idle') return renderInitialState();
  if (state.status === 'searching' || state.status === 'analyzing') return renderProgress();
  if (state.status === 'complete') return renderAnalysis();
  if (state.status === 'error') return renderError();

  return null;
}