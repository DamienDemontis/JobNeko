/**
 * Complete list of countries available on Numbeo with normalized names and major cities
 * This ensures our salary analysis can work with any location globally
 */

export interface CountryInfo {
  name: string;
  normalizedName: string;
  majorCities: string[];
  region: string;
  defaultCity: string;
}

export const NUMBEO_COUNTRIES: Record<string, CountryInfo> = {
  // A
  'afghanistan': { name: 'Afghanistan', normalizedName: 'Afghanistan', majorCities: ['Kabul'], region: 'Asia', defaultCity: 'Kabul' },
  'albania': { name: 'Albania', normalizedName: 'Albania', majorCities: ['Tirana'], region: 'Europe', defaultCity: 'Tirana' },
  'algeria': { name: 'Algeria', normalizedName: 'Algeria', majorCities: ['Algiers'], region: 'Africa', defaultCity: 'Algiers' },
  'argentina': { name: 'Argentina', normalizedName: 'Argentina', majorCities: ['Buenos Aires', 'Córdoba', 'Rosario'], region: 'Americas', defaultCity: 'Buenos Aires' },
  'armenia': { name: 'Armenia', normalizedName: 'Armenia', majorCities: ['Yerevan'], region: 'Asia', defaultCity: 'Yerevan' },
  'australia': { name: 'Australia', normalizedName: 'Australia', majorCities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'], region: 'Oceania', defaultCity: 'Sydney' },
  'austria': { name: 'Austria', normalizedName: 'Austria', majorCities: ['Vienna', 'Salzburg', 'Graz'], region: 'Europe', defaultCity: 'Vienna' },
  'azerbaijan': { name: 'Azerbaijan', normalizedName: 'Azerbaijan', majorCities: ['Baku'], region: 'Asia', defaultCity: 'Baku' },

  // B
  'bahrain': { name: 'Bahrain', normalizedName: 'Bahrain', majorCities: ['Manama'], region: 'Asia', defaultCity: 'Manama' },
  'bangladesh': { name: 'Bangladesh', normalizedName: 'Bangladesh', majorCities: ['Dhaka', 'Chittagong'], region: 'Asia', defaultCity: 'Dhaka' },
  'belarus': { name: 'Belarus', normalizedName: 'Belarus', majorCities: ['Minsk'], region: 'Europe', defaultCity: 'Minsk' },
  'belgium': { name: 'Belgium', normalizedName: 'Belgium', majorCities: ['Brussels', 'Antwerp', 'Ghent'], region: 'Europe', defaultCity: 'Brussels' },
  'bolivia': { name: 'Bolivia', normalizedName: 'Bolivia', majorCities: ['La Paz', 'Santa Cruz'], region: 'Americas', defaultCity: 'La Paz' },
  'bosnia and herzegovina': { name: 'Bosnia And Herzegovina', normalizedName: 'Bosnia and Herzegovina', majorCities: ['Sarajevo'], region: 'Europe', defaultCity: 'Sarajevo' },
  'botswana': { name: 'Botswana', normalizedName: 'Botswana', majorCities: ['Gaborone'], region: 'Africa', defaultCity: 'Gaborone' },
  'brazil': { name: 'Brazil', normalizedName: 'Brazil', majorCities: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador'], region: 'Americas', defaultCity: 'São Paulo' },
  'brunei': { name: 'Brunei', normalizedName: 'Brunei', majorCities: ['Bandar Seri Begawan'], region: 'Asia', defaultCity: 'Bandar Seri Begawan' },
  'bulgaria': { name: 'Bulgaria', normalizedName: 'Bulgaria', majorCities: ['Sofia', 'Plovdiv', 'Varna'], region: 'Europe', defaultCity: 'Sofia' },

  // C
  'cambodia': { name: 'Cambodia', normalizedName: 'Cambodia', majorCities: ['Phnom Penh'], region: 'Asia', defaultCity: 'Phnom Penh' },
  'cameroon': { name: 'Cameroon', normalizedName: 'Cameroon', majorCities: ['Yaoundé', 'Douala'], region: 'Africa', defaultCity: 'Yaoundé' },
  'canada': { name: 'Canada', normalizedName: 'Canada', majorCities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'], region: 'Americas', defaultCity: 'Toronto' },
  'chile': { name: 'Chile', normalizedName: 'Chile', majorCities: ['Santiago', 'Valparaíso'], region: 'Americas', defaultCity: 'Santiago' },
  'china': { name: 'China', normalizedName: 'China', majorCities: ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu'], region: 'Asia', defaultCity: 'Beijing' },
  'colombia': { name: 'Colombia', normalizedName: 'Colombia', majorCities: ['Bogotá', 'Medellín', 'Cali'], region: 'Americas', defaultCity: 'Bogotá' },
  'costa rica': { name: 'Costa Rica', normalizedName: 'Costa Rica', majorCities: ['San José'], region: 'Americas', defaultCity: 'San José' },
  'croatia': { name: 'Croatia', normalizedName: 'Croatia', majorCities: ['Zagreb', 'Split'], region: 'Europe', defaultCity: 'Zagreb' },
  'cyprus': { name: 'Cyprus', normalizedName: 'Cyprus', majorCities: ['Nicosia'], region: 'Europe', defaultCity: 'Nicosia' },
  'czech republic': { name: 'Czech Republic', normalizedName: 'Czech Republic', majorCities: ['Prague', 'Brno'], region: 'Europe', defaultCity: 'Prague' },

  // D
  'denmark': { name: 'Denmark', normalizedName: 'Denmark', majorCities: ['Copenhagen', 'Aarhus'], region: 'Europe', defaultCity: 'Copenhagen' },
  'dominican republic': { name: 'Dominican Republic', normalizedName: 'Dominican Republic', majorCities: ['Santo Domingo'], region: 'Americas', defaultCity: 'Santo Domingo' },

  // E
  'ecuador': { name: 'Ecuador', normalizedName: 'Ecuador', majorCities: ['Quito', 'Guayaquil'], region: 'Americas', defaultCity: 'Quito' },
  'egypt': { name: 'Egypt', normalizedName: 'Egypt', majorCities: ['Cairo', 'Alexandria'], region: 'Africa', defaultCity: 'Cairo' },
  'estonia': { name: 'Estonia', normalizedName: 'Estonia', majorCities: ['Tallinn'], region: 'Europe', defaultCity: 'Tallinn' },
  'ethiopia': { name: 'Ethiopia', normalizedName: 'Ethiopia', majorCities: ['Addis Ababa'], region: 'Africa', defaultCity: 'Addis Ababa' },

  // F
  'fiji': { name: 'Fiji', normalizedName: 'Fiji', majorCities: ['Suva'], region: 'Oceania', defaultCity: 'Suva' },
  'finland': { name: 'Finland', normalizedName: 'Finland', majorCities: ['Helsinki', 'Tampere'], region: 'Europe', defaultCity: 'Helsinki' },
  'france': { name: 'France', normalizedName: 'France', majorCities: ['Paris', 'Lyon', 'Marseille', 'Toulouse'], region: 'Europe', defaultCity: 'Paris' },

  // G
  'georgia': { name: 'Georgia', normalizedName: 'Georgia', majorCities: ['Tbilisi'], region: 'Asia', defaultCity: 'Tbilisi' },
  'germany': { name: 'Germany', normalizedName: 'Germany', majorCities: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'], region: 'Europe', defaultCity: 'Berlin' },
  'ghana': { name: 'Ghana', normalizedName: 'Ghana', majorCities: ['Accra'], region: 'Africa', defaultCity: 'Accra' },
  'greece': { name: 'Greece', normalizedName: 'Greece', majorCities: ['Athens', 'Thessaloniki'], region: 'Europe', defaultCity: 'Athens' },
  'guatemala': { name: 'Guatemala', normalizedName: 'Guatemala', majorCities: ['Guatemala City'], region: 'Americas', defaultCity: 'Guatemala City' },

  // H
  'hong kong': { name: 'Hong Kong (China)', normalizedName: 'Hong Kong', majorCities: ['Hong Kong'], region: 'Asia', defaultCity: 'Hong Kong' },
  'hungary': { name: 'Hungary', normalizedName: 'Hungary', majorCities: ['Budapest'], region: 'Europe', defaultCity: 'Budapest' },

  // I
  'iceland': { name: 'Iceland', normalizedName: 'Iceland', majorCities: ['Reykjavík'], region: 'Europe', defaultCity: 'Reykjavík' },
  'india': { name: 'India', normalizedName: 'India', majorCities: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata'], region: 'Asia', defaultCity: 'Mumbai' },
  'indonesia': { name: 'Indonesia', normalizedName: 'Indonesia', majorCities: ['Jakarta', 'Surabaya', 'Bandung'], region: 'Asia', defaultCity: 'Jakarta' },
  'iran': { name: 'Iran', normalizedName: 'Iran', majorCities: ['Tehran'], region: 'Asia', defaultCity: 'Tehran' },
  'iraq': { name: 'Iraq', normalizedName: 'Iraq', majorCities: ['Baghdad'], region: 'Asia', defaultCity: 'Baghdad' },
  'ireland': { name: 'Ireland', normalizedName: 'Ireland', majorCities: ['Dublin', 'Cork'], region: 'Europe', defaultCity: 'Dublin' },
  'israel': { name: 'Israel', normalizedName: 'Israel', majorCities: ['Tel Aviv', 'Jerusalem'], region: 'Asia', defaultCity: 'Tel Aviv' },
  'italy': { name: 'Italy', normalizedName: 'Italy', majorCities: ['Rome', 'Milan', 'Naples', 'Turin'], region: 'Europe', defaultCity: 'Rome' },

  // J
  'jamaica': { name: 'Jamaica', normalizedName: 'Jamaica', majorCities: ['Kingston'], region: 'Americas', defaultCity: 'Kingston' },
  'japan': { name: 'Japan', normalizedName: 'Japan', majorCities: ['Tokyo', 'Osaka', 'Yokohama', 'Nagoya'], region: 'Asia', defaultCity: 'Tokyo' },
  'jordan': { name: 'Jordan', normalizedName: 'Jordan', majorCities: ['Amman'], region: 'Asia', defaultCity: 'Amman' },

  // K
  'kazakhstan': { name: 'Kazakhstan', normalizedName: 'Kazakhstan', majorCities: ['Almaty', 'Nur-Sultan'], region: 'Asia', defaultCity: 'Almaty' },
  'kenya': { name: 'Kenya', normalizedName: 'Kenya', majorCities: ['Nairobi', 'Mombasa'], region: 'Africa', defaultCity: 'Nairobi' },
  'kosovo': { name: 'Kosovo (Disputed Territory)', normalizedName: 'Kosovo', majorCities: ['Pristina'], region: 'Europe', defaultCity: 'Pristina' },
  'kuwait': { name: 'Kuwait', normalizedName: 'Kuwait', majorCities: ['Kuwait City'], region: 'Asia', defaultCity: 'Kuwait City' },

  // L
  'laos': { name: 'Laos', normalizedName: 'Laos', majorCities: ['Vientiane'], region: 'Asia', defaultCity: 'Vientiane' },
  'latvia': { name: 'Latvia', normalizedName: 'Latvia', majorCities: ['Riga'], region: 'Europe', defaultCity: 'Riga' },
  'lebanon': { name: 'Lebanon', normalizedName: 'Lebanon', majorCities: ['Beirut'], region: 'Asia', defaultCity: 'Beirut' },
  'lithuania': { name: 'Lithuania', normalizedName: 'Lithuania', majorCities: ['Vilnius'], region: 'Europe', defaultCity: 'Vilnius' },
  'luxembourg': { name: 'Luxembourg', normalizedName: 'Luxembourg', majorCities: ['Luxembourg'], region: 'Europe', defaultCity: 'Luxembourg' },

  // M
  'macao': { name: 'Macao (China)', normalizedName: 'Macao', majorCities: ['Macao'], region: 'Asia', defaultCity: 'Macao' },
  'malaysia': { name: 'Malaysia', normalizedName: 'Malaysia', majorCities: ['Kuala Lumpur', 'George Town'], region: 'Asia', defaultCity: 'Kuala Lumpur' },
  'malta': { name: 'Malta', normalizedName: 'Malta', majorCities: ['Valletta'], region: 'Europe', defaultCity: 'Valletta' },
  'mexico': { name: 'Mexico', normalizedName: 'Mexico', majorCities: ['Mexico City', 'Guadalajara', 'Monterrey'], region: 'Americas', defaultCity: 'Mexico City' },
  'moldova': { name: 'Moldova', normalizedName: 'Moldova', majorCities: ['Chișinău'], region: 'Europe', defaultCity: 'Chișinău' },
  'mongolia': { name: 'Mongolia', normalizedName: 'Mongolia', majorCities: ['Ulaanbaatar'], region: 'Asia', defaultCity: 'Ulaanbaatar' },
  'morocco': { name: 'Morocco', normalizedName: 'Morocco', majorCities: ['Casablanca', 'Rabat'], region: 'Africa', defaultCity: 'Casablanca' },

  // N
  'nepal': { name: 'Nepal', normalizedName: 'Nepal', majorCities: ['Kathmandu'], region: 'Asia', defaultCity: 'Kathmandu' },
  'netherlands': { name: 'Netherlands', normalizedName: 'Netherlands', majorCities: ['Amsterdam', 'Rotterdam', 'The Hague'], region: 'Europe', defaultCity: 'Amsterdam' },
  'new zealand': { name: 'New Zealand', normalizedName: 'New Zealand', majorCities: ['Auckland', 'Wellington'], region: 'Oceania', defaultCity: 'Auckland' },
  'nigeria': { name: 'Nigeria', normalizedName: 'Nigeria', majorCities: ['Lagos', 'Abuja'], region: 'Africa', defaultCity: 'Lagos' },
  'north korea': { name: 'North Korea', normalizedName: 'North Korea', majorCities: ['Pyongyang'], region: 'Asia', defaultCity: 'Pyongyang' },
  'north macedonia': { name: 'North Macedonia', normalizedName: 'North Macedonia', majorCities: ['Skopje'], region: 'Europe', defaultCity: 'Skopje' },
  'norway': { name: 'Norway', normalizedName: 'Norway', majorCities: ['Oslo', 'Bergen'], region: 'Europe', defaultCity: 'Oslo' },

  // O
  'oman': { name: 'Oman', normalizedName: 'Oman', majorCities: ['Muscat'], region: 'Asia', defaultCity: 'Muscat' },

  // P
  'pakistan': { name: 'Pakistan', normalizedName: 'Pakistan', majorCities: ['Karachi', 'Lahore', 'Islamabad'], region: 'Asia', defaultCity: 'Karachi' },
  'panama': { name: 'Panama', normalizedName: 'Panama', majorCities: ['Panama City'], region: 'Americas', defaultCity: 'Panama City' },
  'peru': { name: 'Peru', normalizedName: 'Peru', majorCities: ['Lima'], region: 'Americas', defaultCity: 'Lima' },
  'philippines': { name: 'Philippines', normalizedName: 'Philippines', majorCities: ['Manila', 'Cebu City'], region: 'Asia', defaultCity: 'Manila' },
  'poland': { name: 'Poland', normalizedName: 'Poland', majorCities: ['Warsaw', 'Krakow', 'Gdańsk'], region: 'Europe', defaultCity: 'Warsaw' },
  'portugal': { name: 'Portugal', normalizedName: 'Portugal', majorCities: ['Lisbon', 'Porto'], region: 'Europe', defaultCity: 'Lisbon' },

  // Q
  'qatar': { name: 'Qatar', normalizedName: 'Qatar', majorCities: ['Doha'], region: 'Asia', defaultCity: 'Doha' },

  // R
  'romania': { name: 'Romania', normalizedName: 'Romania', majorCities: ['Bucharest', 'Cluj-Napoca'], region: 'Europe', defaultCity: 'Bucharest' },
  'russia': { name: 'Russia', normalizedName: 'Russia', majorCities: ['Moscow', 'St. Petersburg'], region: 'Europe', defaultCity: 'Moscow' },
  'rwanda': { name: 'Rwanda', normalizedName: 'Rwanda', majorCities: ['Kigali'], region: 'Africa', defaultCity: 'Kigali' },

  // S
  'saudi arabia': { name: 'Saudi Arabia', normalizedName: 'Saudi Arabia', majorCities: ['Riyadh', 'Jeddah'], region: 'Asia', defaultCity: 'Riyadh' },
  'serbia': { name: 'Serbia', normalizedName: 'Serbia', majorCities: ['Belgrade'], region: 'Europe', defaultCity: 'Belgrade' },
  'singapore': { name: 'Singapore', normalizedName: 'Singapore', majorCities: ['Singapore'], region: 'Asia', defaultCity: 'Singapore' },
  'slovakia': { name: 'Slovakia', normalizedName: 'Slovakia', majorCities: ['Bratislava'], region: 'Europe', defaultCity: 'Bratislava' },
  'slovenia': { name: 'Slovenia', normalizedName: 'Slovenia', majorCities: ['Ljubljana'], region: 'Europe', defaultCity: 'Ljubljana' },
  'south africa': { name: 'South Africa', normalizedName: 'South Africa', majorCities: ['Cape Town', 'Johannesburg', 'Durban'], region: 'Africa', defaultCity: 'Cape Town' },
  'south korea': { name: 'South Korea', normalizedName: 'South Korea', majorCities: ['Seoul', 'Busan'], region: 'Asia', defaultCity: 'Seoul' },
  'spain': { name: 'Spain', normalizedName: 'Spain', majorCities: ['Madrid', 'Barcelona', 'Valencia'], region: 'Europe', defaultCity: 'Madrid' },
  'sri lanka': { name: 'Sri Lanka', normalizedName: 'Sri Lanka', majorCities: ['Colombo'], region: 'Asia', defaultCity: 'Colombo' },
  'sweden': { name: 'Sweden', normalizedName: 'Sweden', majorCities: ['Stockholm', 'Gothenburg'], region: 'Europe', defaultCity: 'Stockholm' },
  'switzerland': { name: 'Switzerland', normalizedName: 'Switzerland', majorCities: ['Zurich', 'Geneva'], region: 'Europe', defaultCity: 'Zurich' },

  // T
  'taiwan': { name: 'Taiwan', normalizedName: 'Taiwan', majorCities: ['Taipei'], region: 'Asia', defaultCity: 'Taipei' },
  'thailand': { name: 'Thailand', normalizedName: 'Thailand', majorCities: ['Bangkok', 'Chiang Mai'], region: 'Asia', defaultCity: 'Bangkok' },
  'turkey': { name: 'Turkey', normalizedName: 'Turkey', majorCities: ['Istanbul', 'Ankara'], region: 'Europe', defaultCity: 'Istanbul' },

  // U
  'ukraine': { name: 'Ukraine', normalizedName: 'Ukraine', majorCities: ['Kiev', 'Kharkiv'], region: 'Europe', defaultCity: 'Kiev' },
  'united arab emirates': { name: 'United Arab Emirates', normalizedName: 'UAE', majorCities: ['Dubai', 'Abu Dhabi'], region: 'Asia', defaultCity: 'Dubai' },
  'uae': { name: 'United Arab Emirates', normalizedName: 'UAE', majorCities: ['Dubai', 'Abu Dhabi'], region: 'Asia', defaultCity: 'Dubai' },
  'united kingdom': { name: 'United Kingdom', normalizedName: 'United Kingdom', majorCities: ['London', 'Manchester', 'Edinburgh'], region: 'Europe', defaultCity: 'London' },
  'uk': { name: 'United Kingdom', normalizedName: 'United Kingdom', majorCities: ['London', 'Manchester', 'Edinburgh'], region: 'Europe', defaultCity: 'London' },
  'united states': { name: 'United States', normalizedName: 'United States', majorCities: ['New York', 'Los Angeles', 'Chicago', 'San Francisco'], region: 'Americas', defaultCity: 'New York' },
  'usa': { name: 'United States', normalizedName: 'United States', majorCities: ['New York', 'Los Angeles', 'Chicago', 'San Francisco'], region: 'Americas', defaultCity: 'New York' },
  'us': { name: 'United States', normalizedName: 'United States', majorCities: ['New York', 'Los Angeles', 'Chicago', 'San Francisco'], region: 'Americas', defaultCity: 'New York' },
  'uruguay': { name: 'Uruguay', normalizedName: 'Uruguay', majorCities: ['Montevideo'], region: 'Americas', defaultCity: 'Montevideo' },

  // V
  'venezuela': { name: 'Venezuela', normalizedName: 'Venezuela', majorCities: ['Caracas'], region: 'Americas', defaultCity: 'Caracas' },
  'vietnam': { name: 'Vietnam', normalizedName: 'Vietnam', majorCities: ['Ho Chi Minh City', 'Hanoi'], region: 'Asia', defaultCity: 'Ho Chi Minh City' },

  // Y
  'yemen': { name: 'Yemen', normalizedName: 'Yemen', majorCities: ['Sana\'a'], region: 'Asia', defaultCity: 'Sana\'a' },

  // Z
  'zambia': { name: 'Zambia', normalizedName: 'Zambia', majorCities: ['Lusaka'], region: 'Africa', defaultCity: 'Lusaka' },
  'zimbabwe': { name: 'Zimbabwe', normalizedName: 'Zimbabwe', majorCities: ['Harare'], region: 'Africa', defaultCity: 'Harare' }
};

/**
 * Region-based default locations for when job location is vague
 */
export const REGION_DEFAULTS: Record<string, CountryInfo> = {
  'apac': NUMBEO_COUNTRIES['singapore'],
  'asia': NUMBEO_COUNTRIES['singapore'],
  'asia pacific': NUMBEO_COUNTRIES['singapore'],
  'europe': NUMBEO_COUNTRIES['united kingdom'],
  'americas': NUMBEO_COUNTRIES['united states'],
  'north america': NUMBEO_COUNTRIES['united states'],
  'south america': NUMBEO_COUNTRIES['brazil'],
  'africa': NUMBEO_COUNTRIES['south africa'],
  'middle east': NUMBEO_COUNTRIES['united arab emirates'],
  'oceania': NUMBEO_COUNTRIES['australia']
};

/**
 * Fuzzy match a country name to our database
 */
export function findCountry(countryName: string): CountryInfo | null {
  if (!countryName) return null;
  
  const normalized = countryName.toLowerCase().trim();
  
  // Direct match
  if (NUMBEO_COUNTRIES[normalized]) {
    return NUMBEO_COUNTRIES[normalized];
  }
  
  // Fuzzy matching for common variations
  const variations: Record<string, string> = {
    'usa': 'united states',
    'us': 'united states',
    'america': 'united states',
    'uk': 'united kingdom',
    'britain': 'united kingdom',
    'england': 'united kingdom',
    'uae': 'united arab emirates',
    'emirates': 'united arab emirates',
    'korea': 'south korea',
    'south korea': 'south korea',
    'russia': 'russia',
    'holland': 'netherlands',
    'czech': 'czech republic',
    'macedonia': 'north macedonia'
  };
  
  if (variations[normalized]) {
    return NUMBEO_COUNTRIES[variations[normalized]];
  }
  
  // Partial match
  for (const [key, info] of Object.entries(NUMBEO_COUNTRIES)) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return info;
    }
  }
  
  return null;
}

/**
 * Find region-based default location
 */
export function findRegionDefault(region: string): CountryInfo | null {
  const normalized = region.toLowerCase().trim();
  return REGION_DEFAULTS[normalized] || null;
}

/**
 * Check if a city is a major city in the given country
 */
export function isMajorCity(city: string, country: CountryInfo): boolean {
  const normalizedCity = city.toLowerCase();
  return country.majorCities.some(majorCity => 
    majorCity.toLowerCase() === normalizedCity ||
    majorCity.toLowerCase().includes(normalizedCity) ||
    normalizedCity.includes(majorCity.toLowerCase())
  );
}