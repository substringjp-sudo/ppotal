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
  getChildren(parentId: string | null): Promise<Region[]>;
  getAllRegions(): Promise<Region[]>;
  getRegion(id: string): Promise<Region | null>;
  getRegionsByIds(ids: string[]): Promise<Region[]>;
  getGeometries(ids: string[]): Promise<any[]>;
  getGeometriesByParent: (parentId: string | null) => Promise<any[]>;
  getGeometriesByCountry: (iso3: string, admLevel: number) => Promise<any[]>;
  getGeometryBundle: (iso3: string, admLevel: number) => Promise<any | null>;
  seedRegions: (regions: Region[]) => Promise<void>;
  seedGeometries: (geometries: any[]) => Promise<void>;
  getSimplifiedGeometries: (iso3: string) => Promise<any[]>;
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
