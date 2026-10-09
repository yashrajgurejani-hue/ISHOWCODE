import { Landmark, HandData, BiomechanicalFingers, FingerPhysicalState, BiomechanicalFingerStates } from '../types';

/**
 * Discretizes continuous 0-100% finger extension into descriptive physical states:
 * - Open (100%): Fully straight and extended (75% - 100%)
 * - Curved (80%): Slightly cupped or arched (60% - 74%)
 * - Bent (50%): Half-curled, gripping, or pinching (30% - 59%)
 * - Closed (0%): Fully curled flat into palm (0% - 29%)
 */
export function extensionToPhysicalState(percent: number): FingerPhysicalState {
  if (percent >= 75) return 'Open';
  if (percent >= 60) return 'Curved';
  if (percent >= 30) return 'Bent';
  return 'Closed';
}

export const PHYSICAL_STATE_TARGETS: Record<FingerPhysicalState, number> = {
  Open: 100,
  Curved: 80,
  Bent: 50,
  Closed: 0,
};

/**
 * MediaPipe Hand 21 Landmark Indices:
 * 0: WRIST
 * 1: THUMB_CMC, 2: THUMB_MCP, 3: THUMB_IP, 4: THUMB_TIP
 * 5: INDEX_FINGER_MCP, 6: INDEX_FINGER_PIP, 7: INDEX_FINGER_DIP, 8: INDEX_FINGER_TIP
 * 9: MIDDLE_FINGER_MCP, 10: MIDDLE_FINGER_PIP, 11: MIDDLE_FINGER_DIP, 12: MIDDLE_FINGER_TIP
 * 13: RING_FINGER_MCP, 14: RING_FINGER_PIP, 15: RING_FINGER_DIP, 16: RING_FINGER_TIP
 * 17: PINKY_MCP, 18: PINKY_PIP, 19: PINKY_DIP, 20: PINKY_TIP
 */

export function distance2D(p1: Landmark, p2: Landmark): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distance3D(p1: Landmark, p2: Landmark): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export interface HandGeometryFeatures {
  wrist: Landmark;
  thumbTip: Landmark;
  palmSize: number; // scale invariant normalizer
  isThumbExtended: boolean;
  isIndexExtended: boolean;
  isMiddleExtended: boolean;
  isRingExtended: boolean;
  isPinkyExtended: boolean;
  thumbCurl: number; // 0 = flat, 1 = curled
  indexCurl: number;
  middleCurl: number;
  ringCurl: number;
  pinkyCurl: number;
  // Continuous physical state calculated 0% to 100%
  thumbExtension: number;  // 0% (curled) to 100% (straight)
  indexExtension: number;  // 0% (curled) to 100% (straight)
  middleExtension: number; // 0% (curled) to 100% (straight)
  ringExtension: number;   // 0% (curled) to 100% (straight)
  pinkyExtension: number;  // 0% (curled) to 100% (straight)
  biomechanics: BiomechanicalFingers;
  thumbIndexDist: number;
  thumbMiddleDist: number;
  thumbRingDist: number;
  thumbPinkyDist: number;
  indexMiddleDist: number;
  middleRingDist: number;
  ringPinkyDist: number;
  indexPointingDirection: { x: number; y: number };
  palmFacingCamera: boolean;
  isDownward: boolean;
  isSideways: boolean;
}

/**
 * Biomechanical functional weights:
 * Thumb:  40% (0.40) - Oppositional grip, anchoring, pinches
 * Index:  25% (0.25) - Directional guide, pointing actuator
 * Middle: 20% (0.20) - Central stability, axis alignment
 * Ring:   10% (0.10) - Supportive strut
 * Pinky:   5% (0.05) - Edge stability, outer bound
 */
export const BIOMECHANICAL_WEIGHTS = {
  thumb: 0.40,
  index: 0.25,
  middle: 0.20,
  ring: 0.10,
  pinky: 0.05,
} as const;

export function extractHandFeatures(lm: Landmark[]): HandGeometryFeatures | null {
  if (!lm || lm.length < 21) return null;

  const wrist = lm[0];
  const indexMcp = lm[5];
  const pinkyMcp = lm[17];
  const middleMcp = lm[9];

  // Palm size metric to normalize distances
  const palmWidth = distance2D(indexMcp, pinkyMcp);
  const palmHeight = distance2D(wrist, middleMcp);
  const palmSize = Math.max(0.01, (palmWidth + palmHeight) / 2);

  const normDist = (p1: Landmark, p2: Landmark) => distance2D(p1, p2) / palmSize;

  // Finger tip distances to wrist and MCPs
  const thumbTip = lm[4];
  const thumbMcp = lm[2];

  const indexTip = lm[8];
  const indexPip = lm[6];

  const middleTip = lm[12];
  const middlePip = lm[10];

  const ringTip = lm[16];
  const ringPip = lm[14];

  const pinkyTip = lm[20];
  const pinkyPip = lm[18];

  // Continuous physical state 0% to 100%
  // 0% = fully curled into palm, 100% = fully straight/extended
  const calcFingerExtension = (tip: Landmark, pip: Landmark, mcp: Landmark): number => {
    const tipDist = distance2D(tip, wrist);
    const pipDist = Math.max(0.001, distance2D(pip, wrist));
    // Extended ratio: tipDist / pipDist typically ranges from ~0.8 (curled) to 1.55+ (fully straight)
    const ratio = tipDist / pipDist;
    const pct = Math.round(((ratio - 0.85) / 0.65) * 100);
    return Math.min(100, Math.max(0, pct));
  };

  // Thumb extension relative to palm scale & index MCP opposition
  const calcThumbExtension = (): number => {
    const distToIndexMcp = distance2D(thumbTip, indexMcp);
    const ratio = distToIndexMcp / Math.max(0.001, palmSize);
    // Ratio ranges from ~0.4 (tucked) to 1.35+ (fully outstretched)
    const pct = Math.round(((ratio - 0.45) / 0.8) * 100);
    return Math.min(100, Math.max(0, pct));
  };

  const thumbExtension = calcThumbExtension();
  const indexExtension = calcFingerExtension(indexTip, indexPip, indexMcp);
  const middleExtension = calcFingerExtension(middleTip, middlePip, middleMcp);
  const ringExtension = calcFingerExtension(ringTip, ringPip, lm[13]);
  const pinkyExtension = calcFingerExtension(pinkyTip, pinkyPip, pinkyMcp);

  // Biomechanical functional score (0 - 100%)
  const functionalScore = Math.round(
    thumbExtension * BIOMECHANICAL_WEIGHTS.thumb +
    indexExtension * BIOMECHANICAL_WEIGHTS.index +
    middleExtension * BIOMECHANICAL_WEIGHTS.middle +
    ringExtension * BIOMECHANICAL_WEIGHTS.ring +
    pinkyExtension * BIOMECHANICAL_WEIGHTS.pinky
  );

  const biomechanics: BiomechanicalFingers = {
    thumb: thumbExtension,
    index: indexExtension,
    middle: middleExtension,
    ring: ringExtension,
    pinky: pinkyExtension,
    functionalScore,
    states: {
      thumb: extensionToPhysicalState(thumbExtension),
      index: extensionToPhysicalState(indexExtension),
      middle: extensionToPhysicalState(middleExtension),
      ring: extensionToPhysicalState(ringExtension),
      pinky: extensionToPhysicalState(pinkyExtension),
    },
  };

  // Boolean threshold tests
  const isThumbExtended = thumbExtension > 45;
  const isIndexExtended = indexExtension > 45;
  const isMiddleExtended = middleExtension > 45;
  const isRingExtended = ringExtension > 45;
  const isPinkyExtended = pinkyExtension > 45;

  // Curl factors: 0 is flat (extended), 1 is fully curled
  const thumbCurl = Math.max(0, Math.min(1, 1 - thumbExtension / 100));
  const indexCurl = Math.max(0, Math.min(1, 1 - indexExtension / 100));
  const middleCurl = Math.max(0, Math.min(1, 1 - middleExtension / 100));
  const ringCurl = Math.max(0, Math.min(1, 1 - ringExtension / 100));
  const pinkyCurl = Math.max(0, Math.min(1, 1 - pinkyExtension / 100));

  // Normalized touch / pinch distances
  const thumbIndexDist = normDist(thumbTip, indexTip);
  const thumbMiddleDist = normDist(thumbTip, middleTip);
  const thumbRingDist = normDist(thumbTip, ringTip);
  const thumbPinkyDist = normDist(thumbTip, pinkyTip);

  const indexMiddleDist = normDist(indexTip, middleTip);
  const middleRingDist = normDist(middleTip, ringTip);
  const ringPinkyDist = normDist(ringTip, pinkyTip);

  // Direction pointing
  const indexPointingDirection = {
    x: (indexTip.x - indexMcp.x) / palmSize,
    y: (indexTip.y - indexMcp.y) / palmSize,
  };

  const isDownward = indexPointingDirection.y > 0.4;
  const isSideways = Math.abs(indexPointingDirection.x) > Math.abs(indexPointingDirection.y) * 1.2;

  // Palm facing test (cross product of wrist->index and wrist->pinky)
  const v1 = { x: indexMcp.x - wrist.x, y: indexMcp.y - wrist.y };
  const v2 = { x: pinkyMcp.x - wrist.x, y: pinkyMcp.y - wrist.y };
  const crossZ = v1.x * v2.y - v1.y * v2.x;
  const palmFacingCamera = crossZ > 0;

  return {
    wrist,
    thumbTip,
    palmSize,
    isThumbExtended,
    isIndexExtended,
    isMiddleExtended,
    isRingExtended,
    isPinkyExtended,
    thumbCurl,
    indexCurl,
    middleCurl,
    ringCurl,
    pinkyCurl,
    thumbExtension,
    indexExtension,
    middleExtension,
    ringExtension,
    pinkyExtension,
    biomechanics,
    thumbIndexDist,
    thumbMiddleDist,
    thumbRingDist,
    thumbPinkyDist,
    indexMiddleDist,
    middleRingDist,
    ringPinkyDist,
    indexPointingDirection,
    palmFacingCamera,
    isDownward,
    isSideways,
  };
}

/**
 * Biomechanically weighted match evaluator.
 * Measures difference between hand state and expected target gesture profile,
 * weighting finger errors by their anatomical contribution (Thumb 40%, Index 25%, Middle 20%, Ring 10%, Pinky 5%).
 */
export function scoreBiomechanicalPose(
  bio: BiomechanicalFingers,
  target: { thumb: number; index: number; middle: number; ring: number; pinky: number },
  tolerance: number = 30
): number {
  const dThumb = Math.abs(bio.thumb - target.thumb);
  const dIndex = Math.abs(bio.index - target.index);
  const dMiddle = Math.abs(bio.middle - target.middle);
  const dRing = Math.abs(bio.ring - target.ring);
  const dPinky = Math.abs(bio.pinky - target.pinky);

  // Weighted error 0 - 100
  const weightedError =
    dThumb * BIOMECHANICAL_WEIGHTS.thumb +
    dIndex * BIOMECHANICAL_WEIGHTS.index +
    dMiddle * BIOMECHANICAL_WEIGHTS.middle +
    dRing * BIOMECHANICAL_WEIGHTS.ring +
    dPinky * BIOMECHANICAL_WEIGHTS.pinky;

  // Confidence from 0.0 to 1.0
  const confidence = Math.max(0, 1 - weightedError / Math.max(10, tolerance * 2));
  return Math.min(0.98, Math.max(0.1, Number(confidence.toFixed(2))));
}

const STATE_RANKS: Record<FingerPhysicalState, number> = {
  Closed: 0,
  Bent: 1,
  Curved: 2,
  Open: 3,
};

function scoreDigitStateMatch(actual: FingerPhysicalState, expected: FingerPhysicalState): number {
  const diff = Math.abs(STATE_RANKS[actual] - STATE_RANKS[expected]);
  if (diff === 0) return 1.0;
  if (diff === 1) return 0.55; // Adjacent state partial credit prevents boundary cliffs
  return 0.0;
}

/**
 * Evaluates pose match directly against the consolidated master physical states:
 * Open (100%), Curved (80%), Bent (50%), Closed (0%)
 * Combined with anatomical digit contribution weighting.
 */
export function scorePhysicalStatePose(
  bio: BiomechanicalFingers,
  expectedStates: BiomechanicalFingerStates,
  tolerance: number = 30
): number {
  const targetPercents = {
    thumb: PHYSICAL_STATE_TARGETS[expectedStates.thumb],
    index: PHYSICAL_STATE_TARGETS[expectedStates.index],
    middle: PHYSICAL_STATE_TARGETS[expectedStates.middle],
    ring: PHYSICAL_STATE_TARGETS[expectedStates.ring],
    pinky: PHYSICAL_STATE_TARGETS[expectedStates.pinky],
  };

  const baseScore = scoreBiomechanicalPose(bio, targetPercents, tolerance);

  // Categorical physical state concordance with adjacent state smoothing
  if (bio.states) {
    let stateConcordance = 0;
    stateConcordance += scoreDigitStateMatch(bio.states.thumb, expectedStates.thumb) * BIOMECHANICAL_WEIGHTS.thumb;
    stateConcordance += scoreDigitStateMatch(bio.states.index, expectedStates.index) * BIOMECHANICAL_WEIGHTS.index;
    stateConcordance += scoreDigitStateMatch(bio.states.middle, expectedStates.middle) * BIOMECHANICAL_WEIGHTS.middle;
    stateConcordance += scoreDigitStateMatch(bio.states.ring, expectedStates.ring) * BIOMECHANICAL_WEIGHTS.ring;
    stateConcordance += scoreDigitStateMatch(bio.states.pinky, expectedStates.pinky) * BIOMECHANICAL_WEIGHTS.pinky;

    const harmonized = baseScore * 0.65 + stateConcordance * 0.35;
    return Math.min(0.98, Math.max(0.1, Number(harmonized.toFixed(2))));
  }

  return baseScore;
}

/**
 * Computes camera proximity metric for a detected hand based on 3D landmarks depth (z)
 * and apparent optical scale (wrist-to-MCP length, MCP span, bounding box area).
 * Returns cameraProximityScore (0-1) and estimatedDistanceMeters (e.g. 0.32m).
 */
export function computeHandCameraProximity(hand: HandData): {
  cameraProximityScore: number;
  estimatedDistanceMeters: number;
} {
  const lm = hand.landmarks;
  if (!lm || lm.length < 21) {
    return { cameraProximityScore: 0.5, estimatedDistanceMeters: 0.5 };
  }

  // 1. Apparent optical scale in 2D image coordinates (larger = closer to camera lens)
  const wristToMiddleMcp = distance2D(lm[0], lm[9]);
  const palmSpan = distance2D(lm[5], lm[17]);

  const xs = lm.map((p: Landmark) => p.x);
  const ys = lm.map((p: Landmark) => p.y);
  const bboxW = Math.max(0.01, Math.max(...xs) - Math.min(...xs));
  const bboxH = Math.max(0.01, Math.max(...ys) - Math.min(...ys));
  const bboxDiag = Math.hypot(bboxW, bboxH);

  const opticalScale = wristToMiddleMcp * 0.45 + palmSpan * 0.25 + bboxDiag * 0.3;

  // 2. Average landmark z depth (MediaPipe hand landmarks: z is relative depth; smaller/more negative is closer to camera)
  let sumZ = 0;
  for (let i = 0; i < 21; i++) {
    sumZ += lm[i].z || 0;
  }
  const avgZ = sumZ / 21;

  // Combining optical scale and z modifier
  // Optical scale ranges typically from 0.08 (distant) to 0.45 (very close)
  const zModifier = -avgZ * 0.35;
  const rawScore = opticalScale * 2.8 + zModifier;
  const cameraProximityScore = Math.max(0.05, Math.min(0.99, Number(rawScore.toFixed(2))));

  // Distance in meters: average palm + middle finger length is ~0.18m
  // In webcam projection: d ~ focal / scale
  const estimatedDistanceMeters = Math.max(
    0.18,
    Math.min(2.5, +(0.26 / Math.max(0.08, opticalScale)).toFixed(2))
  );

  return { cameraProximityScore, estimatedDistanceMeters };
}

/**
 * Evaluates all detected hands, assigns camera proximity metrics,
 * marks which hand is closest to the camera, and returns them with closest hand first.
 */
export function rankHandsByCameraProximity(hands: HandData[]): HandData[] {
  if (!hands || hands.length === 0) return [];

  const evaluated: HandData[] = hands.map((h) => {
    const prox = computeHandCameraProximity(h);
    return {
      ...h,
      cameraProximityScore: prox.cameraProximityScore,
      estimatedDistanceMeters: prox.estimatedDistanceMeters,
      isClosestToCamera: false,
      depthRank: 'secondary',
    };
  });

  if (evaluated.length === 1) {
    evaluated[0].isClosestToCamera = true;
    evaluated[0].depthRank = 'primary_closest';
    return evaluated;
  }

  // Find hand with maximum camera proximity score (closest to camera)
  let maxIdx = 0;
  let maxScore = -1;
  for (let i = 0; i < evaluated.length; i++) {
    if ((evaluated[i].cameraProximityScore || 0) > maxScore) {
      maxScore = evaluated[i].cameraProximityScore || 0;
      maxIdx = i;
    }
  }

  evaluated[maxIdx].isClosestToCamera = true;
  evaluated[maxIdx].depthRank = 'primary_closest';

  // Sort so that closest hand is at index 0 (primary)
  return [evaluated[maxIdx], ...evaluated.filter((_, idx) => idx !== maxIdx)];
}

