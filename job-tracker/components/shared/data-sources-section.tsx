'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

export interface DataSource {
  title: string;
  url: string;
  type: string;
  relevance: number;
}

interface DataSourcesSectionProps {
  sources: DataSource[];
  defaultExpanded?: boolean;
}

/**
 * Reusable Data Sources Section Component
 * Used across all intelligence tabs (Salary, Location, etc.)
 * Design: Black & white with blue hover effects
 */
export function DataSourcesSection({ sources, defaultExpanded = false }: DataSourcesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <CardTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-gray-600" />
                Data Sources
                <Badge variant="outline" className="text-xs">
                  {sources.length} sources
                </Badge>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sources.map((source, index) => (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-blue-600">
                        {source.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate group-hover:text-blue-500">
                        {source.url}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {source.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {source.relevance}% relevance
                        </Badge>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
