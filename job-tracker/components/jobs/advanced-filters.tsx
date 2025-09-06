'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  SlidersHorizontal, 
  DollarSign, 
  MapPin, 
  Briefcase, 
  Calendar,
  Heart,
  Code2,
  Building2,
  Clock,
  Sparkles,
  TrendingUp,
  Globe,
  Home,
  Users,
  Target,
  Award,
  Filter,
  X
} from 'lucide-react';
import { analyzeSalary, getComfortColor, getComfortIcon } from '@/lib/salary-intelligence';

export interface JobFilters {
  // Salary & Compensation
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  comfortLevel?: string[];
  includeEquity?: boolean;
  
  // Location & Work Mode
  workMode?: ('remote' | 'hybrid' | 'onsite')[];
  locations?: string[];
  visaSponsorship?: boolean;
  relocationAssistance?: boolean;
  
  // Experience & Level
  experienceLevel?: ('entry' | 'mid' | 'senior' | 'lead' | 'principal' | 'executive')[];
  yearsOfExperience?: { min: number; max: number };
  
  // Company
  companySize?: ('startup' | 'small' | 'medium' | 'large' | 'enterprise')[];
  industries?: string[];
  companyStage?: ('seed' | 'series-a' | 'series-b' | 'series-c' | 'public' | 'profitable')[];
  
  // Job Type & Status
  contractType?: ('full-time' | 'part-time' | 'contract' | 'internship')[];
  applicationStatus?: string[];
  priority?: ('low' | 'medium' | 'high')[];
  
  // Dates
  postedWithin?: number; // days
  applicationDeadline?: { from: Date; to: Date };
  
  // Skills & Match
  requiredSkills?: string[];
  preferredSkills?: string[];
  matchScoreMin?: number;
  
  // Benefits & Culture
  benefitsScore?: number; // 0-100
  workLifeBalance?: ('flexible' | 'standard' | 'demanding')[];
  ptoMin?: number; // days
  hasRemoteStipend?: boolean;
  has401k?: boolean;
  hasHealthInsurance?: boolean;
  
  // Smart Filters
  onlyShowBetterThanCurrent?: boolean;
  hideApplied?: boolean;
  hideRejected?: boolean;
  onlyFavorites?: boolean;
}

interface AdvancedFiltersProps {
  filters: JobFilters;
  onFiltersChange: (filters: JobFilters) => void;
  jobCount?: number;
  currentSalary?: number;
  skills?: string[];
}

export default function AdvancedFilters({ 
  filters, 
  onFiltersChange, 
  jobCount = 0,
  currentSalary,
  skills = []
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('salary');

  const updateFilter = (key: keyof JobFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = Object.keys(filters).filter(key => 
    filters[key as keyof JobFilters] !== undefined && 
    filters[key as keyof JobFilters] !== null
  ).length;

  // Salary comfort levels
  const comfortLevels = [
    { value: 'struggling', label: 'Struggling', icon: '😰', color: 'bg-red-100 text-red-700 border-red-300' },
    { value: 'tight', label: 'Tight', icon: '😓', color: 'bg-orange-100 text-orange-700 border-orange-300' },
    { value: 'comfortable', label: 'Comfortable', icon: '😊', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { value: 'thriving', label: 'Thriving', icon: '😄', color: 'bg-green-100 text-green-700 border-green-300' },
    { value: 'luxurious', label: 'Luxurious', icon: '🤩', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  ];

  // Experience levels
  const experienceLevels = [
    { value: 'entry', label: 'Entry Level', years: '0-2' },
    { value: 'mid', label: 'Mid Level', years: '2-5' },
    { value: 'senior', label: 'Senior', years: '5-8' },
    { value: 'lead', label: 'Lead/Staff', years: '8-12' },
    { value: 'principal', label: 'Principal', years: '12+' },
    { value: 'executive', label: 'Executive', years: '15+' },
  ];

  // Company sizes
  const companySizes = [
    { value: 'startup', label: 'Startup', employees: '1-50', icon: '🚀' },
    { value: 'small', label: 'Small', employees: '50-200', icon: '🏢' },
    { value: 'medium', label: 'Medium', employees: '200-1000', icon: '🏛️' },
    { value: 'large', label: 'Large', employees: '1000-5000', icon: '🏙️' },
    { value: 'enterprise', label: 'Enterprise', employees: '5000+', icon: '🌆' },
  ];

  return (
    <Card className="border-2 border-gray-100 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <SlidersHorizontal className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Smart Filters</CardTitle>
              <CardDescription>
                {activeFilterCount > 0 ? (
                  <span className="text-blue-600 font-medium">
                    {activeFilterCount} active filters • {jobCount} matching jobs
                  </span>
                ) : (
                  `${jobCount} total jobs`
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearFilters}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-1" />
                Clear all
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="salary" className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline">Salary</span>
              </TabsTrigger>
              <TabsTrigger value="location" className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">Location</span>
              </TabsTrigger>
              <TabsTrigger value="experience" className="flex items-center gap-1">
                <Award className="w-4 h-4" />
                <span className="hidden sm:inline">Level</span>
              </TabsTrigger>
              <TabsTrigger value="company" className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">Company</span>
              </TabsTrigger>
              <TabsTrigger value="benefits" className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline">Benefits</span>
              </TabsTrigger>
            </TabsList>

            {/* Salary & Compensation Tab */}
            <TabsContent value="salary" className="space-y-4 mt-6">
              <div>
                <Label className="text-sm font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Salary Comfort Level
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {comfortLevels.map(level => (
                    <button
                      key={level.value}
                      onClick={() => {
                        const current = filters.comfortLevel || [];
                        if (current.includes(level.value)) {
                          updateFilter('comfortLevel', current.filter(l => l !== level.value));
                        } else {
                          updateFilter('comfortLevel', [...current, level.value]);
                        }
                      }}
                      className={`
                        p-3 rounded-lg border-2 transition-all text-sm font-medium
                        ${filters.comfortLevel?.includes(level.value) 
                          ? level.color + ' border-current shadow-md scale-105' 
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{level.icon}</span>
                        <span>{level.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3">
                  Salary Range (USD equivalent)
                </Label>
                <div className="px-2">
                  <Slider
                    value={[filters.salaryMin || 0, filters.salaryMax || 500000]}
                    onValueChange={([min, max]) => {
                      updateFilter('salaryMin', min);
                      updateFilter('salaryMax', max);
                    }}
                    max={500000}
                    step={10000}
                    className="mb-2"
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>${(filters.salaryMin || 0).toLocaleString()}</span>
                    <span>${(filters.salaryMax || 500000).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {currentSalary && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Target className="w-5 h-5 text-blue-600" />
                  <Label className="text-sm font-medium cursor-pointer">
                    Only show jobs better than current (${currentSalary.toLocaleString()})
                  </Label>
                  <Switch
                    checked={filters.onlyShowBetterThanCurrent || false}
                    onCheckedChange={(checked) => updateFilter('onlyShowBetterThanCurrent', checked)}
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <Switch
                  checked={filters.includeEquity || false}
                  onCheckedChange={(checked) => updateFilter('includeEquity', checked)}
                />
                <Label className="text-sm cursor-pointer">Include equity compensation</Label>
              </div>
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location" className="space-y-4 mt-6">
              <div>
                <Label className="text-sm font-medium mb-3">Work Mode</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'remote', label: 'Remote', icon: <Globe className="w-4 h-4" /> },
                    { value: 'hybrid', label: 'Hybrid', icon: <Home className="w-4 h-4" /> },
                    { value: 'onsite', label: 'On-site', icon: <Building2 className="w-4 h-4" /> },
                  ].map(mode => (
                    <button
                      key={mode.value}
                      onClick={() => {
                        const current = filters.workMode || [];
                        if (current.includes(mode.value as any)) {
                          updateFilter('workMode', current.filter(m => m !== mode.value));
                        } else {
                          updateFilter('workMode', [...current, mode.value]);
                        }
                      }}
                      className={`
                        p-3 rounded-lg border-2 transition-all
                        ${filters.workMode?.includes(mode.value as any)
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                        }
                      `}
                    >
                      <div className="flex flex-col items-center gap-2">
                        {mode.icon}
                        <span className="text-sm font-medium">{mode.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={filters.visaSponsorship || false}
                    onCheckedChange={(checked) => updateFilter('visaSponsorship', checked)}
                  />
                  <Label className="text-sm cursor-pointer">Visa sponsorship available</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={filters.relocationAssistance || false}
                    onCheckedChange={(checked) => updateFilter('relocationAssistance', checked)}
                  />
                  <Label className="text-sm cursor-pointer">Relocation assistance</Label>
                </div>
              </div>
            </TabsContent>

            {/* Experience Level Tab */}
            <TabsContent value="experience" className="space-y-4 mt-6">
              <div>
                <Label className="text-sm font-medium mb-3">Experience Level</Label>
                <div className="grid grid-cols-2 gap-2">
                  {experienceLevels.map(level => (
                    <button
                      key={level.value}
                      onClick={() => {
                        const current = filters.experienceLevel || [];
                        if (current.includes(level.value as any)) {
                          updateFilter('experienceLevel', current.filter(l => l !== level.value));
                        } else {
                          updateFilter('experienceLevel', [...current, level.value]);
                        }
                      }}
                      className={`
                        p-3 rounded-lg border-2 transition-all text-left
                        ${filters.experienceLevel?.includes(level.value as any)
                          ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                        }
                      `}
                    >
                      <div className="font-medium text-sm">{level.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{level.years} years</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3">Years of Experience</Label>
                <div className="px-2">
                  <Slider
                    value={[
                      filters.yearsOfExperience?.min || 0,
                      filters.yearsOfExperience?.max || 20
                    ]}
                    onValueChange={([min, max]) => {
                      updateFilter('yearsOfExperience', { min, max });
                    }}
                    max={20}
                    step={1}
                    className="mb-2"
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{filters.yearsOfExperience?.min || 0} years</span>
                    <span>{filters.yearsOfExperience?.max || 20}+ years</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Company Tab */}
            <TabsContent value="company" className="space-y-4 mt-6">
              <div>
                <Label className="text-sm font-medium mb-3">Company Size</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {companySizes.map(size => (
                    <button
                      key={size.value}
                      onClick={() => {
                        const current = filters.companySize || [];
                        if (current.includes(size.value as any)) {
                          updateFilter('companySize', current.filter(s => s !== size.value));
                        } else {
                          updateFilter('companySize', [...current, size.value]);
                        }
                      }}
                      className={`
                        p-3 rounded-lg border-2 transition-all text-left
                        ${filters.companySize?.includes(size.value as any)
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{size.icon}</span>
                        <span className="font-medium text-sm">{size.label}</span>
                      </div>
                      <div className="text-xs text-gray-500">{size.employees}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3">Company Stage</Label>
                <div className="flex flex-wrap gap-2">
                  {['seed', 'series-a', 'series-b', 'series-c', 'public', 'profitable'].map(stage => (
                    <Badge
                      key={stage}
                      variant={filters.companyStage?.includes(stage as any) ? 'default' : 'outline'}
                      className="cursor-pointer py-1.5 px-3"
                      onClick={() => {
                        const current = filters.companyStage || [];
                        if (current.includes(stage as any)) {
                          updateFilter('companyStage', current.filter(s => s !== stage));
                        } else {
                          updateFilter('companyStage', [...current, stage]);
                        }
                      }}
                    >
                      {stage.charAt(0).toUpperCase() + stage.slice(1).replace('-', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Benefits Tab */}
            <TabsContent value="benefits" className="space-y-4 mt-6">
              <div>
                <Label className="text-sm font-medium mb-3">Work-Life Balance</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'flexible', label: 'Flexible', icon: '😌', color: 'text-green-600 bg-green-50' },
                    { value: 'standard', label: 'Standard', icon: '🙂', color: 'text-blue-600 bg-blue-50' },
                    { value: 'demanding', label: 'Demanding', icon: '😤', color: 'text-orange-600 bg-orange-50' },
                  ].map(balance => (
                    <button
                      key={balance.value}
                      onClick={() => {
                        const current = filters.workLifeBalance || [];
                        if (current.includes(balance.value as any)) {
                          updateFilter('workLifeBalance', current.filter(b => b !== balance.value));
                        } else {
                          updateFilter('workLifeBalance', [...current, balance.value]);
                        }
                      }}
                      className={`
                        p-3 rounded-lg border-2 transition-all
                        ${filters.workLifeBalance?.includes(balance.value as any)
                          ? `border-current ${balance.color} shadow-md` 
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                        }
                      `}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xl">{balance.icon}</span>
                        <span className="text-xs font-medium">{balance.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={filters.hasHealthInsurance || false}
                    onCheckedChange={(checked) => updateFilter('hasHealthInsurance', checked)}
                  />
                  <Label className="text-sm cursor-pointer">Health insurance</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={filters.has401k || false}
                    onCheckedChange={(checked) => updateFilter('has401k', checked)}
                  />
                  <Label className="text-sm cursor-pointer">401(k) matching</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={filters.hasRemoteStipend || false}
                    onCheckedChange={(checked) => updateFilter('hasRemoteStipend', checked)}
                  />
                  <Label className="text-sm cursor-pointer">Remote work stipend</Label>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3">
                  Minimum PTO Days: {filters.ptoMin || 15}
                </Label>
                <Slider
                  value={[filters.ptoMin || 15]}
                  onValueChange={([value]) => updateFilter('ptoMin', value)}
                  max={40}
                  step={5}
                  className="mb-2"
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Quick Filters */}
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium mb-3 block">Quick Filters</Label>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={filters.hideApplied ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => updateFilter('hideApplied', !filters.hideApplied)}
              >
                Hide Applied
              </Badge>
              <Badge
                variant={filters.hideRejected ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => updateFilter('hideRejected', !filters.hideRejected)}
              >
                Hide Rejected
              </Badge>
              <Badge
                variant={filters.onlyFavorites ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => updateFilter('onlyFavorites', !filters.onlyFavorites)}
              >
                <Heart className="w-3 h-3 mr-1" />
                Favorites Only
              </Badge>
              <Badge
                variant={filters.matchScoreMin ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => updateFilter('matchScoreMin', filters.matchScoreMin ? undefined : 70)}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                High Match (70%+)
              </Badge>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}