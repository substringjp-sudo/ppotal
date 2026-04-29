import type { Region, RegionVisit, VisitCategory } from "@regionevel/types";

export interface VisitDataStore {
  getVisits(): Promise<RegionVisit[]>;
  upsertVisit(regionId: string, category: VisitCategory, count: number, notes?: string): Promise<void>;
  removeVisit(regionId: string, category: VisitCategory): Promise<void>;
  /** Subscribe to real-time changes. Returns unsubscribe function. */
  subscribe(callback: (visits: RegionVisit[]) => void): () => void;
}

export interface RegionDataStore {
  getRegions(iso3: string): Promise<Region[]>;
  seedRegions(regions: Region[]): Promise<void>;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
