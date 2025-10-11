# Shared Intelligence Components

Reusable components for all intelligence tabs (Salary, Location, Application Strategy, etc.)

## Design Principles

- **Black & White Theme**: Minimal color usage - white cards, gray borders, colored icons only
- **No Hardcoded Values**: All data must come from real AI analysis or web searches
- **No Fallbacks**: Throw errors instead of using default values
- **Responsive**: Mobile-first design with proper grid breakpoints
- **Consistent**: Same styling across all intelligence tabs

## Components

### 1. DataSourcesSection

**Purpose**: Display collapsible list of web sources with clickable links

**Usage**:
```tsx
import { DataSourcesSection, DataSource } from '@/components/shared/data-sources-section';

const sources: DataSource[] = [
  {
    title: "Source Title",
    url: "https://example.com",
    type: "Salary Data",  // Or "Cost of Living", "Quality of Life", etc.
    relevance: 95  // 0-100
  }
];

<DataSourcesSection sources={sources} defaultExpanded={false} />
```

**Features**:
- 2-column grid on desktop, 1-column on mobile
- Hover effects (blue text, blue border)
- External link icon
- Relevance percentage badge
- Type badge
- URL truncation

### 2. QualityMetricGrid

**Purpose**: Display metrics with progress bars in responsive grid

**Usage**:
```tsx
import { QualityMetricGrid, QualityMetric } from '@/components/shared/quality-metric-grid';
import { Heart, Shield } from 'lucide-react';

const metrics: QualityMetric[] = [
  {
    key: 'healthcare',
    label: 'Healthcare',
    value: 85,  // 0-100
    icon: Heart  // Optional
  },
  {
    key: 'safety',
    label: 'Safety',
    value: 90,
    icon: Shield
  }
];

<QualityMetricGrid metrics={metrics} columns={3} />
```

**Features**:
- Responsive grid (1/2/3/4 columns)
- Progress bars with value
- Optional icons
- Clean black & white design

### 3. InfoGrid

**Purpose**: Display key-value pairs in responsive grid

**Usage**:
```tsx
import { InfoGrid, InfoItem } from '@/components/shared/info-grid';

const info: InfoItem[] = [
  { label: 'Region', value: 'East Asia' },
  { label: 'Timezone', value: 'KST' },
  { label: 'Cost Index', value: '67/100' },
  { label: 'Quality Score', value: '75/100' }
];

<InfoGrid items={info} columns={4} centered={false} />
```

**Features**:
- Responsive grid (2/3/4 columns)
- Optional centering
- Gray labels, bold values
- ReactNode support for custom values

## Migration Guide

### Before (Old Pattern):
```tsx
{/* Manual grid with inline styling */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <div className="text-center p-4 bg-blue-50 rounded-lg">
    <div className="text-gray-600">Region</div>
    <div className="font-semibold">East Asia</div>
  </div>
  {/* Repeat for each item... */}
</div>
```

### After (Shared Components):
```tsx
{/* Clean, reusable component */}
<InfoGrid items={locationInfo} columns={4} />
```

## Benefits

1. **Consistency**: Same design across all tabs
2. **DRY**: Don't repeat yourself - reuse components
3. **Maintainability**: Fix once, apply everywhere
4. **Type Safety**: TypeScript interfaces ensure correct usage
5. **Accessibility**: Built-in best practices
6. **Performance**: Optimized rendering

## Future Tabs

When creating new intelligence tabs:

1. Import shared components
2. Prepare data in correct format (DataSource[], QualityMetric[], InfoItem[])
3. Use components instead of custom grids
4. Follow black & white design system
5. No hardcoded or fallback values

## Color Usage

Only use color for:
- Icon colors (green for money, blue for location, red for heart, etc.)
- Status badges (green/blue/yellow/red for ratings)
- Hover effects (blue text/border)

**Never** use colored backgrounds on cards or sections (except hover states).
