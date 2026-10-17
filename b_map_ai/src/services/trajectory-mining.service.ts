export interface GpsPoint {
  latitude: number;
  longitude: number;
  timestampMs: number;
}

export interface StayPoint {
  id: string;
  centroid: [number, number]; // [lng, lat]
  dwellDurationSeconds: number;
  startTime: Date;
  endTime: Date;
  inferredCategory: string;
  isCurbsidePudo: boolean;
}

export class TrajectoryMiningService {
  /**
   * Spatio-Temporal Stay-Point Extraction (ST-DBSCAN)
   * Spatial movement bound Delta d <= 50m for Delta t >= 300s
   */
  public static extractStayPoints(gpsTraces: GpsPoint[]): StayPoint[] {
    const stayPoints: StayPoint[] = [];
    if (!gpsTraces || !Array.isArray(gpsTraces) || gpsTraces.length < 2) return stayPoints;

    let i = 0;
    while (i < gpsTraces.length) {
      let j = i + 1;
      while (j < gpsTraces.length) {
        const dist = this.haversineDistanceMeters(
          gpsTraces[i].latitude,
          gpsTraces[i].longitude,
          gpsTraces[j].latitude,
          gpsTraces[j].longitude
        );

        if (dist > 50) {
          const deltaT = (gpsTraces[j].timestampMs - gpsTraces[i].timestampMs) / 1000;
          if (deltaT >= 300) {
            stayPoints.push(this.buildStayPoint(gpsTraces.slice(i, j)));
            i = j;
            break;
          } else if (deltaT >= 45 && deltaT <= 240) {
            const pudo = this.buildStayPoint(gpsTraces.slice(i, j));
            pudo.isCurbsidePudo = true;
            pudo.inferredCategory = "curbside_pudo";
            stayPoints.push(pudo);
            i = j;
            break;
          } else {
            i = j;
            break;
          }
        }
        j++;
      }
      if (j >= gpsTraces.length) {
        const deltaT = (gpsTraces[j - 1].timestampMs - gpsTraces[i].timestampMs) / 1000;
        if (deltaT >= 300) {
          stayPoints.push(this.buildStayPoint(gpsTraces.slice(i, j)));
        }
        break;
      }
    }

    return stayPoints;
  }

  /**
   * Multi-user hotspot clustering across multiple stay points (epsilon = 40m, minPts >= 2)
   */
  public static clusterHotspots(stayPoints: StayPoint[], epsilonMeters: number = 40, minPts: number = 2) {
    const clusters: Array<{ centroid: [number, number]; points: StayPoint[]; inferredCategory: string }> = [];
    const visited = new Set<string>();

    for (let i = 0; i < stayPoints.length; i++) {
      const p = stayPoints[i];
      if (visited.has(p.id)) continue;

      const neighbors = stayPoints.filter(
        (other) =>
          this.haversineDistanceMeters(p.centroid[1], p.centroid[0], other.centroid[1], other.centroid[0]) <=
          epsilonMeters
      );

      if (neighbors.length >= minPts) {
        neighbors.forEach((n) => visited.add(n.id));
        const avgLng = neighbors.reduce((acc, n) => acc + n.centroid[0], 0) / neighbors.length;
        const avgLat = neighbors.reduce((acc, n) => acc + n.centroid[1], 0) / neighbors.length;

        clusters.push({
          centroid: [avgLng, avgLat],
          points: neighbors,
          inferredCategory: neighbors[0].inferredCategory,
        });
      }
    }

    return clusters;
  }

  private static buildStayPoint(cluster: GpsPoint[]): StayPoint {
    const avgLat = cluster.reduce((sum, p) => sum + p.latitude, 0) / cluster.length;
    const avgLng = cluster.reduce((sum, p) => sum + p.longitude, 0) / cluster.length;
    const startMs = cluster[0].timestampMs;
    const endMs = cluster[cluster.length - 1].timestampMs;
    const durationSeconds = Math.max(1, (endMs - startMs) / 1000);
    const startDate = new Date(startMs);

    const inferredCategory = this.inferCategory(durationSeconds, startDate.getHours());

    return {
      id: `sp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      centroid: [avgLng, avgLat],
      dwellDurationSeconds: durationSeconds,
      startTime: startDate,
      endTime: new Date(endMs),
      inferredCategory,
      isCurbsidePudo: false,
    };
  }

  public static inferCategory(durationSeconds: number, hourOfDay: number): string {
    const minutes = durationSeconds / 60;
    if (minutes < 18) return "fuel";
    if (minutes >= 30 && minutes <= 120) return "restaurant";
    if (minutes > 120 && minutes <= 240) return "shopping";
    if (minutes > 300) {
      if (hourOfDay >= 9 && hourOfDay <= 18) return "workplace";
      return "residence";
    }
    return "general_poi";
  }

  public static haversineDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const clampedA = Math.min(1, Math.max(0, a));
    const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

    return R * c;
  }
}
