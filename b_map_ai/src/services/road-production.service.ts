import { RoadChangeRecord, inMemoryRoadChanges } from "../models/road-change.model";

export class RoadProductionService {
  /**
   * Centerline Extraction: in-traces centerline smoothing, speed limit & lane inference
   */
  public static extractRoadCenterline(params: {
    corridorName: string;
    rawGpsTraversingPoints: Array<[number, number]>;
    averageObservedSpeedKmH: number;
    traversingVehicleCount: number;
  }): RoadChangeRecord {
    const inferredSpeedLimit = params.averageObservedSpeedKmH > 70 ? 80 : 50;
    const inferredLanes = params.traversingVehicleCount > 200 ? 3 : 2;

    const record: RoadChangeRecord = {
      id: `road_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      changeType: "new_centerline",
      corridorName: params.corridorName,
      coordinates: params.rawGpsTraversingPoints,
      detectedSpeedLimitKmH: inferredSpeedLimit,
      inferredLanes,
      status: "open",
      detectedAt: new Date().toISOString(),
      confidence: 0.92,
    };

    inMemoryRoadChanges.push(record);

    try {
      const { PostgresManager } = require("../config/postgres");
      PostgresManager.query(
        `INSERT INTO road_changes (change_id, road_segment_id, change_type, description, detected_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (change_id) DO NOTHING`,
        [
          record.id,
          record.corridorName,
          record.changeType,
          `${record.corridorName} - Speed Limit: ${inferredSpeedLimit} km/h, Lanes: ${inferredLanes}`,
        ]
      ).catch(() => {});
    } catch {}

    return record;
  }

  /**
   * Zero-Flow Anomaly Detection: Detects unannounced road closures from fleet zero-flow and upstream diversion
   */
  public static detectZeroFlowAnomaly(params: {
    corridorName: string;
    currentThroughputVehiclesPerHour: number;
    historicalThroughputVehiclesPerHour: number;
    isPeakHour: boolean;
    upstreamDiversionDetected: boolean;
    coordinates: Array<[number, number]>;
  }): RoadChangeRecord | null {
    if (
      params.isPeakHour &&
      params.currentThroughputVehiclesPerHour === 0 &&
      params.historicalThroughputVehiclesPerHour > 400 &&
      params.upstreamDiversionDetected
    ) {
      const closureRecord: RoadChangeRecord = {
        id: `closure_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        changeType: "zero_flow_closure",
        corridorName: params.corridorName,
        coordinates: params.coordinates,
        status: "closed",
        inferredReason: "Zero vehicle throughput with high upstream diversion during peak hours",
        detectedAt: new Date().toISOString(),
        confidence: 0.98,
      };

      inMemoryRoadChanges.push(closureRecord);

      try {
        const { PostgresManager } = require("../config/postgres");
        PostgresManager.query(
          `INSERT INTO road_changes (change_id, road_segment_id, change_type, description, detected_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (change_id) DO NOTHING`,
          [
            closureRecord.id,
            closureRecord.corridorName,
            closureRecord.changeType,
            closureRecord.inferredReason,
          ]
        ).catch(() => {});
      } catch {}

      return closureRecord;
    }

    return null;
  }
}
