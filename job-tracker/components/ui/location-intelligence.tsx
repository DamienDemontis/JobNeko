'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
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
  TrendingUp,
  Target,
  Shield,
  GraduationCap,
  Trees
} from 'lucide-react';
import { toast } from 'sonner';
import { DataSourcesSection, DataSource } from '@/components/shared/data-sources-section';
import { QualityMetricGrid, QualityMetric } from '@/components/shared/quality-metric-grid';
import { InfoGrid, InfoItem } from '@/components/shared/info-grid';

interface LocationIntelligenceProps {
  jobId: string;
  jobLocation: string;
  jobTitle: string;
  company: string;
  token: string;
}

interface LanguageInfo {
  name: string;
  percentage: number;
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
    monthlyEstimate: string;
    vsWorldAverage: string;
    vsUserLocation: string;
    keyInsights: string[];
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
    languages: LanguageInfo[];
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
    webSources: DataSource[];
  };
}

interface LocationIntelligenceState {
  status: 'checking-cache' | 'idle' | 'searching' | 'analyzing' | 'complete' | 'error';
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
    status: 'checking-cache',
    progress: 0,
    currentStep: 'Checking for cached analysis...',
    analysis: null,
    error: null,
  });

  const lastJobIdRef = useRef<string | null>(null);
  const hasAutoLoadedRef = useRef(false);

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
        headers: { 'Authorization': `Bearer ${token}` },
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
          return;
        }
      }
      // No cache found, show initial state
      setState({
        status: 'idle',
        progress: 0,
        currentStep: 'Ready to analyze location',
        analysis: null,
        error: null,
      });
    } catch (error) {
      console.log('No cached analysis found');
      // On error, show initial state
      setState({
        status: 'idle',
        progress: 0,
        currentStep: 'Ready to analyze location',
        analysis: null,
        error: null,
      });
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
      await new Promise(resolve => setTimeout(resolve, 800));
      setState(prev => ({ ...prev, progress: 40, currentStep: 'Searching cost of living databases...' }));

      await new Promise(resolve => setTimeout(resolve, 1000));
      setState(prev => ({ ...prev, status: 'analyzing', progress: 70, currentStep: 'Analyzing location intelligence...' }));

      const analysisResponse = await fetch(`/api/jobs/${jobId}/location-analysis${forceRefresh ? '?forceRefresh=true' : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ location: jobLocation, jobTitle, company, forceRefresh }),
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

  const renderCacheLoading = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          Location Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center text-sm text-gray-600 mb-4">
          Checking for cached analysis...
        </div>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      </CardContent>
    </Card>
  );

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
            <p className="text-gray-600 text-sm max-w-lg mx-auto">
              Get comprehensive insights about living in <span className="font-medium">{jobLocation}</span> including
              cost of living, quality of life metrics, and practical information.
            </p>
          </div>
          <Button onClick={() => runAnalysis()} className="w-full max-w-md mx-auto">
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

    // Prepare data for shared components
    const locationInfo: InfoItem[] = [
      { label: 'Region', value: analysis.location.region },
      { label: 'Timezone', value: analysis.location.timezone },
      { label: 'Cost Index', value: `${analysis.costOfLiving.overallIndex}/100` },
      { label: 'Quality Score', value: `${analysis.qualityOfLife.overallScore}/100` }
    ];

    const costMetrics: InfoItem[] = [
      { label: 'Overall Index', value: analysis.costOfLiving.overallIndex.toString() },
      { label: 'Housing', value: `${analysis.costOfLiving.housingCostPercentage}%` },
      { label: 'Transport', value: analysis.costOfLiving.transportationIndex.toString() },
      { label: 'Food', value: analysis.costOfLiving.foodIndex.toString() }
    ];

    const qualityMetrics: QualityMetric[] = [
      { key: 'healthcare', label: 'Healthcare', value: analysis.qualityOfLife.healthcare, icon: Heart },
      { key: 'safety', label: 'Safety', value: analysis.qualityOfLife.safety, icon: Shield },
      { key: 'education', label: 'Education', value: analysis.qualityOfLife.education, icon: GraduationCap },
      { key: 'environment', label: 'Environment', value: analysis.qualityOfLife.environment, icon: Trees },
      { key: 'infrastructure', label: 'Infrastructure', value: analysis.qualityOfLife.infrastructure, icon: Globe },
      { key: 'workLifeBalance', label: 'Work-Life Balance', value: analysis.qualityOfLife.workLifeBalance, icon: Clock }
    ];

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
            <InfoGrid items={locationInfo} columns={4} />
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
            <InfoGrid items={costMetrics} columns={4} centered />

            {/* Clean summary section */}
            {(analysis.costOfLiving.monthlyEstimate || analysis.costOfLiving.vsWorldAverage || analysis.costOfLiving.vsUserLocation) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analysis.costOfLiving.monthlyEstimate && (
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <div className="text-xs text-gray-600 mb-1">Monthly Estimate</div>
                    <div className="text-sm font-medium text-gray-900">{analysis.costOfLiving.monthlyEstimate}</div>
                  </div>
                )}
                {analysis.costOfLiving.vsWorldAverage && (
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <div className="text-xs text-gray-600 mb-1">vs World Average</div>
                    <div className="text-sm font-medium text-gray-900">{analysis.costOfLiving.vsWorldAverage}</div>
                  </div>
                )}
                {analysis.costOfLiving.vsUserLocation && analysis.costOfLiving.vsUserLocation !== 'User current location not specified' && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-xs text-blue-600 mb-1">vs Your Location</div>
                    <div className="text-sm font-medium text-blue-900">{analysis.costOfLiving.vsUserLocation}</div>
                  </div>
                )}
              </div>
            )}

            {/* Key insights */}
            {analysis.costOfLiving.keyInsights && analysis.costOfLiving.keyInsights.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gray-600" />
                  <h4 className="text-sm font-medium text-gray-900">Key Insights</h4>
                </div>
                <ul className="space-y-2">
                  {analysis.costOfLiving.keyInsights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-600 font-bold">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
          <CardContent>
            <QualityMetricGrid metrics={qualityMetrics} columns={3} />
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
                    <Badge key={index} variant="outline" className="text-sm">
                      {lang.name} ({lang.percentage}%)
                    </Badge>
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

        {/* Data Sources - Using shared component */}
        <DataSourcesSection sources={analysis.sources.webSources} defaultExpanded={false} />
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

  switch (state.status) {
    case 'checking-cache':
      return renderCacheLoading();
    case 'idle':
      return renderInitialState();
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
