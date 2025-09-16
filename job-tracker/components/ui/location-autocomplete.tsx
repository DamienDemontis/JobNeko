'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { MapPinIcon, GlobeAltIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import debounce from 'lodash/debounce';

interface Location {
  display: string;
  city: string;
  state?: string;
  country: string;
  countryCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  confidence: number;
  source: 'user' | 'geocoding' | 'popular' | 'recent';
}

interface LocationAutocompleteProps {
  value?: string;
  onChange: (location: Location | string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  popularLocations?: Location[];
  recentLocations?: Location[];
}

// No default locations - all suggestions come from user input only
const DEFAULT_POPULAR_LOCATIONS: Location[] = [];

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder = 'Enter any city, state, country...',
  className,
  disabled = false,
  allowCustom = true,
  popularLocations = DEFAULT_POPULAR_LOCATIONS,
  recentLocations = []
}: LocationAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse user input to create location structure - no hardcoded suggestions
  const parseUserLocation = (query: string): Location[] => {
    if (!query.trim()) return [];

    // Parse the input to create structured location
    const parts = query.split(',').map(p => p.trim());

    // Create primary suggestion from input
    if (parts.length === 3) {
      // City, State, Country format
      return [{
        display: query,
        city: parts[0],
        state: parts[1],
        country: parts[2],
        confidence: 0.9,
        source: 'user'
      }];
    } else if (parts.length === 2) {
      // City, Country format
      return [{
        display: query,
        city: parts[0],
        country: parts[1],
        confidence: 0.8,
        source: 'user'
      }];
    } else {
      // Single part - could be city
      return [{
        display: query,
        city: parts[0],
        country: 'Unknown',
        confidence: 0.6,
        source: 'user'
      }];
    }
  };

  // Search function - only shows user input based suggestions
  const searchLocations = useCallback(
    debounce((query: string) => {
      if (query.length < 1) {
        // Only show recent locations when no input
        setSuggestions(recentLocations.slice(0, 5));
        return;
      }

      setLoading(true);

      try {
        // Parse user input to create suggestions
        const userSuggestions = parseUserLocation(query);

        // Add relevant recent locations
        const filteredRecent = recentLocations.filter(loc =>
          loc.display.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 3);

        const merged = [...userSuggestions, ...filteredRecent];

        // Remove duplicates
        const unique = Array.from(
          new Map(merged.map(loc => [loc.display, loc])).values()
        );

        setSuggestions(unique);
      } catch (error) {
        console.error('Location search error:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 200),
    [recentLocations]
  );

  // Handle input change
  const handleInputChange = (value: string) => {
    setInputValue(value);
    searchLocations(value);
  };

  // Handle location selection
  const handleSelect = (location: Location) => {
    setSelectedLocation(location);
    setInputValue(location.display);
    onChange(location);
    setOpen(false);

    // Save to recent locations in localStorage
    if (typeof window !== 'undefined') {
      const recent = JSON.parse(localStorage.getItem('recentLocations') || '[]');
      const updated = [location, ...recent.filter((l: Location) => l.display !== location.display)].slice(0, 5);
      localStorage.setItem('recentLocations', JSON.stringify(updated));
    }
  };

  // Handle custom location input
  const handleCustomLocation = () => {
    if (allowCustom && inputValue.trim()) {
      const customLocation: Location = {
        display: inputValue,
        city: inputValue.split(',')[0]?.trim() || inputValue,
        country: 'Unknown',
        confidence: 0.5,
        source: 'user'
      };
      handleSelect(customLocation);
    }
  };

  // Clear selection
  const handleClear = () => {
    setInputValue('');
    setSelectedLocation(null);
    onChange('');
    setSuggestions(recentLocations.slice(0, 5));
  };

  // Initialize suggestions on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const recent = JSON.parse(localStorage.getItem('recentLocations') || '[]');
      setSuggestions(recent.slice(0, 5));
    }
  }, []);

  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => setOpen(true)}
              onBlur={(e) => {
                // Only close if we're not clicking on the popover
                if (!e.relatedTarget?.closest('[role="dialog"]')) {
                  setTimeout(() => setOpen(false), 150);
                }
              }}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                'pr-10',
                selectedLocation && 'text-green-700 font-medium'
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && allowCustom && inputValue.trim()) {
                  e.preventDefault();
                  handleCustomLocation();
                }
                if (e.key === 'Escape') {
                  setOpen(false);
                }
              }}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {selectedLocation && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  {Math.round(selectedLocation.confidence * 100)}%
                </Badge>
              )}
              {inputValue && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleClear}
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              )}
              <MapPinIcon className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[400px] p-0"
          align="start"
          onInteractOutside={(e) => {
            // Prevent closing when interacting with the popover content
            if ((e.currentTarget as Element)?.contains(e.target as Node)) {
              e.preventDefault();
            }
          }}
        >
          <Command>
            <CommandList>
              {loading && (
                <CommandEmpty>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                    Searching locations...
                  </div>
                </CommandEmpty>
              )}

              {!loading && suggestions.length === 0 && (
                <CommandEmpty>
                  <div className="text-sm text-gray-500">
                    No locations found.
                    {allowCustom && inputValue && (
                      <Button
                        variant="link"
                        size="sm"
                        className="ml-2"
                        onClick={handleCustomLocation}
                      >
                        Use "{inputValue}" anyway
                      </Button>
                    )}
                  </div>
                </CommandEmpty>
              )}

              {suggestions.length > 0 && (
                <>
                  <CommandGroup heading="Locations">
                    {suggestions.map((location, index) => (
                      <CommandItem
                        key={`${location.display}-${index}`}
                        value={location.display}
                        onSelect={() => handleSelect(location)}
                        className="flex items-center justify-between py-2"
                      >
                        <div className="flex items-center gap-2">
                          {location.source === 'recent' ? (
                            <MapPinIcon className="h-4 w-4 text-blue-500" />
                          ) : location.source === 'popular' ? (
                            <GlobeAltIcon className="h-4 w-4 text-green-500" />
                          ) : (
                            <MapPinIcon className="h-4 w-4 text-gray-400" />
                          )}
                          <div>
                            <div className="font-medium">{location.city}</div>
                            <div className="text-xs text-gray-500">
                              {location.state && `${location.state}, `}{location.country}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {location.source === 'recent' && (
                            <Badge variant="secondary" className="text-xs">
                              Recent
                            </Badge>
                          )}
                          {location.source === 'popular' && (
                            <Badge variant="default" className="text-xs">
                              Popular
                            </Badge>
                          )}
                          <span className="text-xs text-gray-400">
                            {Math.round(location.confidence * 100)}%
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>

                  {allowCustom && inputValue && !suggestions.find(s => s.display === inputValue) && (
                    <CommandGroup heading="Custom">
                      <CommandItem
                        value={inputValue}
                        onSelect={handleCustomLocation}
                        className="flex items-center gap-2 py-2"
                      >
                        <MapPinIcon className="h-4 w-4 text-orange-500" />
                        <div>
                          <div className="font-medium">Use custom location</div>
                          <div className="text-xs text-gray-500">"{inputValue}"</div>
                        </div>
                      </CommandItem>
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}