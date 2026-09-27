import { mockDatabase, getSupabase } from './supabaseClient';
import { ClothingItem, Tag, BSASAssessment, DailyClothingLog } from '../types/database';

export interface BSASCooldownInfo {
  canTake: boolean;
  daysRemaining: number;
  lastTakenDate: string | null;
  retakeDueDate: string | null;
}

export const closetService = {
  // --- CLOTHING ITEMS ---
  async getItems(userId?: string): Promise<ClothingItem[]> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('clothing_item')
        .select('*, item_tag(tag(*))')
        .order('date_added', { ascending: false });
      if (!error && data) {
        return data as ClothingItem[];
      }
    }
    return mockDatabase.getClothingItems(userId);
  },

  async addItem(item: Omit<ClothingItem, 'item_id' | 'wear_count' | 'date_added'>): Promise<ClothingItem> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('clothing_item')
        .insert([{
          user_id: item.user_id,
          name: item.name,
          image_url: item.image_url,
          addition_type: item.addition_type,
          wear_count: 0,
          color: item.color,
          color_tag: item.color_tag,
          category: item.category,
          type_tag: item.type_tag
        }])
        .select()
        .single();
      if (!error && data) {
        return data as ClothingItem;
      }
    }
    return mockDatabase.addClothingItem(item);
  },

  async updateItem(itemId: number, updates: Partial<ClothingItem>): Promise<ClothingItem | null> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('clothing_item')
        .update(updates)
        .eq('item_id', itemId)
        .select()
        .single();
      if (!error && data) {
        return data as ClothingItem;
      }
    }
    return mockDatabase.updateClothingItem(itemId, updates);
  },

  async deleteItem(itemId: number): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase
        .from('clothing_item')
        .delete()
        .eq('item_id', itemId);
      if (!error) return true;
    }
    return mockDatabase.deleteClothingItem(itemId);
  },

  // --- TAGS ---
  async getTags(): Promise<Tag[]> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('tag').select('*');
      if (!error && data) return data as Tag[];
    }
    return mockDatabase.getTags();
  },

  // --- BSAS ASSESSMENTS ---
  async getAssessments(userId?: string): Promise<BSASAssessment[]> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('bsas_assessment')
        .select('*')
        .order('taken_at', { ascending: false });
      if (!error && data) return data as BSASAssessment[];
    }
    return mockDatabase.getAssessments(userId);
  },

  async submitAssessment(score: number, breakdown?: BSASAssessment['breakdown']): Promise<BSASAssessment> {
    const supabase = getSupabase();
    if (supabase) {
      const risk_level = score >= 4 ? 'Indicative' : 'Non-Indicative';
      const currentUser = mockDatabase.getCurrentUser();
      if (!currentUser) return mockDatabase.addAssessment(score, breakdown);
      const { data, error } = await supabase
        .from('bsas_assessment')
        .insert([{
          user_id: currentUser.user_id,
          score,
          risk_level
        }])
        .select()
        .single();
      if (!error && data) return data as BSASAssessment;
    }
    return mockDatabase.addAssessment(score, breakdown);
  },

  getBSASCooldown(assessments: BSASAssessment[]): BSASCooldownInfo {
    if (!assessments || assessments.length === 0) {
      return {
        canTake: true,
        daysRemaining: 0,
        lastTakenDate: null,
        retakeDueDate: null
      };
    }

    const latest = assessments[0];
    const takenTime = new Date(latest.taken_at).getTime();
    const now = Date.now();
    const cooldownMs = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
    const timeSinceTaken = now - takenTime;
    const remainingMs = cooldownMs - timeSinceTaken;

    if (remainingMs <= 0) {
      return {
        canTake: true,
        daysRemaining: 0,
        lastTakenDate: latest.taken_at,
        retakeDueDate: new Date(takenTime + cooldownMs).toISOString()
      };
    }

    const daysRemaining = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
    return {
      canTake: false,
      daysRemaining,
      lastTakenDate: latest.taken_at,
      retakeDueDate: new Date(takenTime + cooldownMs).toISOString()
    };
  },

  // --- DAILY LOGS ---
  async getTodayLog(): Promise<DailyClothingLog> {
    const today = new Date().toISOString().split('T')[0];
    return mockDatabase.getTodayLog(today);
  },

  async getDailyLogs(): Promise<DailyClothingLog[]> {
    return mockDatabase.getDailyLogs();
  },

  async updateTodayItems(logId: number, items: ClothingItem[]): Promise<DailyClothingLog | null> {
    return mockDatabase.updateTodayLogItems(logId, items);
  },

  async finalizeDailyLog(logId: number): Promise<DailyClothingLog | null> {
    return mockDatabase.finalizeDailyLog(logId);
  },

  async deleteDailyLog(logId: number): Promise<boolean> {
    return mockDatabase.deleteDailyLog(logId);
  },

  async simulateMidnightFinalization(): Promise<DailyClothingLog | null> {
    return mockDatabase.simulateMidnightFinalization();
  },

  // --- WARDROBE ANALYTICS ---
  calculateClosetAnalytics(items: ClothingItem[]) {
    const totalItems = items.length;
    if (totalItems === 0) {
      return {
        totalItems: 0,
        wornItems: 0,
        unwornItems: 0,
        utilizationRate: 0,
        totalWears: 0,
        averageWears: 0,
        oldItemsCount: 0,
        newItemsCount: 0,
        mostWorn: [],
        leastWorn: [],
        unwornList: [],
        co2AvertedKg: 0,
        waterAvertedLiters: 0
      };
    }

    const wornItems = items.filter(i => i.wear_count > 0).length;
    const unwornItems = items.filter(i => i.wear_count === 0).length;
    const utilizationRate = Math.round((wornItems / totalItems) * 100);
    const totalWears = items.reduce((acc, i) => acc + (i.wear_count || 0), 0);
    const averageWears = Math.round((totalWears / totalItems) * 10) / 10;

    const oldItemsCount = items.filter(i => i.addition_type === 'Old').length;
    const newItemsCount = items.filter(i => i.addition_type === 'New').length;

    // Leaderboards
    const sortedByWearDesc = [...items]
      .filter(i => (i.wear_count || 0) > 0)
      .sort((a, b) => (b.wear_count || 0) - (a.wear_count || 0));
    const mostWorn = sortedByWearDesc.slice(0, 5);
    const leastWorn = [...items].sort((a, b) => (a.wear_count || 0) - (b.wear_count || 0)).slice(0, 5);
    const unwornList = items.filter(i => (i.wear_count || 0) === 0);

    // UN SDG 12 environmental formulas:
    // Extending the life of an existing garment by 9 months reduces carbon, waste and water footprints by ~20-30%
    // Each reworn garment averted purchase saves ~6.5kg CO2 and ~2,700 liters of water
    const co2AvertedKg = Math.round(totalWears * 2.8);
    const waterAvertedLiters = Math.round(totalWears * 1250);

    return {
      totalItems,
      wornItems,
      unwornItems,
      utilizationRate,
      totalWears,
      averageWears,
      oldItemsCount,
      newItemsCount,
      mostWorn,
      leastWorn,
      unwornList,
      co2AvertedKg,
      waterAvertedLiters
    };
  }
};
