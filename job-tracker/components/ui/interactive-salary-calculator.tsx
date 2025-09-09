'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Calculator,
  Users,
  MapPin,
  DollarSign,
  TrendingUp,
  Home,
  Baby,
  Heart,
  Briefcase,
  RefreshCw
} from 'lucide-react';

interface InteractiveSalaryCalculatorProps {
  job: any;
}

interface CalculatorInputs {
  salary: number;
  currency: string;
  frequency: string;
  city: string;
  country: string;
  familySize: number;
  dependents: number;
  maritalStatus: string;
  currentSalary: number;
  expectedSalary: number;
  workMode: string;
}

interface CalculationResult {
  grossAnnual: number;
  netAnnual: number;
  monthlyNet: number;
  familyAdjusted: number;
  comfortLevel: string;
  comfortScore: number;
  savingsPotential: number;
  comparisonToExpected: number;
  costOfLivingMultiplier: number;
  breakdown: {
    housing: number;
    food: number;
    transport: number;
    healthcare: number;
    savings: number;
    other: number;
  };
}

const currencies = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'CAD', label: 'CAD (C$)' },
  { value: 'AUD', label: 'AUD (A$)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'CHF', label: 'CHF' },
  { value: 'SEK', label: 'SEK' },
];

const frequencies = [
  { value: 'yearly', label: 'Per Year' },
  { value: 'monthly', label: 'Per Month' },
  { value: 'hourly', label: 'Per Hour' },
];

const maritalStatuses = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'partner', label: 'Partner' },
  { value: 'divorced', label: 'Divorced' },
];

const workModes = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
];

const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getCurrencyRate = (currency: string): number => {
  const rates: { [key: string]: number } = {
    'USD': 1,
    'EUR': 1.08,
    'GBP': 1.27,
    'CAD': 0.74,
    'AUD': 0.67,
    'JPY': 0.0067,
    'CHF': 1.11,
    'SEK': 0.092
  };
  return rates[currency] || 1;
};

const generateDefaultBreakdown = (monthlyNet: number) => ({
  housing: monthlyNet * 0.30,
  food: monthlyNet * 0.15,
  transport: monthlyNet * 0.10,
  healthcare: monthlyNet * 0.08,
  savings: monthlyNet * 0.20,
  other: monthlyNet * 0.17
});

const getComfortLevelColor = (level: string) => {
  switch (level.toLowerCase()) {
    case 'struggling': return 'bg-red-100 text-red-800';
    case 'tight': return 'bg-orange-100 text-orange-800';
    case 'comfortable': return 'bg-green-100 text-green-800';
    case 'thriving': return 'bg-blue-100 text-blue-800';
    case 'luxurious': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const calculateSalaryAnalysis = (inputs: CalculatorInputs): CalculationResult => {
  // Convert salary to annual USD (simplified conversion)
  let annualSalary = inputs.salary;
  if (inputs.frequency === 'monthly') annualSalary *= 12;
  if (inputs.frequency === 'hourly') annualSalary *= 2080; // 40 hours * 52 weeks
  
  // Apply currency conversion (simplified)
  const currencyRates: { [key: string]: number } = {
    'USD': 1,
    'EUR': 1.08,
    'GBP': 1.27,
    'CAD': 0.74,
    'AUD': 0.67,
    'JPY': 0.0067,
    'CHF': 1.11,
    'SEK': 0.092
  };
  
  const grossUSD = annualSalary * (currencyRates[inputs.currency] || 1);
  
  // Calculate net salary (simplified tax calculation)
  const taxRate = 0.27; // 27% average
  const netUSD = grossUSD * (1 - taxRate);
  
  // Family adjustments
  const familyMultiplier = 1 + (inputs.familySize - 1) * 0.15 + inputs.dependents * 0.2;
  const familyAdjustedNet = netUSD / familyMultiplier;
  
  // Cost of living adjustment (simplified)
  const costOfLivingMultiplier = inputs.city.toLowerCase().includes('san francisco') ? 1.64 :
                                 inputs.city.toLowerCase().includes('new york') ? 1.68 :
                                 inputs.city.toLowerCase().includes('london') ? 1.45 :
                                 inputs.city.toLowerCase().includes('zurich') ? 1.55 : 1.0;
  
  const adjustedSalary = familyAdjustedNet / costOfLivingMultiplier;
  
  // Determine comfort level
  let comfortLevel = 'comfortable';
  let comfortScore = 70;
  
  if (adjustedSalary < 40000) {
    comfortLevel = 'struggling';
    comfortScore = 30;
  } else if (adjustedSalary < 60000) {
    comfortLevel = 'tight';
    comfortScore = 50;
  } else if (adjustedSalary < 100000) {
    comfortLevel = 'comfortable';
    comfortScore = 70;
  } else if (adjustedSalary < 150000) {
    comfortLevel = 'thriving';
    comfortScore = 85;
  } else {
    comfortLevel = 'luxurious';
    comfortScore = 95;
  }
  
  // Budget breakdown - percentages must add up to 100%
  const monthlyNet = netUSD / 12;
  const breakdown = {
    housing: monthlyNet * 0.30,      // 30%
    food: monthlyNet * 0.15,         // 15%
    transport: monthlyNet * 0.10,    // 10%
    healthcare: monthlyNet * 0.08,   // 8%
    savings: monthlyNet * 0.20,      // 20%
    other: monthlyNet * 0.17         // 17% (Total: 100%)
  };
  
  return {
    grossAnnual: grossUSD,
    netAnnual: netUSD,
    monthlyNet: monthlyNet,
    familyAdjusted: familyAdjustedNet,
    comfortLevel,
    comfortScore,
    savingsPotential: 20,
    comparisonToExpected: inputs.expectedSalary ? ((grossUSD - inputs.expectedSalary) / inputs.expectedSalary) * 100 : 0,
    costOfLivingMultiplier,
    breakdown
  };
};

export default function InteractiveSalaryCalculator({ job }: InteractiveSalaryCalculatorProps) {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    salary: 0,
    currency: 'USD',
    frequency: 'yearly',
    city: '',
    country: '',
    familySize: 1,
    dependents: 0,
    maritalStatus: 'single',
    currentSalary: 0,
    expectedSalary: 0,
    workMode: 'remote'
  });
  
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Initialize with job data
  useEffect(() => {
    if (job) {
      // Use proper salary parsing instead of naive regex
      let jobSalary = 0;
      if (job.salary) {
        // Extract first number from salary string for calculator
        const numbers = job.salary.match(/[\d,]+/g);
        if (numbers && numbers.length > 0) {
          jobSalary = parseFloat(numbers[0].replace(/,/g, '')) || 0;
        }
      }
      
      const jobLocation = job.location || '';
      const [city, country] = jobLocation.split(',').map((s: string) => s.trim());
      
      setInputs(prev => ({
        ...prev,
        salary: jobSalary,
        city: city || '',
        country: country || '',
        workMode: job.workMode || 'remote'
      }));
    }
  }, [job]);

  const handleCalculate = async () => {
    setIsCalculating(true);
    
    try {
      // Call the real salary analysis API if we have a job ID
      if (job?.id) {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await fetch(`/api/jobs/${job.id}/salary-analysis`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const apiData = await response.json();
            
            if (apiData.hasData) {
              // Transform API data to match our calculator interface
              const calculationResult: CalculationResult = {
                grossAnnual: inputs.salary * (getCurrencyRate(inputs.currency) || 1),
                netAnnual: (apiData.analysis.netSalaryUSD?.min || (inputs.salary * 0.73)),
                monthlyNet: (apiData.analysis.netSalaryUSD?.min || (inputs.salary * 0.73)) / 12,
                familyAdjusted: apiData.analysis.familyAdjustedSalary?.min || inputs.salary,
                comfortLevel: apiData.analysis.comfortLevel || 'comfortable',
                comfortScore: apiData.analysis.comfortScore || 70,
                savingsPotential: apiData.analysis.savingsPotential || 20,
                comparisonToExpected: apiData.familyContext?.comparisonToExpected?.percentage || 0,
                costOfLivingMultiplier: apiData.locationData.costOfLiving?.costOfLivingIndex ? 
                  apiData.locationData.costOfLiving.costOfLivingIndex / 100 : 1.0,
                breakdown: apiData.analysis.breakdown || generateDefaultBreakdown((apiData.analysis.netSalaryUSD?.min || inputs.salary) / 12)
              };
              
              setResult(calculationResult);
              setIsCalculating(false);
              return;
            }
          }
        }
      }
      
      // Fallback to local calculation if API fails or no job ID
      const calculationResult = calculateSalaryAnalysis(inputs);
      setResult(calculationResult);
    } catch (error) {
      console.error('Error calculating salary:', error);
      // Fallback to local calculation on error
      const calculationResult = calculateSalaryAnalysis(inputs);
      setResult(calculationResult);
    }
    
    setIsCalculating(false);
  };

  const updateInput = (field: keyof CalculatorInputs, value: any) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Calculator Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Salary Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Salary Input */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Label htmlFor="salary">Salary Amount</Label>
              <Input
                id="salary"
                type="number"
                value={inputs.salary || ''}
                onChange={(e) => updateInput('salary', parseFloat(e.target.value) || 0)}
                placeholder="120000"
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={inputs.currency} onValueChange={(value) => updateInput('currency', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(curr => (
                    <SelectItem key={curr.value} value={curr.value}>{curr.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={inputs.frequency} onValueChange={(value) => updateInput('frequency', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencies.map(freq => (
                    <SelectItem key={freq.value} value={freq.value}>{freq.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Location */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  placeholder="City"
                  value={inputs.city}
                  onChange={(e) => updateInput('city', e.target.value)}
                />
              </div>
              <div>
                <Input
                  placeholder="Country"
                  value={inputs.country}
                  onChange={(e) => updateInput('country', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="workMode">Work Mode</Label>
              <Select value={inputs.workMode} onValueChange={(value) => updateInput('workMode', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workModes.map(mode => (
                    <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Family Context */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Family Context
            </Label>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="maritalStatus">Marital Status</Label>
                <Select value={inputs.maritalStatus} onValueChange={(value) => updateInput('maritalStatus', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {maritalStatuses.map(status => (
                      <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="familySize">Family Size</Label>
                <Input
                  id="familySize"
                  type="number"
                  min="1"
                  max="10"
                  value={inputs.familySize}
                  onChange={(e) => updateInput('familySize', parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="dependents" className="flex items-center gap-2">
                <Baby className="w-4 h-4" />
                Dependents: {inputs.dependents}
              </Label>
              <Slider
                value={[inputs.dependents]}
                onValueChange={([value]) => updateInput('dependents', value)}
                max={5}
                min={0}
                step={1}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0</span>
                <span>5</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Comparison Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="currentSalary">Current Salary (USD)</Label>
              <Input
                id="currentSalary"
                type="number"
                value={inputs.currentSalary || ''}
                onChange={(e) => updateInput('currentSalary', parseFloat(e.target.value) || 0)}
                placeholder="80000"
              />
            </div>
            <div>
              <Label htmlFor="expectedSalary">Expected Salary (USD)</Label>
              <Input
                id="expectedSalary"
                type="number"
                value={inputs.expectedSalary || ''}
                onChange={(e) => updateInput('expectedSalary', parseFloat(e.target.value) || 0)}
                placeholder="100000"
              />
            </div>
          </div>

          <Button 
            onClick={handleCalculate} 
            className="w-full" 
            disabled={isCalculating || !inputs.salary}
          >
            {isCalculating ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Calculating...</>
            ) : (
              <><Calculator className="w-4 h-4 mr-2" /> Calculate Salary Intelligence</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Calculation Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="text-center py-12 text-gray-500">
              <Calculator className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Configure your parameters and click calculate</p>
              <p className="text-sm mt-1">to see personalized salary intelligence</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-600" />
                  <p className="text-sm font-medium text-gray-600">Gross Annual</p>
                  <p className="text-xl font-bold text-green-700">
                    {formatCurrency(result.grossAnnual)}
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Home className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  <p className="text-sm font-medium text-gray-600">Monthly Net</p>
                  <p className="text-xl font-bold text-blue-700">
                    {formatCurrency(result.monthlyNet)}
                  </p>
                </div>
              </div>

              {/* Comfort Level */}
              <div className="text-center">
                <Badge className={`${getComfortLevelColor(result.comfortLevel)} text-lg px-4 py-2`}>
                  {result.comfortLevel} ({result.comfortScore}/100)
                </Badge>
              </div>

              {/* Family Impact */}
              {inputs.familySize > 1 && (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-purple-800">Family Impact</span>
                  </div>
                  <p className="text-sm text-purple-700">
                    Family-adjusted net income: <span className="font-bold">{formatCurrency(result.familyAdjusted)}</span>
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    Supporting {inputs.familySize === 1 ? '1 family member' : `${inputs.familySize} family members`} with {inputs.dependents === 1 ? '1 dependent' : `${inputs.dependents} dependents`}
                  </p>
                </div>
              )}

              {/* Expected Comparison */}
              {inputs.expectedSalary > 0 && (
                <div className={`p-4 rounded-lg ${
                  result.comparisonToExpected > 0 ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className={`w-5 h-5 ${
                      result.comparisonToExpected > 0 ? 'text-green-600' : 'text-red-600'
                    }`} />
                    <span className={`font-medium ${
                      result.comparisonToExpected > 0 ? 'text-green-800' : 'text-red-800'
                    }`}>vs Expected Salary</span>
                  </div>
                  <p className={`text-sm ${
                    result.comparisonToExpected > 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {result.comparisonToExpected > 0 ? '+' : ''}{result.comparisonToExpected.toFixed(1)}% 
                    {result.comparisonToExpected > 0 ? 'above' : 'below'} your expected salary
                  </p>
                </div>
              )}

              {/* Budget Breakdown */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Monthly Budget Breakdown
                </h4>
                <div className="space-y-2">
                  {Object.entries(result.breakdown).map(([category, amount]) => (
                    <div key={category} className="flex justify-between items-center text-sm">
                      <span className="capitalize text-gray-600">{category}</span>
                      <span className="font-medium">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost of Living Note */}
              {result.costOfLivingMultiplier > 1.2 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800">
                    <span className="font-medium">High cost area:</span> This location has {((result.costOfLivingMultiplier - 1) * 100).toFixed(0)}% higher living costs than average.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}