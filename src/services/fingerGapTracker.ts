import { Landmark, FingerGapMetrics } from '../types';
import { distance2D } from './handGeometry';

export class FingerGapTracker {
  /**
   * Tracks and computes inter-finger gaps, angles, and biometric differentiators
   * for a 21-landmark hand.
   */
  public static trackGaps(lm: Landmark[]): FingerGapMetrics | null {
    if (!lm || lm.length < 21) return null;

    const wrist = lm[0];
    const indexMcp = lm[5];
    const pinkyMcp = lm[17];
    const middleMcp = lm[9];

    // Scale invariant normalizer (palm size)
    const palmWidth = distance2D(indexMcp, pinkyMcp);
    const palmHeight = distance2D(wrist, middleMcp);
    const palmScale = Math.max(0.01, (palmWidth + palmHeight) / 2);

    const normDist = (p1: Landmark, p2: Landmark) => distance2D(p1, p2) / palmScale;

    // Finger Tips
    const thumbTip = lm[4];
    const indexTip = lm[8];
    const middleTip = lm[12];
    const ringTip = lm[16];
    const pinkyTip = lm[20];

    // PIPs
    const indexPip = lm[6];
    const middlePip = lm[10];
    const ringPip = lm[14];
    const pinkyPip = lm[18];

    // MCPs
    const thumbMcp = lm[2];

    // Normalized Euclidean distances between adjacent finger tips
    const thumbIndexGap = Number(normDist(thumbTip, indexTip).toFixed(3));
    const indexMiddleGap = Number(normDist(indexTip, middleTip).toFixed(3));
    const middleRingGap = Number(normDist(middleTip, ringTip).toFixed(3));
    const ringPinkyGap = Number(normDist(ringTip, pinkyTip).toFixed(3));

    // Vector angle calculator in degrees
    const calcAngleDeg = (v1: { x: number; y: number }, v2: { x: number; y: number }): number => {
      const dot = v1.x * v2.x + v1.y * v2.y;
      const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
      if (mag1 === 0 || mag2 === 0) return 0;
      const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
      return Math.round((Math.acos(cos) * 180) / Math.PI);
    };

    const vThumb = { x: thumbTip.x - thumbMcp.x, y: thumbTip.y - thumbMcp.y };
    const vIndex = { x: indexTip.x - indexPip.x, y: indexTip.y - indexPip.y };
    const vMiddle = { x: middleTip.x - middlePip.x, y: middleTip.y - middlePip.y };
    const vRing = { x: ringTip.x - ringPip.x, y: ringTip.y - ringPip.y };
    const vPinky = { x: pinkyTip.x - pinkyPip.x, y: pinkyTip.y - pinkyPip.y };

    const thumbIndexAngle = calcAngleDeg(vThumb, vIndex);
    const indexMiddleAngle = calcAngleDeg(vIndex, vMiddle);
    const middleRingAngle = calcAngleDeg(vMiddle, vRing);
    const ringPinkyAngle = calcAngleDeg(vRing, vPinky);

    // Extension test (tip distance to wrist > pip distance to wrist)
    const isExtended = (tip: Landmark, pip: Landmark) =>
      distance2D(tip, wrist) > distance2D(pip, wrist) * 1.15;

    const extIndex = isExtended(indexTip, indexPip);
    const extMiddle = isExtended(middleTip, middlePip);
    const extRing = isExtended(ringTip, ringPip);
    const extPinky = isExtended(pinkyTip, pinkyPip);

    // ==========================================
    // GAP-BASED BIOMETRIC DIFFERENTIATORS
    // ==========================================

    // 1. Vulcan Salute:
    // Index and Middle are paired close together; Ring and Pinky paired close together;
    // Massive split between Middle and Ring!
    const isVulcanSplit =
      extIndex &&
      extMiddle &&
      extRing &&
      extPinky &&
      middleRingGap > 0.40 &&
      indexMiddleGap < 0.28 &&
      ringPinkyGap < 0.28;

    // 2. Crossed Fingers:
    // Index and Middle are both extended, but overlapping / crossed
    const isCrossedFingers =
      extIndex &&
      extMiddle &&
      !extRing &&
      !extPinky &&
      (indexMiddleGap < 0.16 ||
        // X-coordinates crossed relative to their MCP base
        (indexTip.x - middleTip.x) * (indexMcp.x - middleMcp.x) < 0);

    // 3. Peace Split:
    // Index and Middle extended with distinct V-gap, Ring and Pinky closed
    const isPeaceSplit =
      extIndex &&
      extMiddle &&
      !extRing &&
      !extPinky &&
      indexMiddleGap > 0.32 &&
      indexMiddleAngle > 14 &&
      !isCrossedFingers;

    // 4. OK Pinch:
    // Thumb and index tips meet in pinch circle, other 3 fingers straight
    const isOkPinch =
      thumbIndexGap < 0.26 &&
      extMiddle &&
      extRing &&
      extPinky;

    // 5. Pinching:
    // Thumb and index tips meet, other fingers curled
    const isPinching =
      thumbIndexGap < 0.28 &&
      !extMiddle &&
      !extRing &&
      !extPinky;

    // 6. Money Rub:
    // Thumb, index, and middle tips clustered in rubbing pinch
    const isMoneyRub =
      thumbIndexGap < 0.30 &&
      normDist(thumbTip, middleTip) < 0.32 &&
      !extRing &&
      !extPinky;

    // 7. Horns Split:
    // Index and pinky extended, middle and ring curled
    const isHornsSplit =
      extIndex &&
      extPinky &&
      !extMiddle &&
      !extRing &&
      normDist(indexTip, pinkyTip) > 0.60;

    return {
      thumbIndexGap,
      indexMiddleGap,
      middleRingGap,
      ringPinkyGap,
      thumbIndexAngle,
      indexMiddleAngle,
      middleRingAngle,
      ringPinkyAngle,
      isVulcanSplit,
      isCrossedFingers,
      isPeaceSplit,
      isOkPinch,
      isPinching,
      isMoneyRub,
      isHornsSplit,
    };
  }

  /**
   * Scores finger gap concordance against an expected target gap profile
   */
  public static scoreGapProfile(
    actual: FingerGapMetrics,
    expected: {
      indexMiddleMin?: number;
      indexMiddleMax?: number;
      middleRingMin?: number;
      middleRingMax?: number;
      thumbIndexMax?: number;
    }
  ): number {
    let penalty = 0;

    if (expected.indexMiddleMin !== undefined && actual.indexMiddleGap < expected.indexMiddleMin) {
      penalty += (expected.indexMiddleMin - actual.indexMiddleGap) * 2;
    }
    if (expected.indexMiddleMax !== undefined && actual.indexMiddleGap > expected.indexMiddleMax) {
      penalty += (actual.indexMiddleGap - expected.indexMiddleMax) * 2;
    }
    if (expected.middleRingMin !== undefined && actual.middleRingGap < expected.middleRingMin) {
      penalty += (expected.middleRingMin - actual.middleRingGap) * 2;
    }
    if (expected.middleRingMax !== undefined && actual.middleRingGap > expected.middleRingMax) {
      penalty += (actual.middleRingGap - expected.middleRingMax) * 2;
    }
    if (expected.thumbIndexMax !== undefined && actual.thumbIndexGap > expected.thumbIndexMax) {
      penalty += (actual.thumbIndexGap - expected.thumbIndexMax) * 2;
    }

    return Math.max(0, 1 - penalty);
  }
}
