'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Target,
  MapPin,
  Clock,
  Users,
  Award,
  BarChart3,
  Zap,
  ArrowUp,
  ArrowDown,
  Equal
} from 'lucide-react';

interface SalaryComparisonData {
  offerSalary: number;
  currency: string;

  marketComparison: {
    averageSalary: number;
    percentile: number;
    trend: 'above' | 'below' | 'equal';
    percentage: number;
  };

  userComparison: {
    currentSalary?: number;
    expectedSalary?: number;
    dreamSalary?: number;
  };

  similarRoles: {
    sameCompany: { count: number; avgSalary: number; range: [number, number] };
    sameLocation: { count: number; avgSalary: number; range: [number, number] };
    sameExperience: { count: number; avgSalary: number; range: [number, number] };
  };

  careerProgression: {
    nextLevel: { title: string; avgSalary: number; timeframe: string };
    in2Years: { expectedSalary: number; confidence: number };
    in5Years: { expectedSalary: number; confidence: number };
  };

  salaryScore: number; // 0-100
  negotiationPower: number; // 0-100
}

interface SalaryComparisonDashboardProps {
  data: SalaryComparisonData;
}

export default function SalaryComparisonDashboard({ data }: SalaryComparisonDashboardProps) {
  const [activeView, setActiveView] = useState<'overview' | 'comparison' | 'progression'>('overview');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTrendIcon = (trend: 'above' | 'below' | 'equal') => {
    switch (trend) {
      case 'above': return <ArrowUp className="w-4 h-4 text-green-600" />;
      case 'below': return <ArrowDown className="w-4 h-4 text-red-600" />;
      case 'equal': return <Equal className="w-4 h-4 text-blue-600" />;
    }
  };

  const getTrendColor = (trend: 'above' | 'below' | 'equal') => {
    switch (trend) {
      case 'above': return 'text-green-600 bg-green-50 border-green-200';
      case 'below': return 'text-red-600 bg-red-50 border-red-200';
      case 'equal': return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Salary Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-600" />
            Your Salary Score
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
              {data.salaryScore}/100
            </Badge>
          </CardTitle>
          <CardDescription>
            Overall compensation assessment based on market data and personal factors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={data.salaryScore} className="h-3" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-gray-900">Market Position</div>
                <div className="text-gray-600">{data.marketComparison.percentile}th percentile</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">Negotiation Power</div>
                <div className="text-gray-600">{data.negotiationPower}%</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">Growth Potential</div>
                <div className="text-gray-600">High</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">Risk Level</div>
                <div className="text-gray-600">Low</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Quick Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <div className="font-semibold text-blue-900">This Offer</div>
                <div className="text-2xl font-bold text-blue-700">{formatCurrency(data.offerSalary)}</div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  {getTrendIcon(data.marketComparison.trend)}
                  <Badge className={getTrendColor(data.marketComparison.trend)}>
                    {data.marketComparison.percentage}% vs market
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="text-sm font-medium text-gray-600">Market Average</div>
                <div className="text-lg font-semibold">{formatCurrency(data.marketComparison.averageSalary)}</div>
              </div>
              {data.userComparison.currentSalary && (
                <div className="p-3 border rounded-lg">
                  <div className="text-sm font-medium text-gray-600">Your Current</div>
                  <div className="text-lg font-semibold">{formatCurrency(data.userComparison.currentSalary)}</div>
                </div>
              )}
              {data.userComparison.expectedSalary && (
                <div className="p-3 border rounded-lg">
                  <div className="text-sm font-medium text-gray-600">Your Target</div>
                  <div className="text-lg font-semibold">{formatCurrency(data.userComparison.expectedSalary)}</div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderComparison = () => (
    <div className="space-y-6">
      {/* Similar Roles Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Similar Roles Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Same Company */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="font-medium">Same Company</span>
                  <Badge variant="outline">{data.similarRoles.sameCompany.count} roles</Badge>
                </div>
                <div className="text-lg font-semibold">{formatCurrency(data.similarRoles.sameCompany.avgSalary)}</div>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Range: {formatCurrency(data.similarRoles.sameCompany.range[0])} - {formatCurrency(data.similarRoles.sameCompany.range[1])}</span>
                <span className="text-green-600">+15% vs offer</span>
              </div>
            </div>

            {/* Same Location */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">Same Location</span>
                  <Badge variant="outline">{data.similarRoles.sameLocation.count} roles</Badge>
                </div>
                <div className="text-lg font-semibold">{formatCurrency(data.similarRoles.sameLocation.avgSalary)}</div>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Range: {formatCurrency(data.similarRoles.sameLocation.range[0])} - {formatCurrency(data.similarRoles.sameLocation.range[1])}</span>
                <span className="text-green-600">+8% vs offer</span>
              </div>
            </div>

            {/* Same Experience */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Same Experience Level</span>
                  <Badge variant="outline">{data.similarRoles.sameExperience.count} roles</Badge>
                </div>
                <div className="text-lg font-semibold">{formatCurrency(data.similarRoles.sameExperience.avgSalary)}</div>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Range: {formatCurrency(data.similarRoles.sameExperience.range[0])} - {formatCurrency(data.similarRoles.sameExperience.range[1])}</span>
                <span className="text-red-600">-5% vs offer</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderProgression = () => (
    <div className="space-y-6">
      {/* Career Progression */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Career Salary Progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Current vs Next Level */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-semibold text-gray-900">Next Level Promotion</div>
                  <div className="text-sm text-gray-600">{data.careerProgression.nextLevel.title} • {data.careerProgression.nextLevel.timeframe}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(data.careerProgression.nextLevel.avgSalary)}</div>
                  <div className="text-sm text-gray-600">+{Math.round((data.careerProgression.nextLevel.avgSalary / data.offerSalary - 1) * 100)}%</div>
                </div>
              </div>
              <Progress value={75} className="h-2" />
              <div className="text-xs text-gray-500 mt-2">Based on typical promotion timeline and performance</div>
            </div>

            {/* 2-Year and 5-Year Projections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">2-Year Projection</span>
                </div>
                <div className="text-xl font-bold text-blue-600">{formatCurrency(data.careerProgression.in2Years.expectedSalary)}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Progress value={data.careerProgression.in2Years.confidence} className="flex-1 h-1" />
                  <span className="text-xs text-gray-500">{data.careerProgression.in2Years.confidence}% confidence</span>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-purple-500" />
                  <span className="font-medium">5-Year Projection</span>
                </div>
                <div className="text-xl font-bold text-purple-600">{formatCurrency(data.careerProgression.in5Years.expectedSalary)}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Progress value={data.careerProgression.in5Years.confidence} className="flex-1 h-1" />
                  <span className="text-xs text-gray-500">{data.careerProgression.in5Years.confidence}% confidence</span>
                </div>
              </div>
            </div>

            {/* Growth Chart Placeholder */}
            <div className="p-6 border-2 border-dashed border-gray-200 rounded-lg text-center">
              <TrendingUp className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-gray-600 font-medium">Interactive Salary Growth Chart</div>
              <div className="text-sm text-gray-500">Visualize your career trajectory over time</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeView === 'overview' ? 'default' : 'ghost'}
          onClick={() => setActiveView('overview')}
          className="rounded-b-none"
        >
          <Zap className="w-4 h-4 mr-2" />
          Overview
        </Button>
        <Button
          variant={activeView === 'comparison' ? 'default' : 'ghost'}
          onClick={() => setActiveView('comparison')}
          className="rounded-b-none"
        >
          <Target className="w-4 h-4 mr-2" />
          Comparison
        </Button>
        <Button
          variant={activeView === 'progression' ? 'default' : 'ghost'}
          onClick={() => setActiveView('progression')}
          className="rounded-b-none"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Progression
        </Button>
      </div>

      {/* Content */}
      {activeView === 'overview' && renderOverview()}
      {activeView === 'comparison' && renderComparison()}
      {activeView === 'progression' && renderProgression()}
    </div>
  );
}