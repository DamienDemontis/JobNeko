'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  MapPin,
  DollarSign,
  Home,
  Car,
  Heart,
  Users,
  Briefcase,
  AlertCircle,
  RefreshCw,
  Globe,
  Clock,
  Zap,
  ChevronDown,
  ExternalLink,
  TrendingUp,
  Target,
  Shield,
  GraduationCap,
  Trees
} from 'lucide-react';
import { toast } from 'sonner';

interface LocationIntelligenceProps {
  jobId: string;
  jobLocation: string;
  jobTitle: string;
  company: string;
  token: string;
}

interface LocationAnalysis {
  location: {
    city: string;
    country: string;
    region: string;
    timezone: string;
  };
  costOfLiving: {
    overallIndex: number;
    housingCostPercentage: number;
    transportationIndex: number;
    foodIndex: number;
    utilitiesIndex: number;
    comparison: string;
    affordabilityRating: 'excellent' | 'good' | 'fair' | 'challenging';
  };
  qualityOfLife: {
    overallScore: number;
    healthcare: number;
    safety: number;
    education: number;
    environment: number;
    infrastructure: number;
    workLifeBalance: number;
  };
  culturalFactors: {
    languages: string[];
    workCulture: string;
    socialIntegration: string;
    expatCommunity: string;
  };
  practicalInfo: {
    visaRequirements: string;
    taxImplications: string;
    bankingAccess: string;
    healthcareAccess: string;
  };
  recommendations: {
    neighborhoods: string[];
    transportationTips: string[];
    culturalTips: string[];
    financialAdvice: string[];
  };
  sources: {
    webSources: Array<{
      title: string;
      url: string;
      relevance: number;
      type: string;
    }>;
  };
}

interface LocationIntelligenceState {
  status: 'idle' | 'searching' | 'analyzing' | 'complete' | 'error';
  progress: number;
  currentStep: string;
  analysis: LocationAnalysis | null;
  error: string | null;
}

export default function LocationIntelligence({
  jobId,
  jobLocation,
  jobTitle,
  company,
  token
}: LocationIntelligenceProps) {
  const [state, setState] = useState<LocationIntelligenceState>({
    status: 'idle',
    progress: 0,
    currentStep: 'Ready to analyze location',
    analysis: null,
    error: null,
  });

  const lastJobIdRef = useRef<string | null>(null);
  const hasAutoLoadedRef = useRef(false);

  // Auto-load cached analysis ONCE when component first mounts
  useEffect(() => {
    if (!hasAutoLoadedRef.current) {
      hasAutoLoadedRef.current = true;
      lastJobIdRef.current = jobId;
      checkForCachedAnalysis();
    } else if (lastJobIdRef.current !== jobId) {
      lastJobIdRef.current = jobId;
      checkForCachedAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const checkForCachedAnalysis = async () => {
    try {
      const cacheCheckResponse = await fetch(`/api/jobs/${jobId}/location-analysis?checkCache=true`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (cacheCheckResponse.ok) {
        const cacheData = await cacheCheckResponse.json();
        if (cacheData.cached && cacheData.analysis) {
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

  const runAnalysis = async (forceRefresh = false) => {
    setState({
      status: 'searching',
      progress: 5,
      currentStep: forceRefresh ? 'Running fresh analysis...' : 'Initializing location analysis...',
      analysis: null,
      error: null,
    });

    try {
      // Step 1: Search cost data
      await new Promise(resolve => setTimeout(resolve, 800));
      setState(prev => ({
        ...prev,
        progress: 40,
        currentStep: 'Searching cost of living databases...',
      }));

      // Step 2: Search quality data
      await new Promise(resolve => setTimeout(resolve, 1000));
      setState(prev => ({
        ...prev,
        status: 'analyzing',
        progress: 70,
        currentStep: 'Analyzing location intelligence...',
      }));

      const analysisResponse = await fetch(`/api/jobs/${jobId}/location-analysis${forceRefresh ? '?forceRefresh=true' : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          location: jobLocation,
          jobTitle,
          company,
          forceRefresh
        }),
      });

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json();
        throw new Error(errorData.message || 'Failed to analyze location');
      }

      const data = await analysisResponse.json();

      setState({
        status: 'complete',
        progress: 100,
        currentStep: 'Location analysis complete!',
        analysis: data.analysis,
        error: null,
      });

      toast.success(forceRefresh ? 'Fresh location analysis completed!' : 'Location analysis completed successfully!');
    } catch (error) {
      console.error('Location analysis failed:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Analysis failed',
      }));
      toast.error('Failed to analyze location. Please try again.');
    }
  };

  const getAffordabilityColor = (rating: string) => {
    switch (rating) {
      case 'excellent': return 'bg-green-100 text-green-700 border-green-300';
      case 'good': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'fair': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'challenging': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const renderInitialState = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          Location Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center space-y-4 p-8 bg-gray-50 rounded-lg border border-gray-200">
          <MapPin className="w-12 h-12 text-blue-600 mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Analyze Location & Quality of Life</h3>
            <p className="text-gray-600 text-sm">
              Get comprehensive insights about living in <span className="font-medium">{jobLocation}</span> including
              cost of living, quality of life metrics, and practical information.
            </p>
          </div>
          <Button onClick={() => runAnalysis()} className="w-full">
            <Zap className="w-4 h-4 mr-2" />
            Start Location Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderLoadingState = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          Analyzing Location Intelligence
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

        <div className="grid grid-cols-3 gap-4">
          <div className={`p-3 rounded-lg border ${state.progress >= 40 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${state.progress >= 40 ? 'bg-blue-500' : 'bg-gray-300'}`} />
              <span className="text-sm font-medium">Cost Data</span>
            </div>
          </div>
          <div className={`p-3 rounded-lg border ${state.progress >= 70 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${state.progress >= 70 ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm font-medium">Quality Data</span>
            </div>
          </div>
          <div className={`p-3 rounded-lg border ${state.progress >= 100 ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${state.progress >= 100 ? 'bg-purple-500' : 'bg-gray-300'}`} />
              <span className="text-sm font-medium">AI Analysis</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderAnalysisResults = () => {
    const { analysis } = state;
    if (!analysis) return null;

    return (
      <div className="space-y-6">
        {/* Location Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                {analysis.location.city}, {analysis.location.country}
                <Badge variant="outline" className={getAffordabilityColor(analysis.costOfLiving.affordabilityRating)}>
                  {analysis.costOfLiving.affordabilityRating.toUpperCase()}
                </Badge>
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => runAnalysis(true)}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Region</div>
                <div className="font-medium">{analysis.location.region}</div>
              </div>
              <div>
                <div className="text-gray-600">Timezone</div>
                <div className="font-medium">{analysis.location.timezone}</div>
              </div>
              <div>
                <div className="text-gray-600">Cost Index</div>
                <div className="font-medium">{analysis.costOfLiving.overallIndex}/100</div>
              </div>
              <div>
                <div className="text-gray-600">Quality Score</div>
                <div className="font-medium">{analysis.qualityOfLife.overallScore}/100</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost of Living */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Cost of Living Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Overall Index</div>
                <div className="text-2xl font-bold">{analysis.costOfLiving.overallIndex}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Housing</div>
                <div className="text-2xl font-bold">{analysis.costOfLiving.housingCostPercentage}%</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Transport</div>
                <div className="text-2xl font-bold">{analysis.costOfLiving.transportationIndex}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Food</div>
                <div className="text-2xl font-bold">{analysis.costOfLiving.foodIndex}</div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">{analysis.costOfLiving.comparison}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quality of Life */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-600" />
              Quality of Life Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { key: 'healthcare', label: 'Healthcare', icon: Heart, value: analysis.qualityOfLife.healthcare },
                { key: 'safety', label: 'Safety', icon: Shield, value: analysis.qualityOfLife.safety },
                { key: 'education', label: 'Education', icon: GraduationCap, value: analysis.qualityOfLife.education },
                { key: 'environment', label: 'Environment', icon: Trees, value: analysis.qualityOfLife.environment },
                { key: 'infrastructure', label: 'Infrastructure', icon: Globe, value: analysis.qualityOfLife.infrastructure },
                { key: 'workLifeBalance', label: 'Work-Life Balance', icon: Clock, value: analysis.qualityOfLife.workLifeBalance }
              ].map(({ key, label, icon: Icon, value }) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <span className="text-sm font-medium">{value}/100</span>
                  </div>
                  <Progress value={value} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cultural & Social */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Cultural & Social Factors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">Languages</div>
                <div className="flex flex-wrap gap-2">
                  {analysis.culturalFactors.languages.map((lang, index) => (
                    <Badge key={index} variant="outline">{lang}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">Work Culture</div>
                <div className="text-sm">{analysis.culturalFactors.workCulture}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">Social Integration</div>
                <div className="text-sm">{analysis.culturalFactors.socialIntegration}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">Expat Community</div>
                <div className="text-sm">{analysis.culturalFactors.expatCommunity}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Practical Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-orange-600" />
              Practical Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm font-medium text-gray-600">Visa Requirements</div>
              <div className="text-sm mt-1">{analysis.practicalInfo.visaRequirements}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Tax Implications</div>
              <div className="text-sm mt-1">{analysis.practicalInfo.taxImplications}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Banking Access</div>
              <div className="text-sm mt-1">{analysis.practicalInfo.bankingAccess}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Healthcare Access</div>
              <div className="text-sm mt-1">{analysis.practicalInfo.healthcareAccess}</div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Recommendations & Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
                  <Home className="w-4 h-4" />
                  Recommended Neighborhoods
                </div>
                <ul className="text-sm space-y-1">
                  {analysis.recommendations.neighborhoods.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-gray-400">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
                  <Car className="w-4 h-4" />
                  Transportation Tips
                </div>
                <ul className="text-sm space-y-1">
                  {analysis.recommendations.transportationTips.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-gray-400">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
                  <Users className="w-4 h-4" />
                  Cultural Tips
                </div>
                <ul className="text-sm space-y-1">
                  {analysis.recommendations.culturalTips.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-gray-400">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
                  <DollarSign className="w-4 h-4" />
                  Financial Advice
                </div>
                <ul className="text-sm space-y-1">
                  {analysis.recommendations.financialAdvice.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-gray-400">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Sources */}
        <Collapsible>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-gray-600" />
                    Data Sources
                    <Badge variant="outline">{analysis.sources.webSources.length} sources</Badge>
                  </CardTitle>
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-2">
                  {analysis.sources.webSources.map((source, index) => (
                    <a
                      key={index}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                          {source.title}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{source.url}</div>
                      </div>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <Badge variant="outline" className="text-xs">{source.type}</Badge>
                        <div className="text-xs text-gray-500">{source.relevance}%</div>
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                      </div>
                    </a>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    );
  };

  const renderErrorState = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          Analysis Failed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {state.error || 'Failed to analyze location. Please try again.'}
          </AlertDescription>
        </Alert>
        <Button onClick={() => runAnalysis()} className="w-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Analysis
        </Button>
      </CardContent>
    </Card>
  );

  // Render based on current state
  switch (state.status) {
    case 'searching':
    case 'analyzing':
      return renderLoadingState();
    case 'complete':
      return renderAnalysisResults();
    case 'error':
      return renderErrorState();
    default:
      return renderInitialState();
  }
}
