import { mockDatabase, getSupabase, withTimeout, ensureUserSyncedToSupabase } from './supabaseClient';
import { DonationOpportunity, DonationFlag } from '../types/database';

export function isOpportunityExpired(opp: DonationOpportunity): boolean {
  if (opp.end_date) {
    const end = new Date(`${opp.end_date}T23:59:59`).getTime();
    if (!isNaN(end) && end < Date.now()) {
      return true;
    }
  }
  return false;
}

export const mapsService = {
  isOpportunityExpired,

  getDonationOpportunities(): DonationOpportunity[] {
    return mockDatabase.getDonationOpportunities();
  },

  addFlag(donationId: number, flagType: DonationFlag['flag_type'], notes?: string): DonationFlag {
    const flag = mockDatabase.addDonationFlag(donationId, flagType, notes);
    const supabase = getSupabase();
    if (supabase) {
      (async () => {
        try {
          const user = mockDatabase.getCurrentUser();
          let finalUid: string | null = null;
          if (user) {
            const synced = await ensureUserSyncedToSupabase(user);
            finalUid = synced.user_id;
          }
          const isUuid = finalUid ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalUid) : false;
          await supabase.from('donation_flag').insert([{
            donation_id: flag.donation_id,
            user_id: isUuid ? finalUid : null,
            flag_type: flag.flag_type,
            notes: flag.notes,
            flagged_at: flag.flagged_at
          }]);
        } catch {}
      })();
    }
    return flag;
  },

  async addDonationOpportunity(opp: Omit<DonationOpportunity, 'donation_id'>): Promise<DonationOpportunity> {
    const currentUser = mockDatabase.getCurrentUser();
    if (currentUser) {
      try {
        await ensureUserSyncedToSupabase(currentUser);
      } catch {}
    }

    const created = mockDatabase.addDonationOpportunity(opp);

    const supabase = getSupabase();
    if (supabase) {
      try {

        const metaTag = (opp.created_by || opp.end_date || opp.start_date)
          ? ` [REAPPAREL_META:${JSON.stringify({ created_by: opp.created_by, start_date: opp.start_date, end_date: opp.end_date })}]`
          : '';

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
        fullPayload.post_snippet = ((opp.post_snippet || '') + metaTag).trim() || null;
        if (typeof opp.is_live_drive === 'boolean') fullPayload.is_live_drive = opp.is_live_drive;
        if (opp.city) fullPayload.city = opp.city.trim();
        if (opp.province) fullPayload.province = opp.province.trim();
        if (opp.barangay) fullPayload.barangay = opp.barangay.trim();
        if (opp.created_by) fullPayload.created_by = opp.created_by;
        if (opp.start_date) fullPayload.start_date = opp.start_date;
        if (opp.end_date) fullPayload.end_date = opp.end_date;

        let { data, error } = await withTimeout(
          supabase
            .from('donation_opportunity')
            .insert([fullPayload])
            .select()
            .single(),
          5000
        );

        if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('column') || error.message?.includes('schema cache'))) {
          const corePayload: Record<string, any> = {
            name: opp.name.trim(),
            address: opp.address.trim(),
            latitude: Number(opp.latitude),
            longitude: Number(opp.longitude),
            hours: opp.hours?.trim() || 'Mon-Sun 8:00 AM - 8:00 PM',
            accepted_types: opp.accepted_types?.trim() || 'Clothing, Shoes, Linens, Bags',
            post_snippet: ((opp.post_snippet || '') + metaTag).trim() || null
          };
          if (opp.organizer) corePayload.organizer = opp.organizer.trim();
          if (opp.city) corePayload.city = opp.city.trim();
          if (opp.province) corePayload.province = opp.province.trim();
          if (opp.barangay) corePayload.barangay = opp.barangay.trim();

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
          console.warn('Supabase remote donation sync notice:', error.message);
          if (error.code === '42501') {
            throw new Error('Supabase RLS policy blocked the donation upload. Please run the SQL fix in Supabase SQL Editor.');
          }
        }
      } catch (err: any) {
        if (err?.message?.includes('RLS')) throw err;
        console.warn('Supabase remote donation sync notice (saved locally):', err?.message || err);
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

  async fetchAndMergeFromSupabase(): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('donation_opportunity')
          .select('*')
          .order('donation_id', { ascending: false })
          .limit(200),
        3000
      );
      if (error || !data || data.length === 0) return;
      this.mergeRemoteRows(data as any[]);
    } catch {

    }
  },

  mergeRemoteRows(rows: any[]): void {
    const remote = rows
      .filter(r => r && r.name && r.name !== 'Test Drive')
      .map(r => {
        let created_by = r.created_by;
        let start_date = r.start_date;
        let end_date = r.end_date;
        let snippet = r.post_snippet || '';

        const metaMatch = snippet.match(/\s*\[REAPPAREL_META:(\{.*?\})\]\s*/);
        if (metaMatch) {
          try {
            const parsed = JSON.parse(metaMatch[1]);
            if (!created_by && parsed.created_by) created_by = parsed.created_by;
            if (!start_date && parsed.start_date) start_date = parsed.start_date;
            if (!end_date && parsed.end_date) end_date = parsed.end_date;
            snippet = snippet.replace(metaMatch[0], '').trim();
          } catch {}
        }

        return {
          ...r,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          is_live_drive: r.is_live_drive ?? true,
          flags: r.flags || [],
          flags_count: r.flags_count || 0,
          created_by,
          start_date,
          end_date,
          post_snippet: snippet || undefined
        };
      }) as DonationOpportunity[];
    if (remote.length > 0) mockDatabase.addMultipleDonationOpportunities(remote);
  },

  removeDonationOpportunity(donationId: number): void {
    mockDatabase.deleteDonationOpportunity(donationId);
  },

  async deleteDonationOpportunity(donationId: number, currentUserId?: string): Promise<boolean> {
    const opp = mockDatabase.getDonationOpportunities().find(o => o.donation_id === donationId);
    if (opp && opp.created_by && currentUserId && opp.created_by !== currentUserId) {
      throw new Error('Only the user who uploaded this donation opportunity can delete it.');
    }

    mockDatabase.deleteDonationOpportunity(donationId);

    const supabase = getSupabase();
    if (supabase) {
      try {
        await Promise.allSettled([
          supabase.from('donation_flag').delete().eq('donation_id', donationId),
          supabase.from('donation_opportunity').delete().eq('donation_id', donationId)
        ]);
      } catch (err) {
        console.warn('Error deleting donation opportunity from Supabase:', err);
      }
    }
    return true;
  },

  calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
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
