export interface LocationInfo {
  country: string;
  province: string;
  city: string;
  latitude: number;
  longitude: number;
}

export const COUNTRIES = [
  'Philippines',
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'Japan',
  'Other'
];

export const PROVINCES_BY_COUNTRY: Record<string, string[]> = {
  'Philippines': [
    'Negros Oriental',
    'Cebu',
    'Metro Manila',
    'Davao del Sur',
    'Iloilo',
    'Benguet',
    'Pampanga',
    'Cavite',
    'Laguna',
    'Batangas'
  ],
  'United States': [
    'California',
    'New York',
    'Texas',
    'Washington',
    'Illinois',
    'Florida',
    'Massachusetts',
    'Oregon'
  ],
  'Canada': [
    'Ontario',
    'British Columbia',
    'Quebec',
    'Alberta'
  ],
  'United Kingdom': [
    'Greater London',
    'Greater Manchester',
    'West Midlands',
    'Scotland'
  ],
  'Australia': [
    'New South Wales',
    'Victoria',
    'Queensland'
  ],
  'Japan': [
    'Tokyo',
    'Osaka',
    'Kyoto'
  ],
  'Other': [
    'General Region'
  ]
};

export const CITIES_BY_PROVINCE: Record<string, string[]> = {
  // Philippines
  'Negros Oriental': [
    'Dumaguete City',
    'Bais City',
    'Tanjay City',
    'Bayawan City',
    'Sibulan',
    'Valencia',
    'Bacong'
  ],
  'Cebu': [
    'Cebu City',
    'Mandaue City',
    'Lapu-Lapu City',
    'Talisay City'
  ],
  'Metro Manila': [
    'Manila',
    'Quezon City',
    'Makati',
    'Taguig (BGC)',
    'Pasig',
    'Mandaluyong'
  ],
  'Davao del Sur': [
    'Davao City',
    'Digos City'
  ],
  'Iloilo': [
    'Iloilo City',
    'Passi City'
  ],
  'Benguet': [
    'Baguio City',
    'La Trinidad'
  ],
  'Pampanga': [
    'San Fernando',
    'Angeles City'
  ],
  'Cavite': [
    'Tagaytay City',
    'Bacoor City',
    'Imus'
  ],
  'Laguna': [
    'Santa Rosa',
    'Calamba',
    'San Pedro'
  ],
  'Batangas': [
    'Batangas City',
    'Lipa City'
  ],

  // United States
  'California': [
    'San Francisco',
    'Oakland',
    'San Jose',
    'Los Angeles',
    'San Diego',
    'Sacramento',
    'Berkeley'
  ],
  'New York': [
    'New York City',
    'Brooklyn',
    'Queens',
    'Buffalo',
    'Albany'
  ],
  'Texas': [
    'Austin',
    'Houston',
    'Dallas',
    'San Antonio',
    'Fort Worth'
  ],
  'Washington': [
    'Seattle',
    'Bellevue',
    'Tacoma',
    'Spokane'
  ],
  'Illinois': [
    'Chicago',
    'Naperville',
    'Evanston'
  ],
  'Florida': [
    'Miami',
    'Orlando',
    'Tampa',
    'Jacksonville'
  ],
  'Massachusetts': [
    'Boston',
    'Cambridge',
    'Worcester'
  ],
  'Oregon': [
    'Portland',
    'Eugene',
    'Salem'
  ],

  // Canada
  'Ontario': ['Toronto', 'Ottawa', 'Mississauga', 'Hamilton'],
  'British Columbia': ['Vancouver', 'Victoria', 'Burnaby', 'Surrey'],
  'Quebec': ['Montreal', 'Quebec City', 'Laval'],
  'Alberta': ['Calgary', 'Edmonton'],

  // United Kingdom
  'Greater London': ['London', 'Westminster', 'Camden'],
  'Greater Manchester': ['Manchester', 'Salford'],
  'West Midlands': ['Birmingham', 'Coventry'],
  'Scotland': ['Edinburgh', 'Glasgow'],

  // Australia
  'New South Wales': ['Sydney', 'Newcastle', 'Wollongong'],
  'Victoria': ['Melbourne', 'Geelong'],
  'Queensland': ['Brisbane', 'Gold Coast'],

  // Japan
  'Tokyo': ['Shinjuku', 'Shibuya', 'Chiyoda'],
  'Osaka': ['Osaka City', 'Sakai'],
  'Kyoto': ['Kyoto City'],

  'General Region': ['Main District']
};

export const PRESET_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Dumaguete and Negros Oriental
  'Dumaguete City': { lat: 9.3068, lng: 123.3054 },
  'Bais City': { lat: 9.5911, lng: 123.1219 },
  'Tanjay City': { lat: 9.5167, lng: 123.1500 },
  'Bayawan City': { lat: 9.3667, lng: 122.8000 },
  'Sibulan': { lat: 9.3564, lng: 123.2842 },
  'Valencia': { lat: 9.2833, lng: 123.2500 },
  'Bacong': { lat: 9.2458, lng: 123.2986 },
  'Negros Oriental': { lat: 9.3068, lng: 123.3054 },

  // Philippines Other
  'Cebu City': { lat: 10.3157, lng: 123.8854 },
  'Mandaue City': { lat: 10.3396, lng: 123.9416 },
  'Lapu-Lapu City': { lat: 10.3115, lng: 123.9534 },
  'Cebu': { lat: 10.3157, lng: 123.8854 },
  'Manila': { lat: 14.5995, lng: 120.9842 },
  'Quezon City': { lat: 14.6760, lng: 121.0437 },
  'Makati': { lat: 14.5547, lng: 121.0244 },
  'Taguig (BGC)': { lat: 14.5492, lng: 121.0509 },
  'Metro Manila': { lat: 14.5995, lng: 120.9842 },
  'Davao City': { lat: 7.1907, lng: 125.4578 },
  'Iloilo City': { lat: 10.7202, lng: 122.5621 },
  'Baguio City': { lat: 16.4023, lng: 120.5960 },
  'Philippines': { lat: 12.8797, lng: 121.7740 },

  // US Cities
  'San Francisco': { lat: 37.7749, lng: -122.4194 },
  'Oakland': { lat: 37.8044, lng: -122.2712 },
  'San Jose': { lat: 37.3382, lng: -121.8863 },
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  'San Diego': { lat: 32.7157, lng: -117.1611 },
  'California': { lat: 36.7783, lng: -119.4179 },
  'New York City': { lat: 40.7128, lng: -74.0060 },
  'Brooklyn': { lat: 40.6782, lng: -73.9442 },
  'Austin': { lat: 30.2672, lng: -97.7431 },
  'Houston': { lat: 29.7604, lng: -95.3698 },
  'Seattle': { lat: 47.6062, lng: -122.3321 },
  'Chicago': { lat: 41.8781, lng: -87.6298 },
  'Miami': { lat: 25.7617, lng: -80.1918 },
  'Boston': { lat: 42.3601, lng: -71.0589 },
  'United States': { lat: 37.0902, lng: -95.7129 },

  // Canada
  'Toronto': { lat: 43.6532, lng: -79.3832 },
  'Vancouver': { lat: 49.2827, lng: -123.1207 },
  'Montreal': { lat: 45.5017, lng: -73.5673 },
  'Canada': { lat: 56.1304, lng: -106.3468 },

  // UK
  'London': { lat: 51.5074, lng: -0.1278 },
  'Manchester': { lat: 53.4808, lng: -2.2426 },
  'United Kingdom': { lat: 55.3781, lng: -3.4360 },

  // Australia
  'Sydney': { lat: -33.8688, lng: 151.2093 },
  'Melbourne': { lat: -37.8136, lng: 144.9631 },
  'Australia': { lat: -25.2744, lng: 133.7751 },

  // Japan
  'Tokyo': { lat: 35.6762, lng: 139.6503 },
  'Osaka City': { lat: 34.6937, lng: 135.5023 },
  'Japan': { lat: 36.2048, lng: 138.2529 }
};

/**
 * Resolves latitude and longitude for a given City, Province, and Country.
 */
export async function getCoordinatesForLocation(
  city?: string,
  province?: string,
  country?: string
): Promise<{ lat: number; lng: number }> {
  // Check preset table first
  if (city && PRESET_COORDINATES[city]) {
    return PRESET_COORDINATES[city];
  }
  if (province && PRESET_COORDINATES[province]) {
    return PRESET_COORDINATES[province];
  }
  if (country && PRESET_COORDINATES[country]) {
    return PRESET_COORDINATES[country];
  }

  // Try OpenStreetMap geocoding if network is available
  try {
    const query = [city, province, country].filter(Boolean).join(', ');
    if (query) {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          if (!isNaN(lat) && !isNaN(lng)) {
            return { lat, lng };
          }
        }
      }
    }
  } catch (err) {
    console.warn('Geocoding lookup failed, using region defaults', err);
  }

  // Fallback defaults
  if (country?.toLowerCase().includes('philippine')) {
    return { lat: 9.3068, lng: 123.3054 }; // Default to Dumaguete / Central Visayas
  }
  return { lat: 37.7749, lng: -122.4194 };
}
