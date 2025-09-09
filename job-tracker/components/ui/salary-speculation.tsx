'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { 
  InfoIcon,
  MapPinIcon,
  BriefcaseIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
  PlusIcon,
  EditIcon
} from 'lucide-react';

interface SalarySpeculationProps {
  job: any;
  onSalaryAdd?: (salaryData: SalaryData) => void;
}

interface SalaryData {
  type: 'range' | 'fixed' | 'hourly';
  currency: string;
  minAmount?: number;
  maxAmount?: number;
  fixedAmount?: number;
  hourlyRate?: number;
  hoursPerWeek?: number;
}

const currencies = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'CAD', label: 'CAD (C$)', symbol: 'C$' },
  { value: 'AUD', label: 'AUD (A$)', symbol: 'A$' },
  { value: 'JPY', label: 'JPY (¥)', symbol: '¥' },
  { value: 'CHF', label: 'CHF', symbol: 'CHF' },
  { value: 'SEK', label: 'SEK', symbol: 'SEK' },
  { value: 'NOK', label: 'NOK', symbol: 'NOK' },
  { value: 'DKK', label: 'DKK', symbol: 'DKK' },
];

// Smart location logic to determine the best location to display
const getBestLocationForDisplay = (userProfile: any, jobLocation: string) => {
  // Priority 1: Use user's profile location if available
  if (userProfile?.currentCity && userProfile?.currentCountry) {
    return `${userProfile.currentCity}, ${userProfile.currentCountry}`;
  }
  
  if (userProfile?.currentCity) {
    return userProfile.currentCity;
  }
  
  if (userProfile?.currentCountry) {
    return userProfile.currentCountry;
  }
  
  // Priority 2: Use job location but clean it up
  if (jobLocation) {
    const location = jobLocation.toLowerCase();
    
    // Handle remote work variations
    if (location.includes('remote') || location.includes('worldwide')) {
      return 'your area'; // Generic phrase for remote work
    }
    
    // Handle common location formats
    const cleanLocation = jobLocation
      .replace(/\(remote\)/gi, '')
      .replace(/\(hybrid\)/gi, '')
      .replace(/\(on-site\)/gi, '')
      .trim();
    
    if (cleanLocation) {
      return cleanLocation;
    }
  }
  
  // Priority 3: Generic fallback
  return 'your area';
};

// Market-based salary estimates by role and location
const getRoleBasedEstimate = (title: string, location: string) => {
  const normalizedTitle = title.toLowerCase();
  const normalizedLocation = location.toLowerCase();
  
  // Base estimates for common roles (in USD)
  const roleEstimates: Record<string, { min: number; max: number; confidence: number }> = {
    'software engineer': { min: 80000, max: 150000, confidence: 0.8 },
    'full stack': { min: 85000, max: 160000, confidence: 0.8 },
    'frontend': { min: 75000, max: 140000, confidence: 0.8 },
    'backend': { min: 85000, max: 155000, confidence: 0.8 },
    'senior software': { min: 120000, max: 220000, confidence: 0.9 },
    'lead engineer': { min: 140000, max: 250000, confidence: 0.8 },
    'principal engineer': { min: 180000, max: 320000, confidence: 0.7 },
    'data scientist': { min: 95000, max: 175000, confidence: 0.8 },
    'ml engineer': { min: 110000, max: 200000, confidence: 0.8 },
    'devops': { min: 90000, max: 165000, confidence: 0.8 },
    'product manager': { min: 100000, max: 180000, confidence: 0.8 },
    'designer': { min: 70000, max: 130000, confidence: 0.7 },
    'marketing': { min: 55000, max: 110000, confidence: 0.7 },
    'sales': { min: 60000, max: 150000, confidence: 0.6 },
  };
  
  // Location multipliers
  const locationMultipliers: Record<string, number> = {
    'san francisco': 1.6, 'new york': 1.4, 'seattle': 1.3, 'boston': 1.3,
    'los angeles': 1.2, 'chicago': 1.1, 'austin': 1.1, 'denver': 1.0,
    'london': 1.2, 'paris': 1.1, 'berlin': 0.9, 'amsterdam': 1.1,
    'zurich': 1.4, 'stockholm': 1.0, 'copenhagen': 1.1, 'remote': 1.0
  };
  
  // Find matching role
  const matchingRole = Object.keys(roleEstimates).find(role => 
    normalizedTitle.includes(role)
  );
  
  if (!matchingRole) {
    return null;
  }
  
  const baseEstimate = roleEstimates[matchingRole];
  
  // Find location multiplier
  const locationMultiplier = Object.keys(locationMultipliers).find(loc => 
    normalizedLocation.includes(loc)
  ) || 'remote';
  
  const multiplier = locationMultipliers[locationMultiplier] || 1.0;
  
  return {
    min: Math.round(baseEstimate.min * multiplier),
    max: Math.round(baseEstimate.max * multiplier),
    confidence: baseEstimate.confidence * (locationMultiplier === 'remote' ? 0.9 : 1.0),
    role: matchingRole,
    location: locationMultiplier
  };
};

export default function SalarySpeculation({ job, onSalaryAdd }: SalarySpeculationProps) {
  const { token } = useAuth();
  const [showSalaryInput, setShowSalaryInput] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [salaryData, setSalaryData] = useState<SalaryData>({
    type: 'range',
    currency: 'USD',
  });
  
  // Fetch user profile for location data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!token) return;
      
      try {
        const response = await fetch('/api/auth/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setUserProfile(data.profile);
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };
    
    fetchUserProfile();
  }, [token]);
  
  const estimate = getRoleBasedEstimate(job?.title || '', job?.location || '');
  const displayLocation = getBestLocationForDisplay(userProfile, job?.location || '');
  
  const handleSalarySubmit = () => {
    if (onSalaryAdd) {
      onSalaryAdd(salaryData);
    }
    setShowSalaryInput(false);
  };
  
  const formatEstimate = (min: number, max: number, currency: string = 'USD') => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  };
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 border-green-200';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };
  
  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <div className="space-y-6">
      {/* Salary Not Provided Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <AlertTriangleIcon className="w-5 h-5" />
            Salary Information Not Provided
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-amber-700 mb-4">
            This job posting doesn&apos;t include salary information. Based on the role and location, 
            here&apos;s our market-based estimation to help you evaluate the opportunity.
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowSalaryInput(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Known Salary
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Market-Based Estimation */}
      {estimate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUpIcon className="w-5 h-5" />
                Market-Based Salary Estimation
              </div>
              <Badge className={`border font-medium px-3 py-1 ${getConfidenceColor(estimate.confidence)}`}>
                {getConfidenceLabel(estimate.confidence)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Disclaimer */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <InfoIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-blue-800 text-sm">
                  <p className="font-medium mb-2">This is a market estimation, not the actual salary for this position.</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Based on role: &quot;{estimate.role}&quot; in &quot;{estimate.location}&quot;</li>
                    <li>• Derived from industry salary data and location cost adjustments</li>
                    <li>• Actual salary may vary significantly based on experience, company, and benefits</li>
                    <li>• Use this as a rough guideline for salary negotiations</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Estimated Range */}
            <div className="text-center p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600 mb-2">Estimated Salary Range</p>
              <p className="text-3xl font-bold text-green-600 mb-2">
                {formatEstimate(estimate.min, estimate.max)}
              </p>
              <p className="text-sm text-gray-500">
                Based on {Math.round(estimate.confidence * 100)}% confidence level
              </p>
            </div>

            {/* Market Context */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <BriefcaseIcon className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Role Match</p>
                  <p className="text-sm text-gray-600">&quot;{estimate.role}&quot;</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <MapPinIcon className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Location Factor</p>
                  <p className="text-sm text-gray-600">&quot;{estimate.location}&quot; market</p>
                </div>
              </div>
            </div>

            {/* Comfortable Living Recommendation */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="font-medium text-green-800 mb-2">💡 For Comfortable Living</p>
              <p className="text-green-700 text-sm">
                To live comfortably in {displayLocation}, consider negotiating for 
                the higher end of this range (${estimate.max?.toLocaleString()}) or above, 
                especially if you have relevant experience and skills that match the job requirements.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Estimation Available */}
      {!estimate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <InfoIcon className="w-5 h-5" />
              Salary Analysis Unavailable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>Unable to provide salary estimation for this role.</p>
              <p className="text-sm mt-2">Add salary information below to enable comprehensive analysis.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Salary Input Form */}
      {showSalaryInput && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <EditIcon className="w-5 h-5" />
              Add Salary Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="salaryType">Salary Type</Label>
                <Select value={salaryData.type} onValueChange={(value: 'range' | 'fixed' | 'hourly') => 
                  setSalaryData(prev => ({ ...prev, type: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="range">Salary Range</SelectItem>
                    <SelectItem value="fixed">Fixed Salary</SelectItem>
                    <SelectItem value="hourly">Hourly Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select value={salaryData.currency} onValueChange={(value) => 
                  setSalaryData(prev => ({ ...prev, currency: value }))
                }>
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
            </div>

            {salaryData.type === 'range' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minAmount">Minimum Amount</Label>
                  <Input
                    id="minAmount"
                    type="number"
                    placeholder="60000"
                    value={salaryData.minAmount || ''}
                    onChange={(e) => setSalaryData(prev => ({ 
                      ...prev, 
                      minAmount: parseFloat(e.target.value) || 0 
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="maxAmount">Maximum Amount</Label>
                  <Input
                    id="maxAmount"
                    type="number"
                    placeholder="100000"
                    value={salaryData.maxAmount || ''}
                    onChange={(e) => setSalaryData(prev => ({ 
                      ...prev, 
                      maxAmount: parseFloat(e.target.value) || 0 
                    }))}
                  />
                </div>
              </div>
            )}

            {salaryData.type === 'fixed' && (
              <div>
                <Label htmlFor="fixedAmount">Annual Salary</Label>
                <Input
                  id="fixedAmount"
                  type="number"
                  placeholder="80000"
                  value={salaryData.fixedAmount || ''}
                  onChange={(e) => setSalaryData(prev => ({ 
                    ...prev, 
                    fixedAmount: parseFloat(e.target.value) || 0 
                  }))}
                />
              </div>
            )}

            {salaryData.type === 'hourly' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    placeholder="45"
                    value={salaryData.hourlyRate || ''}
                    onChange={(e) => setSalaryData(prev => ({ 
                      ...prev, 
                      hourlyRate: parseFloat(e.target.value) || 0 
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="hoursPerWeek">Hours/Week</Label>
                  <Input
                    id="hoursPerWeek"
                    type="number"
                    placeholder="40"
                    value={salaryData.hoursPerWeek || 40}
                    onChange={(e) => setSalaryData(prev => ({ 
                      ...prev, 
                      hoursPerWeek: parseFloat(e.target.value) || 40 
                    }))}
                  />
                </div>
              </div>
            )}

            <Separator />

            <div className="flex gap-2">
              <Button onClick={handleSalarySubmit} className="flex-1">
                Save Salary Information
              </Button>
              <Button variant="outline" onClick={() => setShowSalaryInput(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}