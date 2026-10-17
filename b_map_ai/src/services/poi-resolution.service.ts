import { MasterPoiRecord, inMemoryMasterPois } from "../models/master-poi.model";
import { TrajectoryMiningService } from "./trajectory-mining.service";

export interface PoiCandidate {
  name: string;
  category: string;
  coordinates: [number, number]; // [lng, lat]
  source: string;
}

export class PoiResolutionService {
  /**
   * Multi-Attribute Match Score Formula:
   * Score = 0.45 * TextSim + 0.40 * GeoSim + 0.15 * CatSim
   */
  public static calculateMatchScore(
    candidate: PoiCandidate,
    master: MasterPoiRecord
  ): {
    totalScore: number;
    textSim: number;
    geoSim: number;
    catSim: number;
  } {
    // 1. Text Similarity (Jaccard token similarity + substring boost)
    const textSim = this.jaccardSimilarity(candidate.name, master.canonicalName);

    // 2. Geospatial Linear Distance Decay over 100m (0 beyond 120m)
    const distanceMeters = TrajectoryMiningService.haversineDistanceMeters(
      candidate.coordinates[1],
      candidate.coordinates[0],
      master.coordinates[1],
      master.coordinates[0]
    );

    let geoSim = 0;
    if (distanceMeters <= 100) {
      geoSim = Math.max(0, 1 - distanceMeters / 100);
    } else if (distanceMeters <= 120) {
      geoSim = Math.max(0, ((120 - distanceMeters) / 20) * 0.1);
    } else {
      geoSim = 0;
    }

    // 3. Category Similarity: Exact match (1.0) vs mismatch (0.4)
    const catSim =
      candidate.category.toLowerCase() === master.category.toLowerCase() ? 1.0 : 0.4;

    const totalScore = 0.45 * textSim + 0.4 * geoSim + 0.15 * catSim;

    return { totalScore, textSim, geoSim, catSim };
  }

  /**
   * Golden Record Fusion: merges candidate into Master POI if Score >= 0.70
   */
  public static fuseCandidate(candidate: PoiCandidate): {
    action: "fused" | "created_new";
    masterPoi: MasterPoiRecord;
    matchScore: number;
  } {
    let bestMatch: MasterPoiRecord | null = null;
    let highestScore = 0;

    for (const master of inMemoryMasterPois.values()) {
      const match = this.calculateMatchScore(candidate, master);
      if (match.totalScore > highestScore) {
        highestScore = match.totalScore;
        bestMatch = master;
      }
    }

    if (bestMatch && highestScore >= 0.7) {
      if (!bestMatch.aliases.includes(candidate.name)) {
        bestMatch.aliases.push(candidate.name);
      }
      bestMatch.footfall30DayCount += 1;
      bestMatch.vitalityScore = Math.min(100, bestMatch.vitalityScore + 2);
      bestMatch.lastUpdated = new Date().toISOString();

      return {
        action: "fused",
        masterPoi: bestMatch,
        matchScore: highestScore,
      };
    }

    const newId = `poi_master_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newMaster: MasterPoiRecord = {
      id: newId,
      canonicalName: candidate.name,
      aliases: [candidate.name],
      category: candidate.category,
      coordinates: candidate.coordinates,
      verifiedEntrances: [
        {
          name: "Main Entrance",
          coordinates: candidate.coordinates,
          type: "main",
        },
      ],
      footfall30DayCount: 1,
      vitalityScore: 60,
      confidenceScore: 0.85,
      lastUpdated: new Date().toISOString(),
    };

    inMemoryMasterPois.set(newId, newMaster);

    // Persist to Neon PostgreSQL
    try {
      const { PostgresManager } = require("../config/postgres");
      PostgresManager.query(
        `INSERT INTO master_pois (
           master_poi_id, name, category, coordinates, longitude, latitude,
           sentiment_score, metadata, verified, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
         ON CONFLICT (master_poi_id) DO UPDATE SET
           name = EXCLUDED.name,
           category = EXCLUDED.category,
           metadata = EXCLUDED.metadata,
           updated_at = NOW()`,
        [
          newId,
          newMaster.canonicalName,
          newMaster.category,
          JSON.stringify(newMaster.coordinates),
          newMaster.coordinates[0],
          newMaster.coordinates[1],
          newMaster.vitalityScore,
          JSON.stringify(newMaster),
        ]
      ).catch(() => {});
    } catch {
      // Non-blocking
    }

    return {
      action: "created_new",
      masterPoi: newMaster,
      matchScore: highestScore,
    };
  }

  private static jaccardSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) return 0.85;

    const tokens1 = new Set(s1.split(/\s+/));
    const tokens2 = new Set(s2.split(/\s+/));

    const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }
}
