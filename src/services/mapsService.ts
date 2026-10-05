import { mockDatabase, getSupabase, withTimeout } from './supabaseClient';
import { DonationOpportunity, DonationFlag } from '../types/database';

export const mapsService = {
  getDonationOpportunities(): DonationOpportunity[] {
    return mockDatabase.getDonationOpportunities();
  },

  addFlag(donationId: number, flagType: DonationFlag['flag_type'], notes?: string): DonationFlag {
    const flag = mockDatabase.addDonationFlag(donationId, flagType, notes);
    const supabase = getSupabase();
    if (supabase) {
      try {
        supabase.from('donation_flag').insert([{
          donation_id: flag.donation_id,
          user_id: flag.user_id,
          flag_type: flag.flag_type,
          notes: flag.notes,
          flagged_at: flag.flagged_at
        }]).then(() => {}, () => {});
      } catch {}
    }
    return flag;
  },

  async addDonationOpportunity(opp: Omit<DonationOpportunity, 'donation_id'>): Promise<DonationOpportunity> {
    // 1. Immediately record in persistent local store so the drive shows up on the map right away
    const created = mockDatabase.addDonationOpportunity(opp);

    // 2. Safely synchronize to Supabase (adapts to both full and core schemas)
    const supabase = getSupabase();
    if (supabase) {
      try {
        const fullPayload: Record<string, any> = {
          name: opp.name.trim(),
          address: opp.address.trim(),
          latitude: Number(opp.latitude),
          longitude: Number(opp.longitude),
          hours: opp.hours?.trim() || 'Mon-Sun 8:00 AM - 8:00 PM',
          accepted_types: opp.accepted_types?.trim() || 'Clothing, Shoes, Linens, Bags'
        };

        if (opp.organizer) fullPayload.organizer = opp.organizer.trim();
        if (opp.post_url) fullPayload.post_url = opp.post_url.trim();
        if (opp.post_platform) fullPayload.post_platform = opp.post_platform;
        if (opp.post_title) fullPayload.post_title = opp.post_title.trim();
        if (opp.post_snippet) fullPayload.post_snippet = opp.post_snippet.trim();
        if (typeof opp.is_live_drive === 'boolean') fullPayload.is_live_drive = opp.is_live_drive;
        if (opp.city) fullPayload.city = opp.city.trim();
        if (opp.province) fullPayload.province = opp.province.trim();
        if (opp.barangay) fullPayload.barangay = opp.barangay.trim();

        let { data, error } = await withTimeout(
          supabase
            .from('donation_opportunity')
            .insert([fullPayload])
            .select()
            .single(),
          5000
        );

        // Fallback: If table does not yet have the extra columns, insert core schema fields
        if (error && (error.code === 'PGRST204' || error.code === '42703')) {
          const corePayload = {
            name: opp.name.trim(),
            address: opp.address.trim(),
            latitude: Number(opp.latitude),
            longitude: Number(opp.longitude),
            hours: opp.hours?.trim() || 'Mon-Sun 8:00 AM - 8:00 PM',
            accepted_types: opp.accepted_types?.trim() || 'Clothing, Shoes, Linens, Bags'
          };
          const fallbackRes = await withTimeout(
            supabase
              .from('donation_opportunity')
              .insert([corePayload])
              .select()
              .single(),
            5000
          );
          data = fallbackRes.data;
          error = fallbackRes.error;
        }

        if (!error && data && data.donation_id) {
          mockDatabase.updateDonationOpportunityId(created.donation_id, data.donation_id);
          created.donation_id = data.donation_id;
        } else if (error) {
          console.warn('Supabase remote donation sync notice (saved locally):', error.message);
        }
      } catch (err: any) {
        console.warn('Supabase remote donation sync timeout (saved locally):', err?.message || err);
      }
    }
    return created;
  },

  setDonationOpportunities(opps: DonationOpportunity[]): void {
    mockDatabase.setDonationOpportunities(opps);
  },

  addMultipleDonationOpportunities(opps: DonationOpportunity[]): void {
    mockDatabase.addMultipleDonationOpportunities(opps);
  },

  clearDonationOpportunities(): void {
    mockDatabase.clearDonationOpportunities();
  },

  /**
   * Fetches all donation opportunities from Supabase (shared across all accounts/devices)
   * and merges them into the local mock DB so every user can see drives posted by others.
   * Falls back silently if Supabase is unavailable.
   */
  async fetchAndMergeFromSupabase(): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('donation_opportunity')
          .select('*')
          .order('donation_id', { ascending: false }),
        3000
      );
      if (error || !data || data.length === 0) return;
      const remote = (data as any[])
        .filter(r => r.name && r.name !== 'Test Drive')
        .map(r => ({
          ...r,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          is_live_drive: r.is_live_drive ?? true,
          flags: r.flags || [],
          flags_count: r.flags_count || 0
        })) as DonationOpportunity[];
      mockDatabase.addMultipleDonationOpportunities(remote);
    } catch {
      // Silently ignore network failures — local data still shown
    }
  },

  calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }
};
