export interface RoadChangeRecord {
  id: string;
  changeType: "new_centerline" | "zero_flow_closure" | "speed_limit_change" | "lane_count_update";
  corridorName: string;
  coordinates: Array<[number, number]>;
  detectedSpeedLimitKmH?: number;
  inferredLanes?: number;
  status: "open" | "closed" | "diverted";
  inferredReason?: string;
  detectedAt: string;
  confidence: number;
}

class BoundedArray<T> extends Array<T> {
  constructor(private maxItems: number = 500) {
    super();
  }

  override push(...items: T[]): number {
    const res = super.push(...items);
    while (this.length > this.maxItems) {
      this.shift();
    }
    return res;
  }
}

export const inMemoryRoadChanges = new BoundedArray<RoadChangeRecord>(500);
