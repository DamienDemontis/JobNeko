'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface AnalysisButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  loadingLabel?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

/**
 * Unified Analysis Button Component
 * Provides consistent styling and behavior for all AI analysis trigger buttons
 * across Salary, Location, Application, and Interview tabs
 */
export function AnalysisButton({
  onClick,
  loading,
  disabled = false,
  icon: Icon,
  label,
  loadingLabel,
  variant = 'default',
  size = 'default',
  className = ''
}: AnalysisButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={loading || disabled}
      variant={variant}
      size={size}
      className={className}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
          {loadingLabel || 'Analyzing...'}
        </>
      ) : (
        <>
          <Icon className="w-4 h-4 mr-2" />
          {label}
        </>
      )}
    </Button>
  );
}
