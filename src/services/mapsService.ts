import { mockDatabase, getSupabase } from './supabaseClient';
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

  addDonationOpportunity(opp: Omit<DonationOpportunity, 'donation_id'>): DonationOpportunity {
    const created = mockDatabase.addDonationOpportunity(opp);
    const supabase = getSupabase();
    if (supabase) {
      try {
        supabase.from('donation_opportunity').insert([created]).then(() => {}, () => {});
      } catch {}
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
