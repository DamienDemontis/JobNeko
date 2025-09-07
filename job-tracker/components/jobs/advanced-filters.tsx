'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Filter,
  DollarSign,
  MapPin,
  Users,
  Building,
  TrendingUp,
  RotateCcw
} from 'lucide-react';

export interface FilterCriteria {
  // Salary Filters
  salaryMin?: number;
  salaryMax?: number;
  currency: string;
  comfortLevel: string[];
  salaryConfidence: number; // 0-100, minimum confidence in salary data
  
  // Location Filters
  location: string;
  workMode: string[];
  remoteOnly: boolean;
  maxCommute?: number;
  
  // Company & Role Filters
  experienceLevel: string[];
  companySize: string[];
  industry: string[];
  contractType: string[];
  
  // Family-Adjusted Filters
  familyFriendly: boolean;
  parentalLeave: boolean;
  healthInsurance: boolean;
  childcare: boolean;
  
  // Match Filters
  minMatchScore?: number;
  hasRating: boolean;
  applicationStatus: string[];
  
  // Date Filters
  dateRange: string;
  
  // Skills & Requirements
  requiredSkills: string[];
  excludeSkills: string[];
}

interface AdvancedFiltersProps {
  filters: FilterCriteria;
  onFiltersChange: (filters: FilterCriteria) => void;
  onApplyFilters: () => void;
  resultsCount?: number;
}

const defaultFilters: FilterCriteria = {
  currency: 'USD',
  comfortLevel: [],
  salaryConfidence: 50,
  location: '',
  workMode: [],
  remoteOnly: false,
  experienceLevel: [],
  companySize: [],
  industry: [],
  contractType: [],
  familyFriendly: false,
  parentalLeave: false,
  healthInsurance: false,
  childcare: false,
  hasRating: false,
  applicationStatus: [],
  dateRange: 'all',
  requiredSkills: [],
  excludeSkills: []
};

const comfortLevels = [
  { value: 'struggling', label: 'Struggling', color: 'bg-red-100 text-red-800' },
  { value: 'tight', label: 'Tight Budget', color: 'bg-orange-100 text-orange-800' },
  { value: 'comfortable', label: 'Comfortable', color: 'bg-green-100 text-green-800' },
  { value: 'thriving', label: 'Thriving', color: 'bg-blue-100 text-blue-800' },
  { value: 'luxurious', label: 'Luxurious', color: 'bg-purple-100 text-purple-800' }
];

const experienceLevels = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior Level' },
  { value: 'lead', label: 'Lead/Principal' },
  { value: 'executive', label: 'Executive' }
];

const companySizes = [
  { value: 'startup', label: 'Startup (1-10)' },
  { value: 'small', label: 'Small (11-50)' },
  { value: 'medium', label: 'Medium (51-200)' },
  { value: 'large', label: 'Large (201-1000)' },
  { value: 'enterprise', label: 'Enterprise (1000+)' }
];

const workModes = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' }
];

const currencies = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'CAD', label: 'CAD (C$)' },
  { value: 'AUD', label: 'AUD (A$)' }
];

const applicationStatuses = [
  { value: 'not_applied', label: 'Not Applied' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview', label: 'Interview Stage' },
  { value: 'offer', label: 'Offer Received' },
  { value: 'rejected', label: 'Rejected' }
];

export default function AdvancedFilters({
  filters = defaultFilters,
  onFiltersChange,
  onApplyFilters,
  resultsCount
}: AdvancedFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterCriteria>(filters);
  const [activeSection, setActiveSection] = useState<string>('salary');

  const updateFilter = <K extends keyof FilterCriteria>(key: K, value: FilterCriteria[K]) => {
    const updated = { ...localFilters, [key]: value };
    setLocalFilters(updated);
    onFiltersChange(updated);
  };

  const toggleArrayValue = <K extends keyof FilterCriteria>(
    key: K,
    value: string,
    currentArray: string[]
  ) => {
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilter(key, newArray as FilterCriteria[K]);
  };

  const resetFilters = () => {
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.salaryMin || localFilters.salaryMax) count++;
    if (localFilters.comfortLevel.length > 0) count++;
    if (localFilters.location) count++;
    if (localFilters.workMode.length > 0) count++;
    if (localFilters.experienceLevel.length > 0) count++;
    if (localFilters.companySize.length > 0) count++;
    if (localFilters.familyFriendly || localFilters.parentalLeave || localFilters.healthInsurance || localFilters.childcare) count++;
    if (localFilters.minMatchScore) count++;
    if (localFilters.applicationStatus.length > 0) count++;
    return count;
  };

  const FilterSection = ({ id, title, icon: Icon, children }: {
    id: string;
    title: string;
    icon: any;
    children: React.ReactNode;
  }) => (
    <div className="border rounded-lg">
      <button
        onClick={() => setActiveSection(activeSection === id ? '' : id)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span className="font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {getActiveSectionFiltersCount(id) > 0 && (
            <Badge variant="secondary" className="text-xs">
              {getActiveSectionFiltersCount(id)}
            </Badge>
          )}
        </div>
      </button>
      {activeSection === id && (
        <div className="px-4 pb-4 border-t">
          {children}
        </div>
      )}
    </div>
  );

  const getActiveSectionFiltersCount = (sectionId: string): number => {
    switch (sectionId) {
      case 'salary':
        return (localFilters.salaryMin || localFilters.salaryMax ? 1 : 0) +
               localFilters.comfortLevel.length;
      case 'location':
        return (localFilters.location ? 1 : 0) + localFilters.workMode.length + (localFilters.remoteOnly ? 1 : 0);
      case 'company':
        return localFilters.experienceLevel.length + localFilters.companySize.length;
      case 'family':
        return [localFilters.familyFriendly, localFilters.parentalLeave, localFilters.healthInsurance, localFilters.childcare]
          .filter(Boolean).length;
      case 'match':
        return (localFilters.minMatchScore ? 1 : 0) + (localFilters.hasRating ? 1 : 0) + localFilters.applicationStatus.length;
      default:
        return 0;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Advanced Filters
            {getActiveFiltersCount() > 0 && (
              <Badge className="bg-blue-100 text-blue-800">
                {getActiveFiltersCount()} active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button size="sm" onClick={onApplyFilters}>
              Apply {resultsCount !== undefined ? `(${resultsCount})` : ''}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Salary & Comfort Level Filters */}
        <FilterSection id="salary" title="Salary & Living Comfort" icon={DollarSign}>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="salaryMin">Min Salary</Label>
                <Input
                  id="salaryMin"
                  type="number"
                  value={localFilters.salaryMin || ''}
                  onChange={(e) => updateFilter('salaryMin', parseFloat(e.target.value) || undefined)}
                  placeholder="50000"
                />
              </div>
              <div>
                <Label htmlFor="salaryMax">Max Salary</Label>
                <Input
                  id="salaryMax"
                  type="number"
                  value={localFilters.salaryMax || ''}
                  onChange={(e) => updateFilter('salaryMax', parseFloat(e.target.value) || undefined)}
                  placeholder="150000"
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select value={localFilters.currency} onValueChange={(value) => updateFilter('currency', value)}>
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
            
            <div>
              <Label className="mb-3 block">Comfort Level (Family-Adjusted)</Label>
              <div className="flex flex-wrap gap-2">
                {comfortLevels.map(level => {
                  const isSelected = localFilters.comfortLevel.includes(level.value);
                  return (
                    <button
                      key={level.value}
                      onClick={() => toggleArrayValue('comfortLevel', level.value, localFilters.comfortLevel)}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        isSelected
                          ? `${level.color} border-current`
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {level.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Comfort levels are calculated based on family size, dependents, and local cost of living
              </p>
            </div>
            
            <div>
              <Label className="mb-2 block">Salary Data Confidence: {localFilters.salaryConfidence}%</Label>
              <Slider
                value={[localFilters.salaryConfidence]}
                onValueChange={([value]) => updateFilter('salaryConfidence', value)}
                max={100}
                min={0}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Any confidence</span>
                <span>High confidence only</span>
              </div>
            </div>
          </div>
        </FilterSection>

        {/* Location & Work Mode */}
        <FilterSection id="location" title="Location & Work Mode" icon={MapPin}>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={localFilters.location}
                onChange={(e) => updateFilter('location', e.target.value)}
                placeholder="San Francisco, CA"
              />
            </div>
            
            <div>
              <Label className="mb-3 block">Work Mode</Label>
              <div className="flex flex-wrap gap-2">
                {workModes.map(mode => {
                  const isSelected = localFilters.workMode.includes(mode.value);
                  return (
                    <button
                      key={mode.value}
                      onClick={() => toggleArrayValue('workMode', mode.value, localFilters.workMode)}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        isSelected
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remoteOnly"
                checked={localFilters.remoteOnly}
                onCheckedChange={(checked) => updateFilter('remoteOnly', !!checked)}
              />
              <Label htmlFor="remoteOnly">Remote opportunities only</Label>
            </div>
          </div>
        </FilterSection>

        {/* Company & Role */}
        <FilterSection id="company" title="Company & Role" icon={Building}>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="mb-3 block">Experience Level</Label>
              <div className="flex flex-wrap gap-2">
                {experienceLevels.map(level => {
                  const isSelected = localFilters.experienceLevel.includes(level.value);
                  return (
                    <button
                      key={level.value}
                      onClick={() => toggleArrayValue('experienceLevel', level.value, localFilters.experienceLevel)}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        isSelected
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {level.label}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div>
              <Label className="mb-3 block">Company Size</Label>
              <div className="flex flex-wrap gap-2">
                {companySizes.map(size => {
                  const isSelected = localFilters.companySize.includes(size.value);
                  return (
                    <button
                      key={size.value}
                      onClick={() => toggleArrayValue('companySize', size.value, localFilters.companySize)}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        isSelected
                          ? 'bg-purple-100 text-purple-800 border-purple-200'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {size.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </FilterSection>

        {/* Family-Friendly Benefits */}
        <FilterSection id="family" title="Family-Friendly Benefits" icon={Users}>
          <div className="space-y-3 mt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="familyFriendly"
                checked={localFilters.familyFriendly}
                onCheckedChange={(checked) => updateFilter('familyFriendly', !!checked)}
              />
              <Label htmlFor="familyFriendly">Family-friendly culture</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="parentalLeave"
                checked={localFilters.parentalLeave}
                onCheckedChange={(checked) => updateFilter('parentalLeave', !!checked)}
              />
              <Label htmlFor="parentalLeave">Generous parental leave</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="healthInsurance"
                checked={localFilters.healthInsurance}
                onCheckedChange={(checked) => updateFilter('healthInsurance', !!checked)}
              />
              <Label htmlFor="healthInsurance">Comprehensive health insurance</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="childcare"
                checked={localFilters.childcare}
                onCheckedChange={(checked) => updateFilter('childcare', !!checked)}
              />
              <Label htmlFor="childcare">Childcare support/benefits</Label>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              These filters help identify opportunities that better support work-life balance for families
            </p>
          </div>
        </FilterSection>

        {/* Match & Application Status */}
        <FilterSection id="match" title="Match & Application Status" icon={TrendingUp}>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="minMatchScore">Minimum Match Score (%)</Label>
              <Input
                id="minMatchScore"
                type="number"
                min="0"
                max="100"
                value={localFilters.minMatchScore || ''}
                onChange={(e) => updateFilter('minMatchScore', parseFloat(e.target.value) || undefined)}
                placeholder="70"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasRating"
                checked={localFilters.hasRating}
                onCheckedChange={(checked) => updateFilter('hasRating', !!checked)}
              />
              <Label htmlFor="hasRating">Only rated opportunities</Label>
            </div>
            
            <div>
              <Label className="mb-3 block">Application Status</Label>
              <div className="flex flex-wrap gap-2">
                {applicationStatuses.map(status => {
                  const isSelected = localFilters.applicationStatus.includes(status.value);
                  return (
                    <button
                      key={status.value}
                      onClick={() => toggleArrayValue('applicationStatus', status.value, localFilters.applicationStatus)}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        isSelected
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {status.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </FilterSection>
      </CardContent>
    </Card>
  );
}