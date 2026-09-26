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

export const INITIAL_TAGS: Tag[] = [
  { tag_id: 1, tag_name: 'Shirt', tag_type: 'Category' },
  { tag_id: 2, tag_name: 'Skirt', tag_type: 'Category' },
  { tag_id: 3, tag_name: 'Pants', tag_type: 'Category' },
  { tag_id: 4, tag_name: 'Dress', tag_type: 'Category' },
  { tag_id: 5, tag_name: 'Shorts', tag_type: 'Category' },
  { tag_id: 6, tag_name: 'One-Piece', tag_type: 'Category' },
  { tag_id: 7, tag_name: 'Shoes', tag_type: 'Category' }
];

export const INITIAL_CLOTHING_ITEMS: ClothingItem[] = [
  {
    item_id: 1001,
    user_id: 'u-mario-01',
    name: 'Vintage Forest Cotton Shirt',
    type_tag: 'Shirt',
    category: 'Shirt',
    color_tag: '#3E6B45',
    addition_type: 'Old',
    wear_count: 8,
    date_added: '2026-08-15T00:00:00.000Z',
    image_url: '#3E6B45',
    images: ['#3E6B45']
  },
  {
    item_id: 1002,
    user_id: 'u-mario-01',
    name: 'Tailored Indigo Denim Pants',
    type_tag: 'Pants',
    category: 'Pants',
    color_tag: '#5B7FA6',
    addition_type: 'Old',
    wear_count: 5,
    date_added: '2026-08-20T00:00:00.000Z',
    image_url: '#5B7FA6',
    images: ['#5B7FA6']
  },
  {
    item_id: 1003,
    user_id: 'u-mario-01',
    name: 'Earthy Wool Knit Sweater',
    type_tag: 'Shirt',
    category: 'Shirt',
    color_tag: '#B98F5E',
    addition_type: 'New',
    wear_count: 0,
    date_added: '2026-09-10T00:00:00.000Z',
    image_url: '#B98F5E',
    images: ['#B98F5E']
  },
  {
    item_id: 2001,
    user_id: 'u-liu-02',
    name: 'Classic Linen Blazer',
    type_tag: 'One-Piece',
    category: 'One-Piece',
    color_tag: '#C7A06B',
    addition_type: 'Old',
    wear_count: 12,
    date_added: '2026-08-10T00:00:00.000Z',
    image_url: '#C7A06B',
    images: ['#C7A06B']
  },
  {
    item_id: 2002,
    user_id: 'u-liu-02',
    name: 'Midnight Chino Trousers',
    type_tag: 'Pants',
    category: 'Pants',
    color_tag: '#2A2A2E',
    addition_type: 'Old',
    wear_count: 7,
    date_added: '2026-08-12T00:00:00.000Z',
    image_url: '#2A2A2E',
    images: ['#2A2A2E']
  },
  {
    item_id: 2003,
    user_id: 'u-liu-02',
    name: 'Burgundy Silk Pleated Skirt',
    type_tag: 'Skirt',
    category: 'Skirt',
    color_tag: '#8B5E6B',
    addition_type: 'New',
    wear_count: 1,
    date_added: '2026-09-14T00:00:00.000Z',
    image_url: '#8B5E6B',
    images: ['#8B5E6B']
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
