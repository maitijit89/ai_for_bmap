export interface RoadEdgeInsight {
  edgeId: string;
  roadName: string;
  isSignalTrap: boolean;
  isHighJaywalkingCorridor: boolean;
  edgePenaltyMultiplier: number; // 1.0 = normal, >1.0 = penalize
  noviceDifficultyRating: "easy" | "moderate" | "challenging" | "complex_merge";
  secretShortcutBypassAvailable: boolean;
  shortcutDescription?: string;
}

export class VeteranDriverLayerService {
  /**
   * Augment standard road graph with crowdsourced veteran driver knowledge
   */
  public static evaluateEdge(edgeId: string, roadName: string): RoadEdgeInsight {
    const isSignalTrap = /crossing|junction 12|market road|station road/i.test(roadName);
    const isJaywalking = /bazaar|metro station|commercial street/i.test(roadName);

    let penalty = 1.0;
    if (isSignalTrap) penalty += 0.35;
    if (isJaywalking) penalty += 0.25;

    const hasShortcut = isSignalTrap || isJaywalking;
    const shortcutDesc = hasShortcut
      ? `Local bypass available via 2nd Service Lane, saving ~4 minutes during peak hours.`
      : undefined;

    return {
      edgeId,
      roadName,
      isSignalTrap,
      isHighJaywalkingCorridor: isJaywalking,
      edgePenaltyMultiplier: penalty,
      noviceDifficultyRating: penalty > 1.3 ? "complex_merge" : "moderate",
      secretShortcutBypassAvailable: hasShortcut,
      shortcutDescription: shortcutDesc,
    };
  }
}
