export interface User {
  userId: string;
  name: string;
  email: string;
  loginTime: string;
}

export interface SessionPayload {
  userId: string;
  name: string;
  email: string;
  loginTime: string;
  sessionStartTime: number;
  totalGesturesDetected: number;
  sessionDuration: string; // e.g. "00:14:22"
}

export interface SessionLog extends SessionPayload {
  id: string;
  endedAt?: string;
  detectedSignHistory: Array<{
    sign: string;
    timestamp: string;
    confidence: number;
  }>;
}

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface HandData {
  handedness: 'Left' | 'Right';
  landmarks: Landmark[]; // 21 points
  score?: number;
  isClosestToCamera?: boolean;
  cameraProximityScore?: number; // 0.0 - 1.0 (1.0 = closest to lens)
  estimatedDistanceMeters?: number; // e.g. 0.32m
  depthRank?: 'primary_closest' | 'secondary';
}

export interface FaceComparisonResult {
  similarityScore: number; // 0.0 - 1.0 (identity & landmark consistency against anchor)
  isSamePerson: boolean;
  anchorLocked: boolean;
  headPose: {
    yaw: 'center' | 'left' | 'right';
    pitch: 'level' | 'up' | 'down';
    tiltAngle: number;
  };
  faceDistanceMeters: number; // e.g. 0.48m
  handFaceRelation?: {
    closestHandToFace: 'Left' | 'Right' | 'None';
    distanceToMouth: number;
    distanceToForehead: number;
    isHandInFrontOfFace: boolean;
  };
}

export type GestureCategory =
  | 'universal_greetings'
  | 'conversational_expressive'
  | 'audible_rhythmic'
  | 'commands_directions'
  | 'warnings_negative'
  | 'tactical_symbolic';

/**
 * Descriptive Physical Finger States (Consolidated Master Standard):
 * - Open (100%): Fully straight and extended
 * - Curved (80%): Slightly cupped or arched (e.g. cupping face)
 * - Bent (50%): Half-curled, gripping, or pinching
 * - Closed (0%): Fully curled flat into the palm
 */
export type FingerPhysicalState = 'Open' | 'Curved' | 'Bent' | 'Closed';

export interface BiomechanicalFingerStates {
  thumb: FingerPhysicalState;
  index: FingerPhysicalState;
  middle: FingerPhysicalState;
  ring: FingerPhysicalState;
  pinky: FingerPhysicalState;
}

export interface BiomechanicalFingers {
  thumb: number;   // 0 - 100% (Contribution: 40%)
  index: number;   // 0 - 100% (Contribution: 25%)
  middle: number;  // 0 - 100% (Contribution: 20%)
  ring: number;    // 0 - 100% (Contribution: 10%)
  pinky: number;   // 0 - 100% (Contribution: 5%)
  functionalScore: number; // Weighted composite 0 - 100%
  states?: BiomechanicalFingerStates;
}

export interface FaceData {
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  center: Landmark;
  forehead: Landmark;
  noseTip: Landmark;
  mouth: Landmark;
  chin: Landmark;
  leftEye: Landmark;
  rightEye: Landmark;
  templeLeft: Landmark;
  templeRight: Landmark;
  neckRegion: Landmark;
  chestRegion: Landmark;
  confidence: number;
  comparison?: FaceComparisonResult;
}

export interface FingerGapMetrics {
  thumbIndexGap: number;
  indexMiddleGap: number;
  middleRingGap: number;
  ringPinkyGap: number;
  thumbIndexAngle: number;
  indexMiddleAngle: number;
  middleRingAngle: number;
  ringPinkyAngle: number;
  isVulcanSplit: boolean;
  isCrossedFingers: boolean;
  isPeaceSplit: boolean;
  isOkPinch: boolean;
  isPinching: boolean;
  isMoneyRub: boolean;
  isHornsSplit: boolean;
}

export interface TwoHandMetrics {
  wristDistance: number;
  palmDistance: number;
  indexTipDistance: number;
  thumbTipDistance: number;
  middleTipDistance: number;
  handsPresent: number;
  relativeOrientation: 'facing' | 'parallel' | 'crossed' | 'stacked' | 'arched' | 'apart';
  isHandshakePose: boolean;
  isClapPose: boolean;
  isNamastePose: boolean;
  isCrossedWristsPose: boolean;
  isRubbingPalmsPose: boolean;
  isTwoHandedHeartPose: boolean;
  confidenceScores: Record<string, number>;
}

export interface GestureDefinition {
  id: number;
  pdfNumber: number;
  emoji: string;
  category: GestureCategory;
  categoryName: string;
  sign: string;
  outputText: string;
  poseDescription: string;
  isDynamic: boolean;
  fingerStates: BiomechanicalFingerStates;
  uiAction?: 'stop' | 'repeat' | 'slow' | 'emergency';
  requiresFace?: boolean;
  isTwoHand?: boolean;
  gapDifferentiator?: string;
  matchRule: (
    hand: HandData,
    prevFrames?: HandData[][],
    face?: FaceData | null,
    secondHand?: HandData | null,
    twoHandMetrics?: TwoHandMetrics | null,
    gapMetrics?: FingerGapMetrics | null
  ) => number; // returns confidence 0-1
}

export interface CaptionConfig {
  fontFamily:
    | 'Inter'
    | 'Roboto'
    | 'Montserrat'
    | 'Open Sans'
    | 'Lexend'
    | 'Poppins'
    | 'Merriweather'
    | 'Playfair Display'
    | 'Fira Code'
    | 'Outfit';
  fontSize: number; // 14 - 48 px
  fontWeight: 300 | 400 | 500 | 600 | 700 | 800;
  textColor: string;
  bgColor: string;
  bgOpacity: number; // 0 - 100%
  hasTextShadow: boolean;
  textAlign: 'left' | 'center' | 'right';
}

export interface TTSConfig {
  apiKey: string;
  voice: string;
  pitch: number; // 0.5 - 2
  rate: number;  // 0.5 - 2
  autoSpeak: boolean;
}

export type GestureDetectionState = 'idle' | 'tracking' | 'locking' | 'committed' | 'cooldown';

export interface DetectionResult {
  gesture: GestureDefinition;
  confidence: number;
  hand: 'Left' | 'Right';
  timestamp: number;
  state?: GestureDetectionState;
  lockProgress?: number; // 0.0 to 1.0 (for circular lock-in ring)
  modelSource?: 'mediapipe_tasks' | 'asl_classifier' | 'simulation' | 'tfjs_realtime_gesrec' | 'mediapipe_hands' | 'two_hand_engine';
  boundingBox?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  isTwoHand?: boolean;
  faceAligned?: boolean;
  gapMetrics?: FingerGapMetrics;
}
