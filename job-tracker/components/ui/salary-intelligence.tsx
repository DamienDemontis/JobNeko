'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SalarySpeculation from './salary-speculation';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  HomeIcon,
  ShoppingCartIcon,
  CarIcon,
  HeartIcon,
  MapPinIcon,
  UsersIcon,
  PiggyBankIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InfoIcon
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface SalaryIntelligenceProps {
  job: any; // Job object with salary and location data
  onJobUpdate?: (updatedJob: any) => void; // Optional callback for job updates
}

interface EnhancedSalaryAnalysis {
  originalSalary: {
    min: number;
    max: number;
    currency: string;
    frequency: string;
  };
  normalizedSalaryUSD: {
    min: number;
    max: number;
  };
  netSalaryUSD: {
    min: number;
    max: number;
  };
  familyAdjustedSalary: {
    min: number;
    max: number;
  };
  locationData: {
    city: string;
    country: string;
    costOfLivingIndex: number;
    rentIndex: number;
    qualityOfLifeIndex?: number;
    safetyIndex?: number;
    healthcareIndex?: number;
    educationIndex?: number;
  };
  comfortLevel: string;
  comfortScore: number;
  comparisonToExpected: {
    percentage: number;
    verdict: string;
  };
  betterThanPercent: number;
  savingsPotential: number;
  purchasingPower: number;
  familyImpact: {
    totalFamilySize: number;
    dependentsCost: number;
    housingMultiplier: number;
  };
  breakdown: {
    housing: { percentage: number; amount: number };
    food: { percentage: number; amount: number };
    transport: { percentage: number; amount: number };
    healthcare: { percentage: number; amount: number };
    education: { percentage: number; amount: number };
    savings: { percentage: number; amount: number };
    discretionary: { percentage: number; amount: number };
  };
}

const ComfortLevelBadge = ({ level, score }: { level: string; score: number }) => {
  const getComfortConfig = (level: string) => {
    switch (level.toLowerCase()) {
      case 'struggling': return { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircleIcon };
      case 'tight': return { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertTriangleIcon };
      case 'comfortable': return { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircleIcon };
      case 'thriving': return { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: TrendingUpIcon };
      case 'luxurious': return { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: DollarSignIcon };
      default: return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: InfoIcon };
    }
  };

  const config = getComfortConfig(level);
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} border font-medium px-3 py-1`}>
      <Icon className="w-4 h-4 mr-2" />
      {level} ({score}/100)
    </Badge>
  );
};

const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatSalaryRange = (min: number, max: number, currency = 'USD') => {
  if (min === max) return formatCurrency(min, currency);
  return `${formatCurrency(min, currency)} - ${formatCurrency(max, currency)}`;
};

export default function SalaryIntelligence({ job, onJobUpdate }: SalaryIntelligenceProps) {
  const [analysis, setAnalysis] = useState<EnhancedSalaryAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSalaryAnalysis = async () => {
      if (!job?.id) {
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/jobs/${job.id}/salary-analysis`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.hasData) {
          setAnalysis(null);
          setLoading(false);
          return;
        }

        // Transform API response to match our interface
        const transformedAnalysis: EnhancedSalaryAnalysis = {
          originalSalary: {
            min: data.originalSalary.min,
            max: data.originalSalary.max,
            currency: data.originalSalary.currency,
            frequency: data.originalSalary.frequency || 'yearly'
          },
          normalizedSalaryUSD: {
            min: data.normalizedSalaryUSD.min,
            max: data.normalizedSalaryUSD.max
          },
          netSalaryUSD: {
            min: data.analysis.netSalaryUSD?.min || data.normalizedSalaryUSD.min * 0.73,
            max: data.analysis.netSalaryUSD?.max || data.normalizedSalaryUSD.max * 0.73
          },
          familyAdjustedSalary: {
            min: data.analysis.familyAdjustedSalary?.min || data.normalizedSalaryUSD.min,
            max: data.analysis.familyAdjustedSalary?.max || data.normalizedSalaryUSD.max
          },
          locationData: {
            city: data.locationData.resolved.city,
            country: data.locationData.resolved.country,
            costOfLivingIndex: data.locationData.costOfLiving?.costOfLivingIndex || 100,
            rentIndex: data.locationData.costOfLiving?.rentIndex || 100,
            qualityOfLifeIndex: data.locationData.costOfLiving?.qualityOfLifeIndex,
            safetyIndex: data.locationData.costOfLiving?.safetyIndex,
            healthcareIndex: data.locationData.costOfLiving?.healthcareIndex,
            educationIndex: data.locationData.costOfLiving?.educationIndex
          },
          comfortLevel: data.analysis.comfortLevel || 'analyzing',
          comfortScore: data.analysis.comfortScore || 50,
          comparisonToExpected: {
            percentage: data.familyContext?.comparisonToExpected?.percentage || 0,
            verdict: data.familyContext?.comparisonToExpected?.verdict || 'no comparison available'
          },
          betterThanPercent: data.analysis.betterThanPercent || 50,
          savingsPotential: data.analysis.savingsPotential || 0,
          purchasingPower: data.analysis.purchasingPower || 1.0,
          familyImpact: {
            totalFamilySize: data.familyContext?.familySize || 1,
            dependentsCost: (data.familyContext?.dependents || 0) * 6000, // Estimate
            housingMultiplier: data.familyContext?.familySize > 2 ? 1.4 : 1.0
          },
          breakdown: data.analysis.breakdown || {
            housing: { percentage: 30, amount: (data.normalizedSalaryUSD.min / 12) * 0.30 },
            food: { percentage: 15, amount: (data.normalizedSalaryUSD.min / 12) * 0.15 },
            transport: { percentage: 10, amount: (data.normalizedSalaryUSD.min / 12) * 0.10 },
            healthcare: { percentage: 8, amount: (data.normalizedSalaryUSD.min / 12) * 0.08 },
            education: { percentage: 5, amount: (data.normalizedSalaryUSD.min / 12) * 0.05 },
            savings: { percentage: 20, amount: (data.normalizedSalaryUSD.min / 12) * 0.20 },
            discretionary: { percentage: 12, amount: (data.normalizedSalaryUSD.min / 12) * 0.12 }
          }
        };

        setAnalysis(transformedAnalysis);
      } catch (error) {
        console.error('Failed to fetch salary analysis:', error);
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSalaryAnalysis();
  }, [job?.id]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-8 bg-gray-200 rounded w-full"></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-32 bg-gray-200 rounded w-full"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysis) {
    return <SalarySpeculation job={job} onSalaryAdd={async (salaryData) => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          return;
        }

        // Update the job with salary information
        const response = await fetch(`/api/jobs/${job.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            salary: salaryData.type === 'fixed' 
              ? `${salaryData.fixedAmount} ${salaryData.currency}` 
              : salaryData.type === 'hourly'
                ? `${salaryData.hourlyRate}/hr ${salaryData.currency}`
                : `${salaryData.minAmount}-${salaryData.maxAmount} ${salaryData.currency}`,
            salaryMin: salaryData.type === 'range' ? salaryData.minAmount : salaryData.type === 'fixed' ? salaryData.fixedAmount : undefined,
            salaryMax: salaryData.type === 'range' ? salaryData.maxAmount : salaryData.type === 'fixed' ? salaryData.fixedAmount : undefined,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update job with salary information');
        }

        const { job: updatedJob } = await response.json();
        
        // Call the parent component's update callback if provided
        if (onJobUpdate) {
          onJobUpdate(updatedJob);
        }
        
        // Trigger a re-fetch of the analysis with the new salary data
        setLoading(true);
        
      } catch (error) {
        console.error('Error updating job with salary data:', error);
      }
    }} />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Overview Card */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSignIcon className="w-5 h-5" />
              Salary Intelligence Overview
            </div>
            <ComfortLevelBadge level={analysis.comfortLevel} score={analysis.comfortScore} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Salary Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Gross Salary</p>
              <p className="text-lg font-bold text-green-600">
                {formatSalaryRange(analysis.normalizedSalaryUSD.min, analysis.normalizedSalaryUSD.max)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Net Salary</p>
              <p className="text-lg font-bold text-blue-600">
                {formatSalaryRange(analysis.netSalaryUSD.min, analysis.netSalaryUSD.max)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Family Adjusted</p>
              <p className="text-lg font-bold text-purple-600">
                {formatSalaryRange(analysis.familyAdjustedSalary.min, analysis.familyAdjustedSalary.max)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Purchasing Power</p>
              <p className="text-lg font-bold text-orange-600">
                {analysis.purchasingPower.toFixed(2)}x
              </p>
            </div>
          </div>

          <Separator />

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <TrendingUpIcon className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Better Than</p>
                <p className="text-xl font-bold text-green-700">{Math.round(100 - analysis.betterThanPercent)}%</p>
                <p className="text-xs text-gray-500">of similar jobs</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <PiggyBankIcon className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Savings Potential</p>
                <p className="text-xl font-bold text-blue-700">{analysis.savingsPotential.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">of net income</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
              <UsersIcon className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Family Impact</p>
                <p className="text-xl font-bold text-purple-700">{analysis.familyImpact.totalFamilySize}</p>
                <p className="text-xs text-gray-500">family members</p>
              </div>
            </div>
          </div>

          {/* Comparison to Expected */}
          {analysis.comparisonToExpected.percentage !== 0 && (
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              {analysis.comparisonToExpected.percentage > 0 ? (
                <TrendingUpIcon className="w-6 h-6 text-green-600" />
              ) : (
                <TrendingDownIcon className="w-6 h-6 text-red-600" />
              )}
              <div>
                <p className="font-medium">{analysis.comparisonToExpected.verdict}</p>
                <p className="text-sm text-gray-600">compared to your expected salary</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Analysis Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPinIcon className="w-5 h-5" />
            Location Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center mb-4">
            <h3 className="font-semibold text-lg">{analysis.locationData.city}</h3>
            <p className="text-sm text-gray-600">{analysis.locationData.country}</p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium flex items-center gap-2">
                  <ShoppingCartIcon className="w-4 h-4" />
                  Cost of Living
                </span>
                <span className="text-sm font-bold">{analysis.locationData.costOfLivingIndex}</span>
              </div>
              <Progress value={Math.min(analysis.locationData.costOfLivingIndex, 200)} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">vs NYC baseline (100)</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium flex items-center gap-2">
                  <HomeIcon className="w-4 h-4" />
                  Rent Index
                </span>
                <span className="text-sm font-bold">{analysis.locationData.rentIndex}</span>
              </div>
              <Progress value={Math.min(analysis.locationData.rentIndex, 200)} className="h-2" />
            </div>

            {analysis.locationData.qualityOfLifeIndex && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <HeartIcon className="w-4 h-4" />
                    Quality of Life
                  </span>
                  <span className="text-sm font-bold">{analysis.locationData.qualityOfLifeIndex}</span>
                </div>
                <Progress value={Math.min(analysis.locationData.qualityOfLifeIndex, 200)} className="h-2" />
              </div>
            )}

            {analysis.locationData.safetyIndex && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">Safety</span>
                  <span className="text-sm font-bold">{analysis.locationData.safetyIndex}</span>
                </div>
                <Progress value={analysis.locationData.safetyIndex} className="h-2" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Budget Breakdown Card */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBankIcon className="w-5 h-5" />
            Monthly Budget Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {Object.entries(analysis.breakdown).map(([category, data]) => {
              const getIcon = (cat: string) => {
                switch (cat) {
                  case 'housing': return HomeIcon;
                  case 'food': return ShoppingCartIcon;
                  case 'transport': return CarIcon;
                  case 'healthcare': return HeartIcon;
                  case 'education': return InfoIcon;
                  case 'savings': return PiggyBankIcon;
                  default: return DollarSignIcon;
                }
              };
              
              const Icon = getIcon(category);
              
              return (
                <div key={category} className="text-center p-4 bg-gray-50 rounded-lg">
                  <Icon className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                  <p className="text-sm font-medium text-gray-600 capitalize">{category}</p>
                  <p className="text-lg font-bold">{data.percentage}%</p>
                  <p className="text-sm text-gray-500">{formatCurrency(data.amount)}/mo</p>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Budget Allocation</span>
              <span className="text-sm text-gray-500">Based on {formatCurrency(analysis.netSalaryUSD.min / 12)}/month</span>
            </div>
            <div className="flex h-4 bg-gray-200 rounded-full overflow-hidden">
              {Object.entries(analysis.breakdown).map(([category, data], index) => {
                const colors = [
                  'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 
                  'bg-blue-500', 'bg-purple-500', 'bg-pink-500'
                ];
                return (
                  <div 
                    key={category}
                    className={colors[index]}
                    style={{ width: `${data.percentage}%` }}
                    title={`${category}: ${data.percentage}%`}
                  />
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}