export interface CameraPose {
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  yawDeg: number; // 0 - 360
  pitchDeg: number; // -90 to +90
  rollDeg: number;
  horizontalFovDeg: number;
}

export interface ArHudElement {
  id: string;
  type: "ground_chevron" | "floating_turn_billboard" | "destination_beacon";
  worldCoordinates: [number, number, number]; // [lng, lat, alt]
  screenXPercent: number; // 0 - 100%
  screenYPercent: number; // 0 - 100%
  depthScaleFactor: number; // e.g. 0.3 - 1.5
  isVisible: boolean;
  label?: string;
}

export class ArWalkCycleService {
  /**
   * 3D Ray-casting transformation of spatial navigation beacons onto 2D screen coordinate percentages
   */
  public static projectToArHud(
    camera: CameraPose,
    targetWorldCoords: [number, number, number],
    elementType: "ground_chevron" | "floating_turn_billboard" | "destination_beacon",
    label?: string
  ): ArHudElement {
    const dLng = targetWorldCoords[0] - camera.longitude;
    const dLat = targetWorldCoords[1] - camera.latitude;

    const metersX = dLng * 111320 * Math.cos((camera.latitude * Math.PI) / 180);
    const metersY = dLat * 110540;
    const distanceMeters = Math.sqrt(metersX * metersX + metersY * metersY);

    const targetBearingDeg = (Math.atan2(metersX, metersY) * 180) / Math.PI;
    let deltaBearing = (targetBearingDeg - camera.yawDeg + 360) % 360;
    if (deltaBearing > 180) deltaBearing -= 360;

    const halfFov = camera.horizontalFovDeg / 2;
    const isVisible = Math.abs(deltaBearing) <= halfFov && distanceMeters <= 500;

    const screenXPercent = Math.min(
      100,
      Math.max(0, 50 + (deltaBearing / halfFov) * 50)
    );

    const normalizedPitch = camera.pitchDeg / 45;
    const baseHorizonY = 55;
    const verticalCompression = Math.min(30, (50 / Math.max(1, distanceMeters)) * 25);
    const screenYPercent = Math.min(
      95,
      Math.max(10, baseHorizonY - normalizedPitch * 20 + verticalCompression)
    );

    const depthScaleFactor = Math.min(1.5, Math.max(0.2, 50 / Math.max(10, distanceMeters)));

    return {
      id: `ar_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: elementType,
      worldCoordinates: targetWorldCoords,
      screenXPercent: Number(screenXPercent.toFixed(1)),
      screenYPercent: Number(screenYPercent.toFixed(1)),
      depthScaleFactor: Number(depthScaleFactor.toFixed(2)),
      isVisible,
      label,
    };
  }
}
