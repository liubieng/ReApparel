import { 
  BSASQuestion, 
  User, 
  Tag, 
  ClothingItem, 
  BSASAssessment, 
  DailyClothingLog, 
  FriendRequest, 
  Borrow, 
  DonationOpportunity, 
  DonationFlag 
} from '../types/database';

export const BSAS_QUESTIONS: BSASQuestion[] = [
  {
    id: 1,
    key: 'salience',
    title: '1. Salience & Preoccupation',
    description: 'You think about shopping and buying products all the time.',
    dimension: 'Salience'
  },
  {
    id: 2,
    key: 'mood_modification',
    title: '2. Mood Modification',
    description: 'You shop or buy things in order to change your mood or relieve stress.',
    dimension: 'Mood Modification'
  },
  {
    id: 3,
    key: 'conflict',
    title: '3. Interpersonal Conflict',
    description: 'Shopping has caused friction with people close to you or impaired your daily responsibilities.',
    dimension: 'Conflict'
  },
  {
    id: 4,
    key: 'tolerance',
    title: '4. Escalation & Tolerance',
    description: 'You feel you have to buy more and more than before to achieve the same satisfaction.',
    dimension: 'Tolerance'
  },
  {
    id: 5,
    key: 'withdrawal',
    title: '5. Withdrawal & Unease',
    description: 'You feel restless, anxious, or irritable if you are prevented or unable to shop.',
    dimension: 'Withdrawal'
  },
  {
    id: 6,
    key: 'relapse',
    title: '6. Loss of Control & Relapse',
    description: 'You have tried to cut down or stop shopping, but were unable to succeed.',
    dimension: 'Relapse'
  },
  {
    id: 7,
    key: 'problems',
    title: '7. Negative Consequences & Problems',
    description: 'Shopping has resulted in debts, financial difficulties, or harmed your personal wellbeing.',
    dimension: 'Problems'
  }
];

export const INITIAL_USERS: User[] = [
  {
    user_id: 'u-mario-01',
    email: 'mario@example.com',
    first_name: 'Mario',
    last_name: 'Lee',
    friend_code: 'RP-MARI-1024',
    created_at: '2026-09-01T00:00:00.000Z'
  },
  {
    user_id: 'u-liu-02',
    email: 'liu@example.com',
    first_name: 'Liu',
    last_name: 'Chen',
    friend_code: 'RP-LIUC-2048',
    created_at: '2026-09-02T00:00:00.000Z'
  }
];

// SVG Silhouette Helper for crisp vector garments
const createGarmentSilhouette = (color: string, label: string, type: 'top' | 'bottom' | 'outerwear' | 'dress' | 'shoes' = 'top') => {
  let path = 'M50 60 L75 40 L100 55 L125 40 L150 60 L135 85 L125 80 L125 160 L75 160 L75 80 L65 85 Z'; // top/shirt
  if (type === 'bottom') {
    path = 'M65 45 L135 45 L130 160 L105 160 L100 90 L95 160 L70 160 Z'; // pants
  } else if (type === 'outerwear') {
    path = 'M45 55 L75 35 L100 50 L125 35 L155 55 L140 90 L130 85 L130 165 L70 165 L70 85 L60 90 Z'; // jacket/coat
  } else if (type === 'dress') {
    path = 'M70 45 L100 55 L130 45 L120 85 L150 165 L50 165 L80 85 Z'; // dress
  } else if (type === 'shoes') {
    path = 'M40 120 L80 120 L95 90 L125 90 L135 120 L165 120 C165 145 150 155 125 155 L40 155 Z'; // shoes
  }
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" fill="%23f8fafc" rx="16"/><path d="${path}" fill="${encodeURIComponent(color)}" stroke="%23334155" stroke-width="2.5" stroke-linejoin="round"/><text x="100" y="188" font-family="sans-serif" font-size="10" font-weight="700" fill="%2364748b" text-anchor="middle">${label}</text></svg>`;
};

export const INITIAL_TAGS: Tag[] = [
  // Core Categories (Prompt Specification)
  { tag_id: 1, tag_name: 'Tops', tag_type: 'Category' },
  { tag_id: 2, tag_name: 'Bottoms', tag_type: 'Category' },
  { tag_id: 3, tag_name: 'Outerwear', tag_type: 'Category' },
  { tag_id: 4, tag_name: 'Shoes', tag_type: 'Category' },
  { tag_id: 5, tag_name: 'Dresses', tag_type: 'Category' },
  { tag_id: 6, tag_name: 'Knitwear', tag_type: 'Category' },
  { tag_id: 7, tag_name: 'Accessories', tag_type: 'Category' },
  { tag_id: 8, tag_name: 'Shirt', tag_type: 'Category' },
  { tag_id: 9, tag_name: 'Pants', tag_type: 'Category' },
  { tag_id: 10, tag_name: 'Skirt', tag_type: 'Category' },
  { tag_id: 11, tag_name: 'Shorts', tag_type: 'Category' },
  { tag_id: 12, tag_name: 'One-Piece', tag_type: 'Category' },

  // 14 Curated Core Color Families (Prompt Specification)
  { tag_id: 101, tag_name: 'Black', tag_type: 'Color', hex_color: '#18181b' },
  { tag_id: 102, tag_name: 'White', tag_type: 'Color', hex_color: '#f8fafc' },
  { tag_id: 103, tag_name: 'Gray', tag_type: 'Color', hex_color: '#64748b' },
  { tag_id: 104, tag_name: 'Navy', tag_type: 'Color', hex_color: '#1e293b' },
  { tag_id: 105, tag_name: 'Blue', tag_type: 'Color', hex_color: '#2563eb' },
  { tag_id: 106, tag_name: 'Red', tag_type: 'Color', hex_color: '#dc2626' },
  { tag_id: 107, tag_name: 'Burgundy', tag_type: 'Color', hex_color: '#881337' },
  { tag_id: 108, tag_name: 'Green', tag_type: 'Color', hex_color: '#16a34a' },
  { tag_id: 109, tag_name: 'Olive', tag_type: 'Color', hex_color: '#65a30d' },
  { tag_id: 110, tag_name: 'Brown', tag_type: 'Color', hex_color: '#78350f' },
  { tag_id: 111, tag_name: 'Beige', tag_type: 'Color', hex_color: '#d6c7a1' },
  { tag_id: 112, tag_name: 'Yellow', tag_type: 'Color', hex_color: '#eab308' },
  { tag_id: 113, tag_name: 'Pink', tag_type: 'Color', hex_color: '#ec4899' },
  { tag_id: 114, tag_name: 'Neutral', tag_type: 'Color', hex_color: '#a8a29e' }
];

export const INITIAL_CLOTHING_ITEMS: ClothingItem[] = [
  {
    item_id: 1001,
    user_id: 'u-mario-01',
    name: 'Vintage Forest Cotton Shirt',
    type_tag: 'Shirt',
    category: 'Tops',
    color: 'Green',
    color_tag: '#3E6B45',
    addition_type: 'Old',
    wear_count: 8,
    date_added: '2026-08-15T00:00:00.000Z',
    image_url: createGarmentSilhouette('#3E6B45', 'Vintage Forest Shirt', 'top'),
    images: [createGarmentSilhouette('#3E6B45', 'Vintage Forest Shirt', 'top')]
  },
  {
    item_id: 1002,
    user_id: 'u-mario-01',
    name: 'Tailored Indigo Denim Pants',
    type_tag: 'Pants',
    category: 'Bottoms',
    color: 'Blue',
    color_tag: '#5B7FA6',
    addition_type: 'Old',
    wear_count: 5,
    date_added: '2026-08-20T00:00:00.000Z',
    image_url: createGarmentSilhouette('#5B7FA6', 'Tailored Indigo Denim', 'bottom'),
    images: [createGarmentSilhouette('#5B7FA6', 'Tailored Indigo Denim', 'bottom')]
  },
  {
    item_id: 1003,
    user_id: 'u-mario-01',
    name: 'Earthy Wool Knit Sweater',
    type_tag: 'Shirt',
    category: 'Knitwear',
    color: 'Brown',
    color_tag: '#B98F5E',
    addition_type: 'New',
    wear_count: 0,
    date_added: '2026-09-10T00:00:00.000Z',
    image_url: createGarmentSilhouette('#B98F5E', 'Earthy Wool Knit', 'top'),
    images: [createGarmentSilhouette('#B98F5E', 'Earthy Wool Knit', 'top')]
  },
  {
    item_id: 2001,
    user_id: 'u-liu-02',
    name: 'Classic Linen Blazer',
    type_tag: 'One-Piece',
    category: 'Outerwear',
    color: 'Beige',
    color_tag: '#C7A06B',
    addition_type: 'Old',
    wear_count: 12,
    date_added: '2026-08-10T00:00:00.000Z',
    image_url: createGarmentSilhouette('#C7A06B', 'Classic Linen Blazer', 'outerwear'),
    images: [createGarmentSilhouette('#C7A06B', 'Classic Linen Blazer', 'outerwear')]
  },
  {
    item_id: 2002,
    user_id: 'u-liu-02',
    name: 'Midnight Chino Trousers',
    type_tag: 'Pants',
    category: 'Bottoms',
    color: 'Black',
    color_tag: '#2A2A2E',
    addition_type: 'Old',
    wear_count: 7,
    date_added: '2026-08-12T00:00:00.000Z',
    image_url: createGarmentSilhouette('#2A2A2E', 'Midnight Chino', 'bottom'),
    images: [createGarmentSilhouette('#2A2A2E', 'Midnight Chino', 'bottom')]
  },
  {
    item_id: 2003,
    user_id: 'u-liu-02',
    name: 'Burgundy Silk Pleated Skirt',
    type_tag: 'Skirt',
    category: 'Bottoms',
    color: 'Burgundy',
    color_tag: '#8B5E6B',
    addition_type: 'New',
    wear_count: 1,
    date_added: '2026-09-14T00:00:00.000Z',
    image_url: createGarmentSilhouette('#8B5E6B', 'Burgundy Silk Skirt', 'bottom'),
    images: [createGarmentSilhouette('#8B5E6B', 'Burgundy Silk Skirt', 'bottom')]
  }
];

export const INITIAL_ASSESSMENTS: BSASAssessment[] = [];

export const INITIAL_DAILY_LOGS: DailyClothingLog[] = [];

// Empty friends and borrow requests
export const INITIAL_FRIEND_REQUESTS: FriendRequest[] = [];

export const INITIAL_BORROWS: Borrow[] = [];

export const INITIAL_DONATION_OPPORTUNITIES: DonationOpportunity[] = [
  {
    donation_id: 1,
    name: 'Bagumbayan Community Clothing Drop-off',
    address: 'Barangay Hall, Bagumbayan, Quezon City, NCR',
    latitude: 14.6305,
    longitude: 121.0505,
    hours: 'Mon-Sun 8:00 AM - 6:00 PM',
    accepted_types: 'Shirts, Pants, Children Clothing, Everyday Wear',
    is_live_drive: true,
    organizer: 'Barangay Bagumbayan Council',
    source_url: '#',
    post_url: '#',
    post_platform: 'facebook',
    post_title: 'Clothing drive at the barangay hall drop-off bin.',
    post_snippet: 'Community clothing drive at the barangay hall. Accepting shirts, jeans, and children attire.',
    post_date: '2026-09-23',
    days_ago: 2,
    active_window: 'Daily drop-off bin',
    is_last_30_days: true,
    country: 'Philippines',
    province: 'NCR',
    city: 'Bagumbayan',
    flags_count: 0,
    flags: []
  },
  {
    donation_id: 2,
    name: 'Sustainable Manila Porch Collection Box',
    address: 'Calle Real, Bagumbayan, Quezon City, NCR',
    latitude: 14.6262,
    longitude: 121.0478,
    hours: 'Flexible 24/7 bin access',
    accepted_types: 'Jackets, Shoes, Warm Clothing',
    is_live_drive: true,
    organizer: '@sustainable_manila',
    source_url: '#',
    post_url: '#',
    post_platform: 'instagram',
    post_title: 'Coat & Shoe Drop Box.',
    post_snippet: 'Free coats and shoes collection bin. Accessible 24/7 on our porch.',
    post_date: '2026-09-20',
    days_ago: 5,
    active_window: 'Open 24/7',
    is_last_30_days: true,
    country: 'Philippines',
    province: 'NCR',
    city: 'Bagumbayan',
    flags_count: 0,
    flags: []
  },
  {
    donation_id: 3,
    name: 'Caritas San Isidro Textile Bank',
    address: 'San Isidro Parish Hall, Antipolo, Region IV-A',
    latitude: 14.5880,
    longitude: 121.1760,
    hours: 'Tue-Sat 9:00 AM - 4:00 PM',
    accepted_types: 'Formalwear, School Uniforms, Shoes',
    is_live_drive: true,
    organizer: 'Caritas Diocesan Care',
    source_url: '#',
    post_url: '#',
    post_platform: 'announcement',
    post_title: 'Textile and uniform recycling drive.',
    post_snippet: 'Collecting clean school uniforms and workwear for underserved high school scholars.',
    post_date: '2026-09-22',
    days_ago: 3,
    active_window: 'Active this month',
    is_last_30_days: true,
    country: 'Philippines',
    province: 'Region IV-A',
    city: 'San Isidro',
    flags_count: 1,
    flags: [
      {
        flag_id: 101,
        donation_id: 3,
        user_id: 'community-reporter',
        flag_type: 'Inaccurate',
        notes: 'Gate hours close earlier at 3:30 PM on Thursdays.',
        flagged_at: '2026-09-24T10:00:00Z',
        user_name: 'Elena Ramos'
      }
    ]
  },
  {
    donation_id: 4,
    name: 'Dumaguete Circular Hub Drop-off',
    address: 'Perdices St, Dumaguete City, Negros Oriental',
    latitude: 9.3068,
    longitude: 123.3085,
    hours: 'Mon-Fri 10:00 AM - 5:00 PM',
    accepted_types: 'All Clean Clothing, Linens, Fabrics',
    is_live_drive: true,
    organizer: 'Visayas Eco Collective',
    source_url: '#',
    post_url: '#',
    post_platform: 'community',
    post_title: 'Visayas textile reclamation center.',
    post_snippet: 'Drop off pre-loved items for upcycling and community redistribution across Negros Oriental.',
    post_date: '2026-09-18',
    days_ago: 7,
    active_window: 'Year-round',
    is_last_30_days: true,
    country: 'Philippines',
    province: 'Negros Oriental',
    city: 'Dumaguete City',
    flags_count: 0,
    flags: []
  },
  {
    donation_id: 5,
    name: 'Cubao Green Recycle Station',
    address: 'Aurora Blvd, Cubao, Quezon City, NCR',
    latitude: 14.6200,
    longitude: 121.0535,
    hours: 'Daily 7:00 AM - 8:00 PM',
    accepted_types: 'Shoes, Sneakers, Sports Gear',
    is_live_drive: false,
    organizer: 'EcoBayanihan Metro',
    source_url: '#',
    post_url: '#',
    post_platform: 'facebook',
    post_title: 'Footwear & Athletic Gear Bin.',
    post_snippet: 'Dedicated drop-off bin for athletic shoes and activewear. Repurposed for local youth sports teams.',
    post_date: '2026-09-15',
    days_ago: 10,
    active_window: 'Permanent bin',
    is_last_30_days: true,
    country: 'Philippines',
    province: 'NCR',
    city: 'Bagumbayan',
    flags_count: 0,
    flags: []
  }
];
