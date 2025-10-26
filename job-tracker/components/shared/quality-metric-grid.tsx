'use client';

import { Progress } from '@/components/ui/progress';
import { LucideIcon } from 'lucide-react';

export interface QualityMetric {
  key: string;
  label: string;
  value: number;
  icon?: LucideIcon;
}

interface QualityMetricGridProps {
  metrics: QualityMetric[];
  columns?: 2 | 3 | 4;
}

/**
 * Reusable Quality Metric Grid Component
 * Displays metrics with progress bars in a responsive grid
 * Design: Black & white with progress bar colors based on value
 */
export function QualityMetricGrid({ metrics, columns = 3 }: QualityMetricGridProps) {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4'
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4`}>
      {metrics.map(({ key, label, value, icon: Icon }) => (
        <div key={key} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="w-4 h-4 text-gray-600" />}
              <span className="text-sm font-medium">{label}</span>
            </div>
            <span className="text-sm font-medium">{value}/100</span>
          </div>
          <Progress value={value} className="h-2" />
        </div>
      ))}
    </div>
  );
}
