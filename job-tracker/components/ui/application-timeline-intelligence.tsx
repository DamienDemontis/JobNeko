/**
 * Legacy Application Timeline Intelligence Component
 * NOTE: This component has been replaced by ApplicationTimelineIntelligenceSmart
 * This file is kept for compatibility but should not be used directly
 */

"use client";

import React from 'react';

interface ApplicationTimelineIntelligenceProps {
  jobId: string;
  userId: string;
  jobData: {
    title: string;
    company: string;
    description: string;
    requirements: string;
    applicationDeadline?: Date;
    postedDate?: Date;
  };
}

export default function ApplicationTimelineIntelligence(props: ApplicationTimelineIntelligenceProps) {
  return (
    <div className="p-4 border rounded-lg bg-yellow-50">
      <p className="text-sm text-yellow-700">
        ⚠️ This component has been replaced by ApplicationTimelineIntelligenceSmart.
        Please use the smart version instead.
      </p>
    </div>
  );
}