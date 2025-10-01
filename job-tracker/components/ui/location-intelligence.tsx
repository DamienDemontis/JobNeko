'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MapPin,
  DollarSign,
  Home,
  Car,
  Heart,
  GraduationCap,
  Shield,
  Sun,
  Users,
  Briefcase,
  Plane,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Globe,
  Clock,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

interface LocationIntelligenceProps {
  jobId: string;
  jobLocation: string;
  jobTitle: string;
  company: string;
  salaryData?: {
    min: number;
    max: number;
    median: number;
    currency: string;
    isFixed?: boolean;
  };
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
  status: 'idle' | 'loading' | 'complete' | 'error';
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
  salaryData
}: LocationIntelligenceProps) {
  const [state, setState] = useState<LocationIntelligenceState>({
    status: 'idle',
    progress: 0,
    currentStep: 'Ready to analyze location',
    analysis: null,
    error: null,
  });

  const runLocationAnalysis = async (forceRefresh = false) => {
    setState(prev => ({
      ...prev,
      status: 'loading',
      progress: 0,
      currentStep: 'Initializing location analysis...',
      error: null,
    }));

    try {
      // Check cache first
      setState(prev => ({ ...prev, progress: 10, currentStep: 'Checking cached analysis...' }));

      if (!forceRefresh) {
        const cacheResponse = await fetch(`/api/jobs/${jobId}/location-analysis?checkCache=true`, {
          headers: { 'Content-Type': 'application/json' }
        });

        if (cacheResponse.ok) {
          const cacheData = await cacheResponse.json();
          if (cacheData.cached && cacheData.analysis) {
            setState(prev => ({
              ...prev,
              status: 'complete',
              progress: 100,
              currentStep: `Using cached analysis (${cacheData.cacheAge})`,
              analysis: cacheData.analysis,
            }));
            toast.success(`Location analysis loaded from cache (${cacheData.cacheAge})`);
            return;
          }
        }
      }

      // Run fresh analysis
      setState(prev => ({ ...prev, progress: 25, currentStep: 'Analyzing location data...' }));

      const analysisResponse = await fetch(`/api/jobs/${jobId}/location-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: jobLocation,
          jobTitle,
          company,
          salaryData,
          forceRefresh
        }),
      });

      setState(prev => ({ ...prev, progress: 75, currentStep: 'Processing analysis results...' }));

      if (!analysisResponse.ok) {
        throw new Error('Failed to analyze location');
      }

      const data = await analysisResponse.json();
      const analysisData = data.analysis || data;

      setState(prev => ({
        ...prev,
        status: 'complete',
        progress: 100,
        currentStep: 'Location analysis complete!',
        analysis: analysisData,
      }));

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
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'fair': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'challenging': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const renderInitialState = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          Location Intelligence
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            <Globe className="w-3 h-3 mr-1" />
            Quality of Life Analysis
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center space-y-4 p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
          <MapPin className="w-12 h-12 text-blue-600 mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Analyze Location & Quality of Life</h3>
            <p className="text-gray-600 text-sm">
              Get comprehensive insights about living in {jobLocation} including cost of living,
              quality of life metrics, cultural factors, and practical information for your move.
            </p>
          </div>
          <Button onClick={() => runLocationAnalysis()} className="w-full">
            <Zap className="w-4 h-4 mr-2" />
            Analyze Location Intelligence
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-3 rounded-lg border ${state.progress >= 25 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Cost Analysis</span>
            </div>
          </div>
          <div className={`p-3 rounded-lg border ${state.progress >= 50 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              <span className="text-sm">Quality of Life</span>
            </div>
          </div>
          <div className={`p-3 rounded-lg border ${state.progress >= 75 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="text-sm">Cultural Insights</span>
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
                Location Overview
                <Badge className={`${getAffordabilityColor(analysis.costOfLiving.affordabilityRating)} border`}>
                  {analysis.costOfLiving.affordabilityRating.toUpperCase()}
                </Badge>
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => runLocationAnalysis(true)}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-600">City</div>
                <div className="font-medium">{analysis.location.city}</div>
              </div>
              <div>
                <div className="text-gray-600">Country</div>
                <div className="font-medium">{analysis.location.country}</div>
              </div>
              <div>
                <div className="text-gray-600">Region</div>
                <div className="font-medium">{analysis.location.region}</div>
              </div>
              <div>
                <div className="text-gray-600">Timezone</div>
                <div className="font-medium">{analysis.location.timezone}</div>
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-700">{analysis.costOfLiving.overallIndex}</div>
                <div className="text-sm text-green-600">Overall Index</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{analysis.costOfLiving.housingCostPercentage}%</div>
                <div className="text-sm text-blue-600">Housing Cost</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-700">{analysis.costOfLiving.transportationIndex}</div>
                <div className="text-sm text-purple-600">Transport Index</div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{analysis.costOfLiving.comparison}</p>
            </div>
          </CardContent>
        </Card>

        {/* Quality of Life Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-600" />
              Quality of Life Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(analysis.qualityOfLife).map(([key, score]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className={`text-sm font-medium ${getScoreColor(score as number)}`}>
                      {score}/100
                    </span>
                  </div>
                  <Progress value={score as number} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cultural Factors */}
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
                <div className="text-sm">{analysis.culturalFactors.languages.join(', ')}</div>
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
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-600">Visa Requirements</div>
                <div className="text-sm">{analysis.practicalInfo.visaRequirements}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Tax Implications</div>
                <div className="text-sm">{analysis.practicalInfo.taxImplications}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Banking Access</div>
                <div className="text-sm">{analysis.practicalInfo.bankingAccess}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Healthcare Access</div>
                <div className="text-sm">{analysis.practicalInfo.healthcareAccess}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">Recommended Neighborhoods</div>
                <ul className="text-sm space-y-1">
                  {analysis.recommendations.neighborhoods.map((neighborhood, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Home className="w-3 h-3 text-gray-400" />
                      {neighborhood}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">Transportation Tips</div>
                <ul className="text-sm space-y-1">
                  {analysis.recommendations.transportationTips.map((tip, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Car className="w-3 h-3 text-gray-400" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">Cultural Tips</div>
                <ul className="text-sm space-y-1">
                  {analysis.recommendations.culturalTips.map((tip, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Users className="w-3 h-3 text-gray-400" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">Financial Advice</div>
                <ul className="text-sm space-y-1">
                  {analysis.recommendations.financialAdvice.map((advice, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <DollarSign className="w-3 h-3 text-gray-400" />
                      {advice}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-gray-600" />
              Data Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 mb-3">
              {analysis.sources.webSources.length} sources
            </div>
            <div className="space-y-3">
              {analysis.sources.webSources.map((source, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{source.title}</div>
                    <div className="text-xs text-gray-500">{source.url}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {source.type.replace('_', ' ')}
                    </Badge>
                    <div className="text-xs text-gray-500">{Math.round(source.relevance * 100)}% relevance</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
        <Button onClick={() => runLocationAnalysis()} className="w-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Analysis
        </Button>
      </CardContent>
    </Card>
  );

  // Render based on current state
  switch (state.status) {
    case 'loading':
      return renderLoadingState();
    case 'complete':
      return renderAnalysisResults();
    case 'error':
      return renderErrorState();
    default:
      return renderInitialState();
  }
}