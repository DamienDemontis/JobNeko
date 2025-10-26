'use client';

import React from 'react';

interface MatchScoreDonutProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

// Utility function to get color class based on score (exported for use in other components)
export function getScoreColorClass(score: number): string {
  if (score >= 90) return 'text-emerald-600';
  if (score >= 80) return 'text-green-600';
  if (score >= 70) return 'text-lime-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 50) return 'text-orange-600';
  if (score >= 40) return 'text-red-600';
  return 'text-red-800';
}

export function MatchScoreDonut({ score, size = 80, strokeWidth = 12 }: MatchScoreDonutProps) {
  const roundedScore = Math.round(score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (roundedScore / 100) * circumference;

  // Progressive color based on score - more gentle colors
  const getColor = (score: number) => {
    if (score >= 90) return '#059669'; // emerald-600 - excellent
    if (score >= 80) return '#16a34a'; // green-600 - very good
    if (score >= 70) return '#65a30d'; // lime-600 - good
    if (score >= 60) return '#ca8a04'; // yellow-600 - decent
    if (score >= 50) return '#ea580c'; // orange-600 - fair
    if (score >= 40) return '#dc2626'; // red-600 - poor
    return '#991b1b'; // red-800 - very poor
  };

  const getColorClass = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-lime-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    if (score >= 40) return 'text-red-600';
    return 'text-red-800';
  };

  // Export helper for use in other components
  const colorClass = getColorClass(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f3f4f6"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor(roundedScore)}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Score text in center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={`${size > 60 ? 'text-lg' : 'text-sm'} font-bold ${getColorClass(roundedScore)} leading-none`}>
          {roundedScore}%
        </div>
        <div className={`${size > 60 ? 'text-xs' : 'text-[10px]'} text-gray-500 ${size > 60 ? 'mt-0.5' : ''}`}>
          match
        </div>
      </div>
    </div>
  );
}