'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  HomeIcon,
  ShoppingCartIcon,
  TruckIcon,
  HeartIcon,
  BoltIcon,
  FilmIcon,
  BanknotesIcon,
  EllipsisHorizontalIcon,
  CalculatorIcon,
  ChartBarIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface ExpenseCategory {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  defaultPercentage: number;
  minPercentage: number;
  maxPercentage: number;
  description: string;
  tips: string[];
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    key: 'housing',
    label: 'Housing',
    icon: HomeIcon,
    color: 'bg-blue-500',
    defaultPercentage: 30,
    minPercentage: 15,
    maxPercentage: 50,
    description: 'Rent/mortgage, insurance, maintenance',
    tips: ['30% is recommended maximum', 'Consider location and commute costs']
  },
  {
    key: 'food',
    label: 'Food & Groceries',
    icon: ShoppingCartIcon,
    color: 'bg-green-500',
    defaultPercentage: 12,
    minPercentage: 5,
    maxPercentage: 25,
    description: 'Groceries, dining out, meal delivery',
    tips: ['10-15% is typical', 'Cooking at home saves money']
  },
  {
    key: 'transportation',
    label: 'Transportation',
    icon: TruckIcon,
    color: 'bg-purple-500',
    defaultPercentage: 15,
    minPercentage: 5,
    maxPercentage: 30,
    description: 'Car payments, gas, public transit, maintenance',
    tips: ['Varies by location', 'Remote work reduces costs']
  },
  {
    key: 'healthcare',
    label: 'Healthcare',
    icon: HeartIcon,
    color: 'bg-red-500',
    defaultPercentage: 8,
    minPercentage: 3,
    maxPercentage: 20,
    description: 'Insurance, medications, medical expenses',
    tips: ['Check employer coverage', 'HSA can provide tax benefits']
  },
  {
    key: 'utilities',
    label: 'Utilities',
    icon: BoltIcon,
    color: 'bg-yellow-500',
    defaultPercentage: 5,
    minPercentage: 2,
    maxPercentage: 10,
    description: 'Electricity, water, internet, phone',
    tips: ['5-8% is typical', 'Energy efficiency saves money']
  },
  {
    key: 'entertainment',
    label: 'Entertainment',
    icon: FilmIcon,
    color: 'bg-pink-500',
    defaultPercentage: 5,
    minPercentage: 2,
    maxPercentage: 15,
    description: 'Streaming, hobbies, activities, gym',
    tips: ['5-10% is healthy', 'Balance enjoyment and savings']
  },
  {
    key: 'savings',
    label: 'Savings & Investments',
    icon: BanknotesIcon,
    color: 'bg-emerald-500',
    defaultPercentage: 20,
    minPercentage: 5,
    maxPercentage: 40,
    description: 'Emergency fund, retirement, investments',
    tips: ['Aim for 20% minimum', 'Pay yourself first']
  },
  {
    key: 'other',
    label: 'Other & Miscellaneous',
    icon: EllipsisHorizontalIcon,
    color: 'bg-gray-500',
    defaultPercentage: 5,
    minPercentage: 0,
    maxPercentage: 20,
    description: 'Clothing, personal care, unexpected expenses',
    tips: ['Buffer for unexpected costs', 'Track to identify patterns']
  }
];

interface ExpenseProfile {
  [key: string]: {
    percentage: number;
    amount?: number;
  };
}

interface ExpensePreset {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  profile: ExpenseProfile;
}

const EXPENSE_PRESETS: ExpensePreset[] = [
  {
    name: 'Frugal',
    description: 'Maximum savings, minimal spending',
    icon: BanknotesIcon,
    profile: {
      housing: { percentage: 25 },
      food: { percentage: 8 },
      transportation: { percentage: 10 },
      healthcare: { percentage: 5 },
      utilities: { percentage: 4 },
      entertainment: { percentage: 3 },
      savings: { percentage: 40 },
      other: { percentage: 5 }
    }
  },
  {
    name: 'Balanced',
    description: 'Recommended distribution',
    icon: CalculatorIcon,
    profile: {
      housing: { percentage: 30 },
      food: { percentage: 12 },
      transportation: { percentage: 15 },
      healthcare: { percentage: 8 },
      utilities: { percentage: 5 },
      entertainment: { percentage: 5 },
      savings: { percentage: 20 },
      other: { percentage: 5 }
    }
  },
  {
    name: 'Comfortable',
    description: 'Higher quality of life',
    icon: SparklesIcon,
    profile: {
      housing: { percentage: 35 },
      food: { percentage: 15 },
      transportation: { percentage: 15 },
      healthcare: { percentage: 8 },
      utilities: { percentage: 6 },
      entertainment: { percentage: 8 },
      savings: { percentage: 10 },
      other: { percentage: 3 }
    }
  }
];

interface ExpenseBreakdownEditorProps {
  monthlyIncome: number;
  initialProfile?: ExpenseProfile;
  onChange: (profile: ExpenseProfile) => void;
  onSave?: (profile: ExpenseProfile, name?: string) => void;
  className?: string;
  showPresets?: boolean;
  showAdvanced?: boolean;
}

export default function ExpenseBreakdownEditor({
  monthlyIncome,
  initialProfile,
  onChange,
  onSave,
  className,
  showPresets = true,
  showAdvanced = true
}: ExpenseBreakdownEditorProps) {
  const [profile, setProfile] = useState<ExpenseProfile>(() => {
    if (initialProfile) return initialProfile;

    // Default balanced profile
    const defaultProfile: ExpenseProfile = {};
    EXPENSE_CATEGORIES.forEach(cat => {
      defaultProfile[cat.key] = { percentage: cat.defaultPercentage };
    });
    return defaultProfile;
  });

  const [inputMode, setInputMode] = useState<'percentage' | 'amount'>('percentage');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customPresetName, setCustomPresetName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Calculate totals
  const calculateTotals = useCallback(() => {
    let totalPercentage = 0;
    let totalAmount = 0;

    Object.entries(profile).forEach(([key, value]) => {
      totalPercentage += value.percentage;
      totalAmount += value.amount || (monthlyIncome * value.percentage / 100);
    });

    return { totalPercentage, totalAmount };
  }, [profile, monthlyIncome]);

  const { totalPercentage, totalAmount } = calculateTotals();

  // Update a category
  const updateCategory = (key: string, value: number, isPercentage: boolean) => {
    const newProfile = { ...profile };

    if (isPercentage) {
      newProfile[key] = {
        percentage: Math.min(100, Math.max(0, value)),
        amount: Math.round(monthlyIncome * value / 100)
      };
    } else {
      newProfile[key] = {
        percentage: Math.round((value / monthlyIncome) * 100),
        amount: Math.round(value)
      };
    }

    setProfile(newProfile);
    onChange(newProfile);

    // Validate
    const newTotal = Object.values(newProfile).reduce((sum, cat) => sum + cat.percentage, 0);
    if (newTotal > 100) {
      setValidationError('Total exceeds 100%! Adjust other categories.');
    } else if (newTotal < 95) {
      setValidationError('Consider allocating the remaining budget.');
    } else {
      setValidationError(null);
    }
  };

  // Apply preset
  const applyPreset = (preset: ExpensePreset) => {
    setProfile(preset.profile);
    onChange(preset.profile);
    setSelectedPreset(preset.name);
    setValidationError(null);
  };

  // Auto-balance to 100%
  const autoBalance = () => {
    const currentTotal = totalPercentage;
    if (currentTotal === 100) return;

    const newProfile = { ...profile };
    const adjustment = 100 - currentTotal;

    // Adjust savings category to balance
    if (newProfile.savings) {
      const newSavings = newProfile.savings.percentage + adjustment;
      if (newSavings >= 0 && newSavings <= 40) {
        newProfile.savings = {
          percentage: newSavings,
          amount: Math.round(monthlyIncome * newSavings / 100)
        };
      }
    }

    setProfile(newProfile);
    onChange(newProfile);
    setValidationError(null);
  };

  // Save custom preset
  const saveCustomPreset = () => {
    if (!customPresetName.trim()) return;

    if (onSave) {
      onSave(profile, customPresetName);
    }

    // Save to localStorage
    if (typeof window !== 'undefined') {
      const saved = JSON.parse(localStorage.getItem('customExpensePresets') || '[]');
      saved.push({
        name: customPresetName,
        profile,
        timestamp: Date.now()
      });
      localStorage.setItem('customExpensePresets', JSON.stringify(saved));
    }

    setShowSaveDialog(false);
    setCustomPresetName('');
  };

  // Get amount for category
  const getCategoryAmount = (key: string) => {
    const category = profile[key];
    if (!category) return 0;
    return category.amount || Math.round(monthlyIncome * category.percentage / 100);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5" />
                Monthly Expense Breakdown
              </CardTitle>
              <CardDescription>
                Customize your budget allocation (Total Income: ${monthlyIncome.toLocaleString()}/month)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={inputMode} onValueChange={(v) => setInputMode(v as 'percentage' | 'amount')}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="amount">Amount ($)</SelectItem>
                </SelectContent>
              </Select>
              {showAdvanced && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={autoBalance}
                  disabled={totalPercentage === 100}
                >
                  Auto-Balance
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Presets */}
          {showPresets && (
            <div className="mb-6">
              <Label className="text-sm text-gray-600 mb-2 block">Quick Presets</Label>
              <div className="flex gap-2 flex-wrap">
                {EXPENSE_PRESETS.map(preset => {
                  const Icon = preset.icon;
                  return (
                    <Button
                      key={preset.name}
                      variant={selectedPreset === preset.name ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => applyPreset(preset)}
                      className="flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {preset.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Categories */}
          <div className="space-y-4">
            {EXPENSE_CATEGORIES.map(category => {
              const Icon = category.icon;
              const value = profile[category.key]?.percentage || 0;
              const amount = getCategoryAmount(category.key);

              return (
                <div key={category.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn('p-1.5 rounded', category.color)}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <Label className="font-medium">{category.label}</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs">
                              {value}%
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-2 max-w-xs">
                              <p className="font-medium">{category.description}</p>
                              {category.tips.map((tip, i) => (
                                <p key={i} className="text-xs">• {tip}</p>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex items-center gap-2">
                      {inputMode === 'percentage' ? (
                        <Input
                          type="number"
                          value={value}
                          onChange={(e) => updateCategory(category.key, Number(e.target.value), true)}
                          className="w-20 text-right"
                          min={0}
                          max={100}
                        />
                      ) : (
                        <Input
                          type="number"
                          value={amount}
                          onChange={(e) => updateCategory(category.key, Number(e.target.value), false)}
                          className="w-24 text-right"
                          min={0}
                        />
                      )}
                      <span className="text-sm text-gray-500 w-20 text-right">
                        ${amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <Slider
                    value={[value]}
                    onValueChange={([v]) => updateCategory(category.key, v, true)}
                    min={0}
                    max={50}
                    step={1}
                    className="w-full"
                  />
                </div>
              );
            })}
          </div>

          {/* Total and validation */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm text-gray-600">Total Allocated</Label>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-2xl font-bold',
                    totalPercentage === 100 ? 'text-green-600' :
                    totalPercentage > 100 ? 'text-red-600' : 'text-yellow-600'
                  )}>
                    {totalPercentage}%
                  </span>
                  <span className="text-gray-500">
                    (${totalAmount.toLocaleString()})
                  </span>
                </div>
                {validationError && (
                  <p className="text-sm text-red-600">{validationError}</p>
                )}
              </div>

              {/* Save button */}
              {onSave && (
                <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="default"
                      className="flex items-center gap-2"
                      disabled={totalPercentage !== 100}
                    >
                      <BookmarkIcon className="h-4 w-4" />
                      Save Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Expense Profile</DialogTitle>
                      <DialogDescription>
                        Save this budget allocation for future use
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Profile Name</Label>
                        <Input
                          value={customPresetName}
                          onChange={(e) => setCustomPresetName(e.target.value)}
                          placeholder="e.g., City Living Budget"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={saveCustomPreset} disabled={!customPresetName.trim()}>
                        Save
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Visual breakdown */}
          <div className="mt-4">
            <div className="h-8 flex rounded-lg overflow-hidden">
              {EXPENSE_CATEGORIES.map(category => {
                const percentage = profile[category.key]?.percentage || 0;
                if (percentage === 0) return null;

                return (
                  <TooltipProvider key={category.key}>
                    <Tooltip>
                      <TooltipTrigger
                        className={cn(
                          'transition-all duration-300',
                          category.color
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                      <TooltipContent>
                        <p className="font-medium">
                          {category.label}: {percentage}%
                        </p>
                        <p className="text-xs">
                          ${getCategoryAmount(category.key).toLocaleString()}/month
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}