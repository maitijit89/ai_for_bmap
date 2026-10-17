export interface MasterPoiRecord {
  id: string;
  canonicalName: string;
  aliases: string[];
  category: string;
  coordinates: [number, number]; // [lng, lat]
  verifiedEntrances: Array<{
    name: string;
    coordinates: [number, number];
    type: "main" | "parking" | "curbside_pudo";
  }>;
  footfall30DayCount: number;
  vitalityScore: number; // 0 - 100
  confidenceScore: number;
  lastUpdated: string;
}

export const inMemoryMasterPois = new Map<string, MasterPoiRecord>();
