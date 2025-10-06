'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  Target,
  Brain,
  Users,
  MapPin,
  DollarSign,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Zap,
  Search,
  Clock,
  BarChart3,
  Lightbulb,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import type { PersonalizedSalaryAnalysis } from '@/lib/services/enhanced-salary-rag';
import { salaryAnalysisCache } from '@/lib/services/salary-analysis-cache';
import { currencyConverter } from '@/lib/services/currency-converter';

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

  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [convertedSalaries, setConvertedSalaries] = useState<{
    min: number;
    max: number;
    median: number;
    currency: string;
  } | null>(null);
  const [convertingCurrency, setConvertingCurrency] = useState(false);

  // Manual triggering only - NO AUTO-LOAD
  // useEffect(() => {
  //   checkForCachedAnalysis();
  // }, [jobId]);

  const checkForCachedAnalysis = async () => {
    try {
      const cacheCheckResponse = await fetch(`/api/jobs/${jobId}/enhanced-salary-analysis?checkCache=true`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (cacheCheckResponse.ok) {
        const cacheData = await cacheCheckResponse.json();
        if (cacheData.cached && cacheData.analysis) {
          // Found cached data, load it automatically
          setState({
            status: 'complete',
            progress: 100,
            currentStep: '',
            analysis: cacheData.analysis,
            error: null,
          });
        }
      }
    } catch (error) {
      console.log('No cached analysis found');
    }
  };

  const runAnalysis = async (forceRefresh: boolean = false) => {
    setState({
      status: 'searching',
      progress: 5,
      currentStep: forceRefresh ? 'Running fresh analysis...' : 'Checking for cached analysis...',
      analysis: null,
      error: null,
    });

    try {
      // Only check cache if not forcing refresh
      if (!forceRefresh) {
        // First check for cached analysis
        const cacheCheckResponse = await fetch(`/api/jobs/${jobId}/enhanced-salary-analysis?checkCache=true`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (cacheCheckResponse.ok) {
          const cacheData = await cacheCheckResponse.json();
          if (cacheData.cached && cacheData.analysis) {
            // Found cached data, use it immediately
            setState({
              status: 'complete',
              progress: 100,
              currentStep: 'Analysis loaded from cache!',
              analysis: cacheData.analysis,
              error: null,
            });
            toast.success('Salary analysis loaded from cache', {
              description: `Cached on ${new Date(cacheData.analysis.cachedAt).toLocaleDateString()}`
            });
            return;
          }
        }
      } else {
        // Clear existing analysis when forcing refresh
        setState(prev => ({
          ...prev,
          analysis: null,
        }));
      }

      // No cache found, proceed with fresh analysis
      setState(prev => ({
        ...prev,
        progress: 10,
        currentStep: 'Gathering your profile context...',
      }));

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

      const response = await fetch(`/api/jobs/${jobId}/enhanced-salary-analysis${forceRefresh ? '?forceRefresh=true' : ''}`, {
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
      console.log('🔍 API Response structure:', data);

      // Handle different response structures
      let analysisData = data.analysis || data;

      // If we get raw AI format, try to access the transformed version
      if (analysisData.compensation && !analysisData.salaryIntelligence) {
        console.warn('⚠️ Received raw AI format instead of transformed format:', analysisData);
        // The transformation should have happened on the server
        throw new Error('Server returned invalid analysis format');
      }

      setState(prev => ({
        ...prev,
        status: 'complete',
        progress: 100,
        currentStep: 'Analysis complete!',
        analysis: analysisData,
      }));

      toast.success(forceRefresh ? 'Fresh salary analysis completed!' : 'Salary analysis completed successfully!');
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
    return currencyConverter.formatCurrency(amount, currency);
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    if (!state.analysis?.salaryIntelligence?.range) return;

    setSelectedCurrency(newCurrency);
    setConvertingCurrency(true);

    try {
      const originalCurrency = state.analysis.salaryIntelligence.range.currency || 'USD';

      if (newCurrency === originalCurrency) {
        // Reset to original values
        setConvertedSalaries(null);
      } else {
        // Convert to new currency
        const converted = await currencyConverter.convertSalaryRange(
          {
            min: state.analysis.salaryIntelligence.range.min,
            max: state.analysis.salaryIntelligence.range.max,
            median: state.analysis.salaryIntelligence.range.median,
          },
          originalCurrency,
          newCurrency
        );

        if (converted) {
          setConvertedSalaries({
            ...converted,
            currency: newCurrency
          });
        } else {
          toast.error('Currency conversion failed. Please try again.');
          setSelectedCurrency(originalCurrency);
        }
      }
    } catch (error) {
      console.error('Currency conversion error:', error);
      toast.error('Failed to convert currency');
    } finally {
      setConvertingCurrency(false);
    }
  };

  // Reset currency when new analysis is loaded
  useEffect(() => {
    if (state.analysis?.salaryIntelligence?.range?.currency) {
      setSelectedCurrency(state.analysis.salaryIntelligence.range.currency);
      setConvertedSalaries(null);
    }
  }, [state.analysis]);

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

        <Button onClick={() => runAnalysis(false)} className="w-full" size="lg">
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
    if (!analysis || !analysis.salaryIntelligence || !analysis.salaryIntelligence.range) {
      console.error('Invalid analysis structure:', analysis);
      return null;
    }

    return (
      <div className="space-y-6">
        {/* Salary Intelligence Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Salary Intelligence
                {(analysis as any).jobType && (analysis as any).jobType !== 'standard' && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                    {(analysis as any).jobType.toUpperCase()}
                  </Badge>
                )}
                <Badge className={`${getConfidenceColor(analysis.salaryIntelligence.range.confidence)} border`}>
                  {Math.round(analysis.salaryIntelligence.range.confidence * 100)}% confidence
                </Badge>
              </CardTitle>
              <Select
                value={selectedCurrency}
                onValueChange={handleCurrencyChange}
                disabled={convertingCurrency}
              >
                <SelectTrigger className="w-32">
                  <SelectValue>
                    {convertingCurrency ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Converting...
                      </span>
                    ) : (
                      selectedCurrency
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {currencyConverter.SUPPORTED_CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <span className="flex items-center gap-2">
                        <span className="font-mono">{currency.code}</span>
                        <span className="text-muted-foreground text-sm">{currency.symbol}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Job Type Note for special cases */}
            {(analysis as any).jobType && (analysis as any).jobType !== 'standard' && (analysis as any).jobTypeNotes && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>{(analysis as any).jobType.toUpperCase()} Position:</strong> {(analysis as any).jobTypeNotes}
                </AlertDescription>
              </Alert>
            )}

            {/* Check if compensation is fixed (VIE, internship, etc.) */}
            {(analysis.salaryIntelligence.range as any).isFixed ? (
              <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <div className="text-3xl font-bold text-blue-700">
                  {formatCurrency(
                    convertedSalaries?.median ?? analysis.salaryIntelligence.range.median,
                    convertedSalaries?.currency ?? analysis.salaryIntelligence.range.currency
                  )}
                </div>
                <div className="text-sm text-blue-600 mt-2">
                  {(analysis as any).jobType === 'vie' ? 'Fixed VIE Gratification' :
                   (analysis as any).jobType === 'internship' ? 'Fixed Internship Stipend' :
                   'Fixed Compensation'}
                </div>
                {(analysis as any).jobTypeNotes && (
                  <div className="text-xs text-gray-600 mt-2">
                    {(analysis as any).jobTypeNotes}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-700">
                    {formatCurrency(
                      convertedSalaries?.min ?? analysis.salaryIntelligence.range.min,
                      convertedSalaries?.currency ?? analysis.salaryIntelligence.range.currency
                    )}
                  </div>
                  <div className="text-sm text-green-600">Minimum</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700">
                    {formatCurrency(
                      convertedSalaries?.median ?? analysis.salaryIntelligence.range.median,
                      convertedSalaries?.currency ?? analysis.salaryIntelligence.range.currency
                    )}
                  </div>
                  <div className="text-sm text-blue-600">Market Rate</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-2xl font-bold text-purple-700">
                    {formatCurrency(
                      convertedSalaries?.max ?? analysis.salaryIntelligence.range.max,
                      convertedSalaries?.currency ?? analysis.salaryIntelligence.range.currency
                    )}
                  </div>
                  <div className="text-sm text-purple-600">Maximum</div>
                </div>
              </div>
            )}

            {convertedSalaries && (
              <div className="text-xs text-muted-foreground text-center bg-blue-50 p-2 rounded">
                Converted from {analysis.salaryIntelligence.range.currency} at current rates
              </div>
            )}

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
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Personalized for Your Profile
              </CardTitle>
              {/* Profile Usage Indicator */}
              <div className="flex items-center gap-2 text-sm">
                {analysis.profileContext?.contextCompleteness >= 70 ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-700">
                      Analysis personalized with your resume, skills, and {analysis.profileContext?.keyFactors?.length || 0} profile factors
                    </span>
                  </>
                ) : analysis.profileContext?.contextCompleteness >= 40 ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-amber-700">
                      Partial profile used - {analysis.profileContext?.improvementSuggestions?.join(', ')}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-red-700">
                      Limited profile data - upload resume for accurate personalization
                    </span>
                  </>
                )}
              </div>
            </div>
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Skills Match</span>
                    <div className="flex items-center gap-2">
                      <Progress value={analysis.personalizedInsights.skillsMatch} className="w-16 h-2" />
                      <span className="text-sm">{analysis.personalizedInsights.skillsMatch}%</span>
                    </div>
                  </div>

                  {analysis.personalizedInsights.skillsBreakdown && (
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700">
                        <ChevronDown className="w-3 h-3" />
                        View detailed breakdown
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 space-y-2">
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          {analysis.personalizedInsights.skillsBreakdown.matchExplanation}
                        </div>

                        {analysis.personalizedInsights.skillsBreakdown.matchingSkills.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-green-700 mb-1">✓ Matching Skills</div>
                            <div className="flex flex-wrap gap-1">
                              {analysis.personalizedInsights.skillsBreakdown.matchingSkills.map((skill, index) => (
                                <Badge key={index} variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {analysis.personalizedInsights.skillsBreakdown.partialMatches.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-orange-700 mb-1">⚡ Partial Matches</div>
                            <div className="space-y-1">
                              {analysis.personalizedInsights.skillsBreakdown.partialMatches.map((match, index) => (
                                <div key={index} className="text-xs text-orange-700 bg-orange-50 p-1 rounded">
                                  {match}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {analysis.personalizedInsights.skillsBreakdown.missingSkills.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-red-700 mb-1">◯ Missing Skills</div>
                            <div className="flex flex-wrap gap-1">
                              {analysis.personalizedInsights.skillsBreakdown.missingSkills.map((skill, index) => (
                                <Badge key={index} variant="outline" className="text-xs text-red-700 border-red-200">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Experience Alignment</span>
                  <p className="text-sm text-gray-700 mt-1">{analysis.personalizedInsights.experienceAlignment}</p>
                  {analysis.personalizedInsights.experienceJustification && (
                    <div className="mt-2 text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
                      <strong>Experience Assessment:</strong> {analysis.personalizedInsights.experienceJustification}
                    </div>
                  )}
                  {analysis.personalizedInsights.experiencePositioning && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Position in salary range</span>
                        <span>{Math.round(analysis.personalizedInsights.experiencePositioning * 100)}th percentile</span>
                      </div>
                      <Progress value={analysis.personalizedInsights.experiencePositioning * 100} className="w-full h-1" />
                    </div>
                  )}
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
                {analysis.personalizedInsights.salaryProgression.currentVsOffer &&
                 analysis.personalizedInsights.salaryProgression.currentVsOffer !== 'N/A' && (
                  <p className="text-sm text-gray-700">
                    <strong>vs Current:</strong> {analysis.personalizedInsights.salaryProgression.currentVsOffer}
                  </p>
                )}
                {analysis.personalizedInsights.salaryProgression.expectedVsOffer &&
                 analysis.personalizedInsights.salaryProgression.expectedVsOffer !== 'N/A' && (
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
          <Collapsible open={sourcesExpanded} onOpenChange={setSourcesExpanded}>
            <CardHeader>
              <CollapsibleTrigger className="w-full">
                <CardTitle className="flex items-center justify-between gap-2 hover:text-blue-600 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-5 h-5 text-gray-600" />
                    Data Sources
                    <Badge variant="outline" className="text-xs">
                      {analysis.sources?.webSources?.length || 0} sources
                    </Badge>
                  </div>
                  {sourcesExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </CardTitle>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(analysis.sources?.webSources || []).map((source, index) => (
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
                          {source.relevance}% relevance
                        </Badge>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                  </div>
                </a>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <div className="flex justify-center">
          <Button
            onClick={() => runAnalysis(true)}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
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
        <Button onClick={() => runAnalysis(false)} variant="outline">
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