'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  CalculatorIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  BriefcaseIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface NetIncomeCalculatorProps {
  grossSalary: number;
  location: string;
  workMode: 'onsite' | 'hybrid' | 'remote_country' | 'remote_global';
  currency?: string;
  userId: string;
  token: string;
  jobTitle?: string;
  company?: string;
  onCalculated?: (data: any) => void;
}

interface TaxBreakdown {
  federal: {
    amount: number;
    rate: number;
    breakdown: {
      incomeTax: number;
      socialSecurity: number;
      medicare: number;
    };
  };
  state: {
    amount: number;
    rate: number;
    stateName: string;
  };
  local?: {
    amount: number;
    rate: number;
    locality: string;
  };
  totalTaxes: number;
  effectiveRate: number;
}

export default function NetIncomeCalculator({
  grossSalary,
  location,
  workMode,
  currency = 'USD',
  userId,
  token,
  jobTitle,
  company,
  onCalculated
}: NetIncomeCalculatorProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [netIncomeData, setNetIncomeData] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Advanced settings
  const [retirement401k, setRetirement401k] = useState(0);
  const [healthInsurance, setHealthInsurance] = useState(0);
  const [employerMatch401k, setEmployerMatch401k] = useState(0);
  const [signingBonus, setSigningBonus] = useState(0);
  const [performanceBonus, setPerformanceBonus] = useState(0);
  const [remoteWorkLocation, setRemoteWorkLocation] = useState('');

  const calculateNetIncome = async () => {
    setIsCalculating(true);

    try {
      const request = {
        grossSalary,
        location,
        workMode,
        currency,
        userId,
        retirement401k: retirement401k * grossSalary / 100, // Convert percentage to amount
        healthInsurance: healthInsurance * 12, // Convert monthly to annual
        otherPreTaxDeductions: 0,
        employerLocation: location,
        residenceLocation: remoteWorkLocation || location,
        employerMatch401k: employerMatch401k * grossSalary / 100,
        employerHealthContribution: 0,
        stockOptions: 0,
        signingBonus,
        performanceBonus
      };

      const response = await fetch('/api/salary/net-income', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Calculation failed');
      }

      const { data } = await response.json();
      setNetIncomeData(data);
      onCalculated?.(data);
      toast.success('Net income calculated successfully!');
    } catch (error) {
      console.error('Net income calculation failed:', error);
      toast.error('Failed to calculate net income');
    } finally {
      setIsCalculating(false);
    }
  };

  // Fetch user profile for default location
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch('/api/auth/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const { data } = await response.json();
          setUserProfile(data.profile);

          // Set default location for remote jobs
          if (workMode.includes('remote') && data.profile?.currentLocation && !remoteWorkLocation) {
            setRemoteWorkLocation(data.profile.currentLocation);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };

    fetchUserProfile();
  }, [token, workMode]);

  // Auto-calculate on mount
  useEffect(() => {
    if (grossSalary && location && !netIncomeData) {
      calculateNetIncome();
    }
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(1)}%`;
  };

  return (
    <div className="space-y-4">
      {/* Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalculatorIcon className="w-5 h-5" />
            Net Take-Home Calculator
            <Badge variant="outline" className="ml-auto">
              AI-Powered
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Gross Annual Salary</Label>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(grossSalary)}
              </div>
            </div>
            <div>
              <Label>Location</Label>
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-4 h-4 text-gray-500" />
                <span>{location}</span>
              </div>
            </div>
          </div>

          {/* Remote Work Configuration */}
          {workMode.includes('remote') && (
            <Alert>
              <InformationCircleIcon className="h-4 w-4" />
              <AlertDescription>
                Remote work detected. Specify your residence location for accurate tax calculation.
                <Input
                  placeholder={userProfile?.currentLocation ? `Default: ${userProfile.currentLocation}` : "Where do you live? (e.g., Austin, TX)"}
                  value={remoteWorkLocation}
                  onChange={(e) => setRemoteWorkLocation(e.target.value)}
                  className="mt-2"
                />
                {userProfile?.currentLocation && !remoteWorkLocation && (
                  <p className="text-xs text-gray-500 mt-1">
                    Using default location from your profile: {userProfile.currentLocation}
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Advanced Settings Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="advanced">Advanced Deductions & Benefits</Label>
            <Switch
              id="advanced"
              checked={showAdvanced}
              onCheckedChange={setShowAdvanced}
            />
          </div>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label>401(k) Contribution (%)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[retirement401k]}
                    onValueChange={(value) => setRetirement401k(value[0])}
                    max={19}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-12 text-right">{retirement401k}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Annual: {formatCurrency(grossSalary * retirement401k / 100)}
                </p>
              </div>

              <div>
                <Label>Employer 401(k) Match (%)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[employerMatch401k]}
                    onValueChange={(value) => setEmployerMatch401k(value[0])}
                    max={10}
                    step={0.5}
                    className="flex-1"
                  />
                  <span className="w-12 text-right">{employerMatch401k}%</span>
                </div>
              </div>

              <div>
                <Label>Health Insurance (Monthly)</Label>
                <Input
                  type="number"
                  value={healthInsurance}
                  onChange={(e) => setHealthInsurance(Number(e.target.value))}
                  placeholder="Monthly premium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Signing Bonus</Label>
                  <Input
                    type="number"
                    value={signingBonus}
                    onChange={(e) => setSigningBonus(Number(e.target.value))}
                    placeholder="One-time bonus"
                  />
                </div>
                <div>
                  <Label>Annual Performance Bonus</Label>
                  <Input
                    type="number"
                    value={performanceBonus}
                    onChange={(e) => setPerformanceBonus(Number(e.target.value))}
                    placeholder="Expected annual"
                  />
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={calculateNetIncome}
            disabled={isCalculating}
            className="w-full"
          >
            {isCalculating ? 'Calculating...' : 'Calculate Net Income'}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {netIncomeData && (
        <>
          {/* Net Income Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CurrencyDollarIcon className="w-5 h-5" />
                Your Take-Home Pay
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-900">
                    {formatCurrency(netIncomeData.netIncome.annual)}
                  </div>
                  <div className="text-sm text-green-600">Annual Take-Home</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-900">
                    {formatCurrency(netIncomeData.netIncome.monthly)}
                  </div>
                  <div className="text-sm text-blue-600">Monthly</div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Effective Tax Rate</div>
                <div className="text-2xl font-bold">
                  {formatPercentage(netIncomeData.taxes.effectiveRate)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Total taxes: {formatCurrency(netIncomeData.taxes.totalTaxes)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5" />
                Tax Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Federal/National Taxes - always show if > 0 */}
                {netIncomeData.taxes.federal.amount > 0 && (
                  <div className="p-3 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">
                          {netIncomeData.taxes.federal.breakdown.socialSecurity > 0 ? 'National Taxes' : 'Federal Taxes'}
                        </div>
                        {netIncomeData.taxes.federal.breakdown.incomeTax > 0 && (
                          <div className="text-sm text-gray-500">
                            Income Tax: {formatCurrency(netIncomeData.taxes.federal.breakdown.incomeTax)}
                          </div>
                        )}
                        {netIncomeData.taxes.federal.breakdown.socialSecurity > 0 && (
                          <div className="text-sm text-gray-500">
                            Social Charges: {formatCurrency(netIncomeData.taxes.federal.breakdown.socialSecurity)}
                          </div>
                        )}
                        {netIncomeData.taxes.federal.breakdown.medicare > 0 && (
                          <div className="text-sm text-gray-500">
                            Other Charges: {formatCurrency(netIncomeData.taxes.federal.breakdown.medicare)}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-red-600">
                          {formatCurrency(netIncomeData.taxes.federal.amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatPercentage(netIncomeData.taxes.federal.rate)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* State/Regional Taxes - only show if > 0 */}
                {netIncomeData.taxes.state.amount > 0 && (
                  <div className="p-3 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">
                          {netIncomeData.taxes.state.stateName} Regional Tax
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-orange-600">
                          {formatCurrency(netIncomeData.taxes.state.amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatPercentage(netIncomeData.taxes.state.rate)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Local Taxes - only show if > 0 */}
                {netIncomeData.taxes.local && netIncomeData.taxes.local.amount > 0 && (
                  <div className="p-3 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">
                          {netIncomeData.taxes.local.locality} Local Tax
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-yellow-600">
                          {formatCurrency(netIncomeData.taxes.local.amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatPercentage(netIncomeData.taxes.local.rate)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Remote Work Considerations */}
          {netIncomeData.remoteWorkConsiderations && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BriefcaseIcon className="w-5 h-5" />
                  Remote Work Tax Considerations
                  <Badge
                    variant={
                      netIncomeData.remoteWorkConsiderations.taxComplexity === 'complex'
                        ? 'destructive'
                        : netIncomeData.remoteWorkConsiderations.taxComplexity === 'moderate'
                        ? 'secondary'
                        : 'default'
                    }
                  >
                    {netIncomeData.remoteWorkConsiderations.taxComplexity} complexity
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {netIncomeData.remoteWorkConsiderations.multiStateTax && (
                  <Alert className="mb-4">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <AlertDescription>
                      Multi-state taxation applies. You may need to file taxes in multiple states.
                    </AlertDescription>
                  </Alert>
                )}

                {netIncomeData.remoteWorkConsiderations.notes && (
                  <div className="space-y-2">
                    {netIncomeData.remoteWorkConsiderations.notes.map((note: string, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-1 h-1 rounded-full bg-blue-500 mt-2" />
                        <p className="text-sm text-gray-700">{note}</p>
                      </div>
                    ))}
                  </div>
                )}

                {netIncomeData.remoteWorkConsiderations.quarterlyEstimates && netIncomeData.remoteWorkConsiderations.quarterlyEstimates > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                    <div className="text-sm text-yellow-800">
                      Estimated quarterly tax payment: {formatCurrency(netIncomeData.remoteWorkConsiderations.quarterlyEstimates)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI Insights */}
          {netIncomeData.insights && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5" />
                  AI Tax Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {netIncomeData.insights.taxOptimizations && netIncomeData.insights.taxOptimizations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Tax Optimization Tips</h4>
                    <div className="space-y-2">
                      {netIncomeData.insights.taxOptimizations.map((tip: string, index: number) => (
                        <div key={index} className="p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-800">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {netIncomeData.insights.takeHomeSummary && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-blue-900">{netIncomeData.insights.takeHomeSummary}</p>
                  </div>
                )}

                {netIncomeData.insights.warnings && netIncomeData.insights.warnings.length > 0 && (
                  <Alert>
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <AlertDescription>
                      {netIncomeData.insights.warnings.join(' • ')}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Total Compensation */}
          {netIncomeData.totalCompensation && (
            <Card>
              <CardHeader>
                <CardTitle>Total Compensation Package</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Base Salary</span>
                    <span className="font-medium">{formatCurrency(netIncomeData.totalCompensation.baseSalary)}</span>
                  </div>
                  {netIncomeData.totalCompensation.benefits > 0 && (
                    <div className="flex justify-between">
                      <span>Benefits Value</span>
                      <span className="font-medium">{formatCurrency(netIncomeData.totalCompensation.benefits)}</span>
                    </div>
                  )}
                  {netIncomeData.totalCompensation.bonuses > 0 && (
                    <div className="flex justify-between">
                      <span>Bonuses</span>
                      <span className="font-medium">{formatCurrency(netIncomeData.totalCompensation.bonuses)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Package</span>
                      <span className="text-green-600">{formatCurrency(netIncomeData.totalCompensation.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>After-Tax Value</span>
                      <span>{formatCurrency(netIncomeData.totalCompensation.totalAfterTax)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}