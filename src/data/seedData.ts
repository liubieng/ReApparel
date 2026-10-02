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

export interface BSASQuestionItem {
  id: number;
  text: string;
  dimension: string;
  dimensionKey: 'salience' | 'mood_modification' | 'conflict' | 'tolerance' | 'relapse' | 'withdrawal' | 'problems';
  itemNumberInDimension: number;
}

export const BSAS_28_ITEMS: BSASQuestionItem[] = [
  // 1. Salience (Items 1-4)
  {
    id: 1,
    text: "Shopping/buying is the most important thing in my life.",
    dimension: "Salience",
    dimensionKey: "salience",
    itemNumberInDimension: 1
  },
  {
    id: 2,
    text: "I think about shopping/buying things all the time.",
    dimension: "Salience",
    dimensionKey: "salience",
    itemNumberInDimension: 2
  },
  {
    id: 3,
    text: "I spend a lot of time thinking of or planning shopping/buying.",
    dimension: "Salience",
    dimensionKey: "salience",
    itemNumberInDimension: 3
  },
  {
    id: 4,
    text: "Thoughts about shopping/buying keep popping in my head.",
    dimension: "Salience",
    dimensionKey: "salience",
    itemNumberInDimension: 4
  },
  // 2. Mood Modification (Items 5-8)
  {
    id: 5,
    text: "I shop in order to feel better.",
    dimension: "Mood Modification",
    dimensionKey: "mood_modification",
    itemNumberInDimension: 1
  },
  {
    id: 6,
    text: "I shop/buy things in order to change my mood.",
    dimension: "Mood Modification",
    dimensionKey: "mood_modification",
    itemNumberInDimension: 2
  },
  {
    id: 7,
    text: "I shop/buy things in order to forget about personal problems.",
    dimension: "Mood Modification",
    dimensionKey: "mood_modification",
    itemNumberInDimension: 3
  },
  {
    id: 8,
    text: "I shop/buy things in order to reduce feelings of guilt, anxiety, helplessness, loneliness, and/or depression.",
    dimension: "Mood Modification",
    dimensionKey: "mood_modification",
    itemNumberInDimension: 4
  },
  // 3. Conflict (Items 9-12)
  {
    id: 9,
    text: "I shop/buy so much that it negatively affects my daily obligations (e.g., school and work).",
    dimension: "Conflict",
    dimensionKey: "conflict",
    itemNumberInDimension: 1
  },
  {
    id: 10,
    text: "I give less priority to hobbies, leisure activities, job/studies, or exercise because of shopping/buying.",
    dimension: "Conflict",
    dimensionKey: "conflict",
    itemNumberInDimension: 2
  },
  {
    id: 11,
    text: "I have ignored love partner, family, and friends because of shopping/buying.",
    dimension: "Conflict",
    dimensionKey: "conflict",
    itemNumberInDimension: 3
  },
  {
    id: 12,
    text: "I often end up in arguments with others because of shopping/buying.",
    dimension: "Conflict",
    dimensionKey: "conflict",
    itemNumberInDimension: 4
  },
  // 4. Tolerance (Items 13-16)
  {
    id: 13,
    text: "I feel an increasing inclination to shop/buy things.",
    dimension: "Tolerance",
    dimensionKey: "tolerance",
    itemNumberInDimension: 1
  },
  {
    id: 14,
    text: "I shop/buy much more than I had intended/planned.",
    dimension: "Tolerance",
    dimensionKey: "tolerance",
    itemNumberInDimension: 2
  },
  {
    id: 15,
    text: "I feel I have to shop/buy more and more to obtain the same satisfaction as before.",
    dimension: "Tolerance",
    dimensionKey: "tolerance",
    itemNumberInDimension: 3
  },
  {
    id: 16,
    text: "I spend more and more time shopping/buying.",
    dimension: "Tolerance",
    dimensionKey: "tolerance",
    itemNumberInDimension: 4
  },
  // 5. Relapse (Items 17-20)
  {
    id: 17,
    text: "I have tried to cut down on shopping/buying without success.",
    dimension: "Relapse",
    dimensionKey: "relapse",
    itemNumberInDimension: 1
  },
  {
    id: 18,
    text: "I have been told by others to reduce shopping/buying without listening to them.",
    dimension: "Relapse",
    dimensionKey: "relapse",
    itemNumberInDimension: 2
  },
  {
    id: 19,
    text: "I have decided to shop/buy less, but have not been able to do so.",
    dimension: "Relapse",
    dimensionKey: "relapse",
    itemNumberInDimension: 3
  },
  {
    id: 20,
    text: "I have managed to limit shopping/buying for periods, and then experienced relapse.",
    dimension: "Relapse",
    dimensionKey: "relapse",
    itemNumberInDimension: 4
  },
  // 6. Withdrawal (Items 21-24)
  {
    id: 21,
    text: "I become stressed if obstructed from shopping/buying things.",
    dimension: "Withdrawal",
    dimensionKey: "withdrawal",
    itemNumberInDimension: 1
  },
  {
    id: 22,
    text: "I become sour and grumpy if I for some reasons cannot shop/buy things when I feel like it.",
    dimension: "Withdrawal",
    dimensionKey: "withdrawal",
    itemNumberInDimension: 2
  },
  {
    id: 23,
    text: "I feel bad if I for some reason are prevented from shopping/buying things.",
    dimension: "Withdrawal",
    dimensionKey: "withdrawal",
    itemNumberInDimension: 3
  },
  {
    id: 24,
    text: "If there has been a while since I last shopped I feel a strong urge to shop/buy things.",
    dimension: "Withdrawal",
    dimensionKey: "withdrawal",
    itemNumberInDimension: 4
  },
  // 7. Problems (Items 25-28)
  {
    id: 25,
    text: "I shop/buy so much that it has caused economic problems.",
    dimension: "Problems",
    dimensionKey: "problems",
    itemNumberInDimension: 1
  },
  {
    id: 26,
    text: "I shop/buy so much that it has impaired my well-being.",
    dimension: "Problems",
    dimensionKey: "problems",
    itemNumberInDimension: 2
  },
  {
    id: 27,
    text: "I have worried so much about my shopping that it sometimes has made me sleepless.",
    dimension: "Problems",
    dimensionKey: "problems",
    itemNumberInDimension: 3
  },
  {
    id: 28,
    text: "I have been bothered with poor conscience because of shopping/buying.",
    dimension: "Problems",
    dimensionKey: "problems",
    itemNumberInDimension: 4
  }
];

export const BSAS_RESPONSE_OPTIONS = [
  { val: 0, label: 'Completely Disagree', badge: '0' },
  { val: 1, label: 'Disagree', badge: '1' },
  { val: 2, label: 'Neither Disagree Nor Agree', badge: '2' },
  { val: 3, label: 'Agree', badge: '3' },
  { val: 4, label: 'Completely Agree', badge: '4' }
];

// Alias for backwards-compatibility
export const BSAS_QUESTIONS = BSAS_28_ITEMS;

export const INITIAL_USERS: User[] = [];

// Curated Core Color Families specification
export interface CuratedColorFamily {
  name: string;
  hex: string;
}

export const CURATED_COLOR_FAMILIES: CuratedColorFamily[] = [
  { name: 'Black', hex: '#18181b' },
  { name: 'White', hex: '#f8fafc' },
  { name: 'Gray', hex: '#64748b' },
  { name: 'Navy', hex: '#1e293b' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Burgundy', hex: '#881337' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Olive', hex: '#65a30d' },
  { name: 'Brown', hex: '#78350f' },
  { name: 'Beige', hex: '#d6c7a1' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Neutral', hex: '#a8a29e' }
];

// Standard core clothing colors for everyday wardrobes (normal colors for clothes)
export const NORMAL_CLOTHING_COLORS: CuratedColorFamily[] = [
  { name: 'Black', hex: '#18181b' },
  { name: 'White', hex: '#f8fafc' },
  { name: 'Gray', hex: '#64748b' },
  { name: 'Navy', hex: '#1e293b' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Brown', hex: '#78350f' },
  { name: 'Beige', hex: '#d6c7a1' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Red', hex: '#dc2626' }
];

export const CATEGORIES = ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Dresses', 'Knitwear'] as const;
export const GARMENT_TYPES = ['Shirt', 'Pants', 'Skirt', 'Shorts', 'Dress', 'One-Piece', 'Shoes', 'Outerwear'] as const;

// SVG Silhouette Helper for crisp vector garments
export const createGarmentSilhouette = (color: string, label: string, type: 'top' | 'bottom' | 'outerwear' | 'dress' | 'shoes' = 'top') => {
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

  { tag_id: 8, tag_name: 'Shirt', tag_type: 'Category' },
  { tag_id: 9, tag_name: 'Pants', tag_type: 'Category' },
  { tag_id: 10, tag_name: 'Skirt', tag_type: 'Category' },
  { tag_id: 11, tag_name: 'Shorts', tag_type: 'Category' },
  { tag_id: 12, tag_name: 'One-Piece', tag_type: 'Category' },

  // Curated Core Color Families
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
  { tag_id: 114, tag_name: 'Violet', tag_type: 'Color', hex_color: '#8b5cf6' },
  { tag_id: 115, tag_name: 'Orange', tag_type: 'Color', hex_color: '#f97316' },
  { tag_id: 116, tag_name: 'Neutral', tag_type: 'Color', hex_color: '#a8a29e' }
];

export const INITIAL_CLOTHING_ITEMS: ClothingItem[] = [];

export const INITIAL_ASSESSMENTS: BSASAssessment[] = [];

export const INITIAL_DAILY_LOGS: DailyClothingLog[] = [];

// Empty friends and borrow requests
export const INITIAL_FRIEND_REQUESTS: FriendRequest[] = [];

export const INITIAL_BORROWS: Borrow[] = [];

export const INITIAL_DONATION_OPPORTUNITIES: DonationOpportunity[] = [];



