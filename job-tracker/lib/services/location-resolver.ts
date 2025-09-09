import { findCountry, findRegionDefault, isMajorCity, NUMBEO_COUNTRIES } from '@/lib/numbeo-countries'

export interface LocationResolution {
  city: string
  country: string
  state?: string
  isRemote: boolean
  confidence: number
  originalInput: string
  resolvedBy: 'exact_match' | 'region_mapping' | 'major_city' | 'user_profile' | 'fallback' | 'remote_default'
  alternatives?: LocationResolution[]
  warnings?: string[]
}

export interface UserLocationProfile {
  currentLocation?: string
  currentCountry?: string
  currentState?: string
  timezone?: string
  preferredWorkLocations?: string[]
}

export interface JobLocationContext {
  jobLocation?: string
  workMode?: 'remote' | 'hybrid' | 'onsite'
  company?: string
  jobTitle?: string
  isInternational?: boolean
}

class LocationResolver {
  private remoteKeywords = [
    'remote', 'anywhere', 'worldwide', 'global', 'virtual', 'distributed',
    'work from home', 'wfh', 'telecommute', 'home office', 'location independent',
    'nomad friendly', 'fully remote', 'remote-first', 'remote work'
  ]

  private hybridKeywords = [
    'hybrid', 'flexible', 'part remote', 'remote option', 'flexible location',
    'office optional', 'mixed', 'partial remote'
  ]

  private vagueLocationKeywords = [
    'usa', 'us', 'united states', 'america', 'europe', 'eu', 'asia pacific',
    'apac', 'north america', 'latin america', 'middle east', 'africa',
    'worldwide', 'global', 'international', 'multiple locations'
  ]

  /**
   * Enhanced location resolution with comprehensive fallback strategies
   */
  async resolveLocation(
    jobContext: JobLocationContext,
    userProfile?: UserLocationProfile
  ): Promise<LocationResolution> {
    const jobLocation = jobContext.jobLocation?.trim() || ''
    const workMode = jobContext.workMode
    const warnings: string[] = []
    const alternatives: LocationResolution[] = []

    // 1. Handle explicit remote jobs
    if (this.isRemoteJob(jobLocation, workMode)) {
      return this.resolveRemoteJob(jobLocation, userProfile, jobContext)
    }

    // 2. Handle hybrid jobs
    if (this.isHybridJob(jobLocation, workMode)) {
      return this.resolveHybridJob(jobLocation, userProfile, jobContext)
    }

    // 3. Handle vague/region-based locations
    if (this.isVagueLocation(jobLocation)) {
      return this.resolveVagueLocation(jobLocation, userProfile, jobContext)
    }

    // 4. Parse structured location string
    const structuredResult = this.parseStructuredLocation(jobLocation)
    if (structuredResult) {
      return structuredResult
    }

    // 5. Try major city matching
    const cityResult = this.resolveMajorCity(jobLocation)
    if (cityResult) {
      return cityResult
    }

    // 6. Company headquarters fallback
    if (jobContext.company) {
      const hqResult = await this.resolveCompanyHeadquarters(jobContext.company, jobLocation)
      if (hqResult) {
        warnings.push('Location inferred from company headquarters')
        return { ...hqResult, warnings }
      }
    }

    // 7. Final fallback to user profile or global remote
    return this.resolveFallback(jobLocation, userProfile, warnings)
  }

  /**
   * Determine if this is a remote job
   */
  private isRemoteJob(location: string, workMode?: string): boolean {
    if (workMode === 'remote') return true
    
    const normalizedLocation = location.toLowerCase()
    return this.remoteKeywords.some(keyword => 
      normalizedLocation.includes(keyword)
    )
  }

  /**
   * Determine if this is a hybrid job
   */
  private isHybridJob(location: string, workMode?: string): boolean {
    if (workMode === 'hybrid') return true
    
    const normalizedLocation = location.toLowerCase()
    return this.hybridKeywords.some(keyword => 
      normalizedLocation.includes(keyword)
    )
  }

  /**
   * Determine if this is a vague location
   */
  private isVagueLocation(location: string): boolean {
    const normalizedLocation = location.toLowerCase()
    return this.vagueLocationKeywords.some(keyword => 
      normalizedLocation === keyword || 
      normalizedLocation.includes(keyword + ' ') ||
      normalizedLocation.includes(' ' + keyword)
    )
  }

  /**
   * Resolve remote job location
   */
  private resolveRemoteJob(
    location: string,
    userProfile?: UserLocationProfile,
    jobContext?: JobLocationContext
  ): LocationResolution {
    // Use user's current location as base for remote work calculations
    if (userProfile?.currentLocation && userProfile?.currentCountry) {
      return {
        city: userProfile.currentLocation,
        country: userProfile.currentCountry,
        state: userProfile.currentState,
        isRemote: true,
        confidence: 0.9,
        originalInput: location,
        resolvedBy: 'user_profile',
        warnings: ['Using your profile location for remote job cost calculations']
      }
    }

    // Check if there's any location hint in the remote job posting
    const locationHints = this.extractLocationHints(location)
    if (locationHints.length > 0) {
      const bestHint = locationHints[0]
      return {
        city: bestHint.city,
        country: bestHint.country,
        state: bestHint.state,
        isRemote: true,
        confidence: 0.7,
        originalInput: location,
        resolvedBy: 'exact_match',
        warnings: ['Remote job with location preference detected']
      }
    }

    // Default remote location
    return {
      city: 'Remote',
      country: 'Global',
      isRemote: true,
      confidence: 0.5,
      originalInput: location,
      resolvedBy: 'remote_default',
      warnings: ['Add your location to profile for more accurate cost analysis']
    }
  }

  /**
   * Resolve hybrid job location
   */
  private resolveHybridJob(
    location: string,
    userProfile?: UserLocationProfile,
    jobContext?: JobLocationContext
  ): LocationResolution {
    // For hybrid jobs, try to find the office location
    const cleanLocation = location
      .replace(/hybrid|flexible|remote option/gi, '')
      .replace(/[,\-\(\)]/g, ' ')
      .trim()

    if (cleanLocation) {
      const structuredResult = this.parseStructuredLocation(cleanLocation)
      if (structuredResult) {
        return {
          ...structuredResult,
          isRemote: false, // Hybrid jobs require office presence
          confidence: Math.max(structuredResult.confidence - 0.1, 0.5),
          warnings: ['Hybrid role - calculations based on office location']
        }
      }
    }

    // Fallback to user location for hybrid if no office location found
    if (userProfile?.currentLocation) {
      return {
        city: userProfile.currentLocation,
        country: userProfile.currentCountry || 'Unknown',
        state: userProfile.currentState,
        isRemote: false,
        confidence: 0.6,
        originalInput: location,
        resolvedBy: 'user_profile',
        warnings: ['Using your location - confirm actual office location']
      }
    }

    return this.resolveFallback(location, userProfile, ['Hybrid job location unclear'])
  }

  /**
   * Resolve vague regional location
   */
  private resolveVagueLocation(
    location: string,
    userProfile?: UserLocationProfile,
    jobContext?: JobLocationContext
  ): LocationResolution {
    const normalizedLocation = location.toLowerCase()

    // Try region mapping from our comprehensive database
    const regionDefault = findRegionDefault(normalizedLocation)
    if (regionDefault) {
      // If user is in the same region, use their location
      if (userProfile?.currentCountry && 
          regionDefault.normalizedName.toLowerCase().includes(userProfile.currentCountry.toLowerCase())) {
        return {
          city: userProfile.currentLocation || regionDefault.defaultCity,
          country: userProfile.currentCountry,
          state: userProfile.currentState,
          isRemote: false,
          confidence: 0.8,
          originalInput: location,
          resolvedBy: 'region_mapping',
          warnings: ['Using your location within the specified region']
        }
      }

      // Use region default
      return {
        city: regionDefault.defaultCity,
        country: regionDefault.normalizedName,
        isRemote: false,
        confidence: 0.7,
        originalInput: location,
        resolvedBy: 'region_mapping',
        warnings: [`Defaulting to major city in ${regionDefault.normalizedName}`]
      }
    }

    // Handle continent-level locations
    const continentDefaults = this.getContinentDefaults(normalizedLocation)
    if (continentDefaults) {
      return {
        city: continentDefaults.city,
        country: continentDefaults.country,
        isRemote: false,
        confidence: 0.5,
        originalInput: location,
        resolvedBy: 'region_mapping',
        warnings: ['Very broad location - using major business hub as default']
      }
    }

    return this.resolveFallback(location, userProfile, ['Location too vague to resolve'])
  }

  /**
   * Parse structured location strings like "City, State, Country"
   */
  private parseStructuredLocation(location: string): LocationResolution | null {
    if (!location || location.trim() === '') return null

    const parts = location.split(',').map(s => s.trim()).filter(s => s.length > 0)
    
    if (parts.length === 0) return null

    // Single part - could be city or country
    if (parts.length === 1) {
      const single = parts[0]
      
      // Check if it's a country
      const countryInfo = findCountry(single)
      if (countryInfo) {
        return {
          city: countryInfo.defaultCity,
          country: countryInfo.normalizedName,
          isRemote: false,
          confidence: 0.8,
          originalInput: location,
          resolvedBy: 'exact_match'
        }
      }

      // Check if it's a major city
      const cityResult = this.resolveMajorCity(single)
      if (cityResult) {
        return cityResult
      }

      return null
    }

    // Two parts - "City, Country" or "City, State"
    if (parts.length === 2) {
      const [first, second] = parts

      // Try "City, Country" format
      const countryInfo = findCountry(second)
      if (countryInfo) {
        const isMajor = isMajorCity(first, countryInfo)
        return {
          city: isMajor ? first : countryInfo.defaultCity,
          country: countryInfo.normalizedName,
          isRemote: false,
          confidence: isMajor ? 0.9 : 0.75,
          originalInput: location,
          resolvedBy: isMajor ? 'exact_match' : 'major_city',
          warnings: isMajor ? undefined : [`Using ${countryInfo.defaultCity} as default city for ${countryInfo.normalizedName}`]
        }
      }

      // Fallback for unknown second part
      return {
        city: first,
        country: second,
        isRemote: false,
        confidence: 0.6,
        originalInput: location,
        resolvedBy: 'fallback',
        warnings: ['Could not verify country - please confirm location accuracy']
      }
    }

    // Three or more parts - "City, State, Country"
    if (parts.length >= 3) {
      const city = parts[0]
      const state = parts[1]
      const country = parts[parts.length - 1]

      const countryInfo = findCountry(country)
      if (countryInfo) {
        const isMajor = isMajorCity(city, countryInfo)
        return {
          city: isMajor ? city : countryInfo.defaultCity,
          country: countryInfo.normalizedName,
          state: state,
          isRemote: false,
          confidence: isMajor ? 0.95 : 0.8,
          originalInput: location,
          resolvedBy: isMajor ? 'exact_match' : 'major_city'
        }
      }

      // Fallback
      return {
        city,
        country,
        state,
        isRemote: false,
        confidence: 0.6,
        originalInput: location,
        resolvedBy: 'fallback',
        warnings: ['Could not verify country - please confirm location accuracy']
      }
    }

    return null
  }

  /**
   * Resolve location to a major city
   */
  private resolveMajorCity(cityName: string): LocationResolution | null {
    if (!cityName || cityName.trim() === '') return null

    // Search through all countries to find this city
    for (const country of Object.values(NUMBEO_COUNTRIES)) {
      if (isMajorCity(cityName, country)) {
        return {
          city: cityName,
          country: country.normalizedName,
          isRemote: false,
          confidence: 0.85,
          originalInput: cityName,
          resolvedBy: 'major_city'
        }
      }
    }

    return null
  }

  /**
   * Extract location hints from remote job descriptions
   */
  private extractLocationHints(text: string): LocationResolution[] {
    const hints: LocationResolution[] = []
    const words = text.toLowerCase().split(/[\s,\-\(\)]+/)

    // Look for timezone mentions
    const timezoneHints = [
      'pst', 'est', 'mst', 'cst', 'pdt', 'edt', 'mdt', 'cdt',
      'utc', 'gmt', 'cet', 'bst', 'jst', 'aest'
    ]

    for (const word of words) {
      if (timezoneHints.includes(word)) {
        const locationFromTz = this.timezoneToLocation(word)
        if (locationFromTz) {
          hints.push(locationFromTz)
        }
      }
    }

    // Look for country mentions
    for (const country of Object.values(NUMBEO_COUNTRIES)) {
      if (text.toLowerCase().includes(country.normalizedName.toLowerCase())) {
        hints.push({
          city: country.defaultCity,
          country: country.normalizedName,
          isRemote: true,
          confidence: 0.7,
          originalInput: text,
          resolvedBy: 'exact_match'
        })
      }
    }

    return hints.slice(0, 3) // Return top 3 hints
  }

  /**
   * Convert timezone abbreviation to location
   */
  private timezoneToLocation(tz: string): LocationResolution | null {
    const tzMap: Record<string, { city: string; country: string; confidence: number }> = {
      'pst': { city: 'San Francisco', country: 'United States', confidence: 0.7 },
      'pdt': { city: 'San Francisco', country: 'United States', confidence: 0.7 },
      'est': { city: 'New York', country: 'United States', confidence: 0.7 },
      'edt': { city: 'New York', country: 'United States', confidence: 0.7 },
      'cst': { city: 'Chicago', country: 'United States', confidence: 0.7 },
      'cdt': { city: 'Chicago', country: 'United States', confidence: 0.7 },
      'mst': { city: 'Denver', country: 'United States', confidence: 0.7 },
      'mdt': { city: 'Denver', country: 'United States', confidence: 0.7 },
      'gmt': { city: 'London', country: 'United Kingdom', confidence: 0.6 },
      'bst': { city: 'London', country: 'United Kingdom', confidence: 0.6 },
      'cet': { city: 'Berlin', country: 'Germany', confidence: 0.6 },
      'jst': { city: 'Tokyo', country: 'Japan', confidence: 0.7 },
      'aest': { city: 'Sydney', country: 'Australia', confidence: 0.7 }
    }

    const location = tzMap[tz.toLowerCase()]
    if (location) {
      return {
        city: location.city,
        country: location.country,
        isRemote: true,
        confidence: location.confidence,
        originalInput: tz,
        resolvedBy: 'exact_match'
      }
    }

    return null
  }

  /**
   * Get default locations for continent-level queries
   */
  private getContinentDefaults(location: string): { city: string; country: string } | null {
    const continentMap: Record<string, { city: string; country: string }> = {
      'europe': { city: 'London', country: 'United Kingdom' },
      'eu': { city: 'Berlin', country: 'Germany' },
      'asia': { city: 'Singapore', country: 'Singapore' },
      'apac': { city: 'Singapore', country: 'Singapore' },
      'asia pacific': { city: 'Singapore', country: 'Singapore' },
      'north america': { city: 'New York', country: 'United States' },
      'latin america': { city: 'São Paulo', country: 'Brazil' },
      'south america': { city: 'São Paulo', country: 'Brazil' },
      'africa': { city: 'Cape Town', country: 'South Africa' },
      'middle east': { city: 'Dubai', country: 'United Arab Emirates' },
      'oceania': { city: 'Sydney', country: 'Australia' }
    }

    return continentMap[location] || null
  }

  /**
   * Attempt to resolve location based on company headquarters
   */
  private async resolveCompanyHeadquarters(
    companyName: string, 
    originalLocation: string
  ): Promise<LocationResolution | null> {
    // This would ideally connect to a company database API
    // For now, we'll include some common tech companies
    const companyHQMap: Record<string, { city: string; country: string; state?: string }> = {
      'google': { city: 'Mountain View', country: 'United States', state: 'California' },
      'alphabet': { city: 'Mountain View', country: 'United States', state: 'California' },
      'microsoft': { city: 'Redmond', country: 'United States', state: 'Washington' },
      'amazon': { city: 'Seattle', country: 'United States', state: 'Washington' },
      'apple': { city: 'Cupertino', country: 'United States', state: 'California' },
      'meta': { city: 'Menlo Park', country: 'United States', state: 'California' },
      'facebook': { city: 'Menlo Park', country: 'United States', state: 'California' },
      'netflix': { city: 'Los Gatos', country: 'United States', state: 'California' },
      'uber': { city: 'San Francisco', country: 'United States', state: 'California' },
      'airbnb': { city: 'San Francisco', country: 'United States', state: 'California' },
      'spotify': { city: 'Stockholm', country: 'Sweden' },
      'shopify': { city: 'Ottawa', country: 'Canada' }
    }

    const normalizedCompany = companyName.toLowerCase().trim()
    const hq = companyHQMap[normalizedCompany]

    if (hq) {
      return {
        city: hq.city,
        country: hq.country,
        state: hq.state,
        isRemote: false,
        confidence: 0.7,
        originalInput: originalLocation,
        resolvedBy: 'fallback'
      }
    }

    return null
  }

  /**
   * Final fallback resolution
   */
  private resolveFallback(
    originalLocation: string,
    userProfile?: UserLocationProfile,
    warnings: string[] = []
  ): LocationResolution {
    // Use user profile as fallback
    if (userProfile?.currentLocation && userProfile?.currentCountry) {
      return {
        city: userProfile.currentLocation,
        country: userProfile.currentCountry,
        state: userProfile.currentState,
        isRemote: true,
        confidence: 0.3,
        originalInput: originalLocation,
        resolvedBy: 'fallback',
        warnings: [...warnings, 'Using your profile location as fallback']
      }
    }

    // Global remote as final fallback
    return {
      city: 'Remote',
      country: 'Global',
      isRemote: true,
      confidence: 0.2,
      originalInput: originalLocation,
      resolvedBy: 'fallback',
      warnings: [...warnings, 'Could not determine location - using global remote']
    }
  }

  /**
   * Validate and enhance an existing location resolution
   */
  async validateLocation(resolution: LocationResolution): Promise<LocationResolution> {
    const warnings = [...(resolution.warnings || [])]

    // Check if the country is supported by our cost of living data
    const countryInfo = findCountry(resolution.country)
    if (!countryInfo && resolution.country !== 'Global' && resolution.country !== 'Remote') {
      warnings.push('Country not found in our database - cost calculations may be less accurate')
      resolution.confidence = Math.max(resolution.confidence - 0.2, 0.1)
    }

    // Check if the city is a major city for better accuracy
    if (countryInfo && !isMajorCity(resolution.city, countryInfo) && !resolution.isRemote) {
      warnings.push('City not found in major cities list - using country averages')
      resolution.confidence = Math.max(resolution.confidence - 0.1, 0.1)
    }

    return {
      ...resolution,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }

  /**
   * Get multiple resolution alternatives for ambiguous locations
   */
  async getLocationAlternatives(
    jobContext: JobLocationContext,
    userProfile?: UserLocationProfile
  ): Promise<LocationResolution[]> {
    const alternatives: LocationResolution[] = []
    const jobLocation = jobContext.jobLocation?.trim() || ''

    // If it's a major city name that exists in multiple countries
    if (jobLocation && !jobLocation.includes(',')) {
      for (const country of Object.values(NUMBEO_COUNTRIES)) {
        if (isMajorCity(jobLocation, country)) {
          alternatives.push({
            city: jobLocation,
            country: country.normalizedName,
            isRemote: false,
            confidence: 0.8,
            originalInput: jobLocation,
            resolvedBy: 'major_city'
          })
        }
      }
    }

    return alternatives.slice(0, 5) // Return top 5 alternatives
  }
}

// Export singleton instance
export const locationResolver = new LocationResolver()

// Convenience function for backward compatibility
export async function resolveLocation(
  jobLocation: string, 
  userProfile?: any
): Promise<LocationResolution> {
  return locationResolver.resolveLocation(
    { jobLocation },
    userProfile ? {
      currentLocation: userProfile.currentLocation,
      currentCountry: userProfile.currentCountry,
      currentState: userProfile.currentState
    } : undefined
  )
}