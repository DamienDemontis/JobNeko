'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableSectionProps {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'detailed' | 'expert';
  showInViewMode?: 'simple' | 'detailed' | 'expert';
  currentViewMode?: 'simple' | 'detailed' | 'expert';
}

export function ExpandableSection({ 
  title, 
  icon: Icon, 
  defaultExpanded = false, 
  children,
  className = '',
  variant = 'default',
  showInViewMode = 'simple',
  currentViewMode = 'simple'
}: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Don't render if current view mode doesn't match required view mode
  if (currentViewMode === 'simple' && showInViewMode !== 'simple') return null;
  if (currentViewMode === 'detailed' && !['simple', 'detailed'].includes(showInViewMode)) return null;
  // Expert mode shows everything

  const borderColors = {
    default: 'border-gray-200',
    detailed: 'border-blue-200',
    expert: 'border-purple-200'
  };

  const headerColors = {
    default: 'bg-gray-50',
    detailed: 'bg-blue-50',
    expert: 'bg-purple-50'
  };

  return (
    <Card className={`${borderColors[variant]} ${className}`}>
      <CardHeader 
        className={`${headerColors[variant]} cursor-pointer`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {Icon && <Icon className="w-5 h-5" />}
            {title}
          </CardTitle>
          <Button variant="ghost" size="sm">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
}