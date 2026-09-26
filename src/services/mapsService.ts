import { mockDatabase } from './supabaseClient';
import { DonationOpportunity, DonationFlag } from '../types/database';

export const mapsService = {
  getDonationOpportunities(): DonationOpportunity[] {
    return mockDatabase.getDonationOpportunities();
  },

  addFlag(donationId: number, flagType: DonationFlag['flag_type'], notes?: string): DonationFlag {
    return mockDatabase.addDonationFlag(donationId, flagType, notes);
  },

  addDonationOpportunity(opp: Omit<DonationOpportunity, 'donation_id'>): DonationOpportunity {
    return mockDatabase.addDonationOpportunity(opp);
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
