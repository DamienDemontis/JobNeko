'use client';

import { ReactNode } from 'react';

export interface InfoItem {
  label: string;
  value: string | ReactNode;
}

interface InfoGridProps {
  items: InfoItem[];
  columns?: 2 | 3 | 4;
  centered?: boolean;
}

/**
 * Reusable Info Grid Component
 * Displays key-value pairs in a responsive grid
 * Design: Black & white with clean layout
 */
export function InfoGrid({ items, columns = 4, centered = false }: InfoGridProps) {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4'
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 text-sm`}>
      {items.map((item, index) => (
        <div key={index} className={centered ? 'text-center' : ''}>
          <div className="text-gray-600 mb-1">{item.label}</div>
          <div className="font-medium">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
