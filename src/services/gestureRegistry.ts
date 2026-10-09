import { GestureDefinition, HandData, FaceData, TwoHandMetrics, FingerGapMetrics } from '../types';
import { extractHandFeatures, scorePhysicalStatePose } from './handGeometry';
import { FaceTracker } from './faceTracker';

export const ASL_GESTURE_REGISTRY: GestureDefinition[] = [
  // ==========================================
  // PAGE 1: UNIVERSAL & GREETINGS (#1 - #10)
  // ==========================================
  {
    id: 1,
    pdfNumber: 1,
    emoji: '👍',
    category: 'universal_greetings',
    categoryName: 'Universal & Greetings',
    sign: 'Thumbs Up',
    outputText: 'YES',
    poseDescription: 'Thumb extended vertically upward (40% anchor weight), four fingers curled tight into palm (approval/yes)',
    isDynamic: false,
    fingerStates: { thumb: 'Open', index: 'Closed', middle: 'Closed', ring: 'Closed', pinky: 'Closed' },
    gapDifferentiator: 'Thumb Upright, 4 Digits Curled',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.indexExtension >= 45 || f.middleExtension >= 45 || f.ringExtension >= 40 || f.pinkyExtension >= 40) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Closed',
        middle: 'Closed',
        ring: 'Closed',
        pinky: 'Closed',
      }, 30);
      if (hand.landmarks[4].y < hand.landmarks[2].y - 0.05) {
        return Math.min(0.98, base + 0.16);
      }
      return base * 0.75;
    },
  },
  {
    id: 2,
    pdfNumber: 2,
    emoji: '👎',
    category: 'universal_greetings',
    categoryName: 'Universal & Greetings',
    sign: 'Thumbs Down',
    outputText: 'NO',
    poseDescription: 'Thumb extended downward below knuckles, fingers curled into palm (disapproval/no)',
    isDynamic: false,
    fingerStates: { thumb: 'Open', index: 'Closed', middle: 'Closed', ring: 'Closed', pinky: 'Closed' },
    gapDifferentiator: 'Thumb Downward, 4 Digits Curled',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.indexExtension >= 45 || f.middleExtension >= 45 || f.ringExtension >= 40 || f.pinkyExtension >= 40) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Closed',
        middle: 'Closed',
        ring: 'Closed',
        pinky: 'Closed',
      }, 30);
      if (hand.landmarks[4].y > hand.landmarks[2].y + 0.05) {
        return Math.min(0.98, base + 0.16);
      }
      return base * 0.6;
    },
  },
  {
    id: 3,
    pdfNumber: 3,
    emoji: '👋',
    category: 'universal_greetings',
    categoryName: 'Universal & Greetings',
    sign: 'Open Palm Wave',
    outputText: 'HELLO',
    poseDescription: 'All five fingers fully extended straight (100%), open palm facing camera (hello/goodbye)',
    isDynamic: false,
    fingerStates: { thumb: 'Open', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
    gapDifferentiator: 'Flat Open Hand, All Digits Extended',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Open',
        middle: 'Open',
        ring: 'Open',
        pinky: 'Open',
      }, 28);
      if (f.palmFacingCamera && !f.isDownward && hand.landmarks[0].y > 0.4) {
        return Math.min(0.96, base + 0.1);
      }
      return base;
    },
  },
  {
    id: 4,
    pdfNumber: 4,
    emoji: '🤝',
    category: 'universal_greetings',
    categoryName: 'Universal & Greetings',
    sign: 'Handshake',
    outputText: 'AGREED',
    poseDescription: 'Two hands reaching in and gripping with fingers half-bent (50%) in mutual handshake posture',
    isDynamic: false,
    isTwoHand: true,
    fingerStates: { thumb: 'Bent', index: 'Bent', middle: 'Bent', ring: 'Bent', pinky: 'Bent' },
    gapDifferentiator: 'Two Hands Gripping / Bent Digits',
    matchRule: (
      hand: HandData,
      _prev?: HandData[][],
      _face?: FaceData | null,
      _secondHand?: HandData | null,
      twoHandMetrics?: TwoHandMetrics | null
    ) => {
      if (twoHandMetrics && twoHandMetrics.isHandshakePose) {
        return twoHandMetrics.confidenceScores['Handshake (Gripping)'] || 0.96;
      }
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Bent',
        index: 'Bent',
        middle: 'Bent',
        ring: 'Bent',
        pinky: 'Bent',
      }, 32);
      return f.isSideways ? Math.min(0.92, base + 0.1) : base * 0.85;
    },
  },
  {
    id: 5,
    pdfNumber: 5,
    emoji: '🖐️',
    category: 'universal_greetings',
    categoryName: 'Universal & Greetings',
    sign: 'High Five',
    outputText: 'CELEBRATE',
    poseDescription: 'Vertical open palm held elevated high above head facing camera (celebration/success)',
    isDynamic: false,
    fingerStates: { thumb: 'Open', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
    gapDifferentiator: 'Elevated High Open Palm',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Open',
        middle: 'Open',
        ring: 'Open',
        pinky: 'Open',
      }, 26);
      if (hand.landmarks[0].y < 0.38 && f.palmFacingCamera) {
        return Math.min(0.98, base + 0.15);
      }
      return base * 0.7;
    },
  },
  {
    id: 6,
    pdfNumber: 6,
    emoji: '👊',
    category: 'universal_greetings',
    categoryName: 'Universal & Greetings',
    sign: 'Fist Bump',
    outputText: 'RESPECT',
    poseDescription: 'All five fingers curled tight (0%) into a forward-facing fist (casual greeting/respect)',
    isDynamic: false,
    fingerStates: { thumb: 'Closed', index: 'Closed', middle: 'Closed', ring: 'Closed', pinky: 'Closed' },
    gapDifferentiator: 'Full Closed Fist (Zero Digits Extended)',
    matchRule: (hand: HandData, _prev?: HandData[][], _face?: FaceData | null, _second?: HandData | null, _two?: TwoHandMetrics | null, gapMetrics?: FingerGapMetrics | null) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      // Disqualify if middle finger is extended (Middle Finger / Insult) or any other finger is extended!
      if (f.middleExtension > 35 || f.indexExtension > 35 || f.ringExtension > 35 || f.pinkyExtension > 35) return 0;
      if (gapMetrics && (gapMetrics.isOkPinch || gapMetrics.isPeaceSplit || gapMetrics.isVulcanSplit || gapMetrics.isHornsSplit)) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Closed',
        index: 'Closed',
        middle: 'Closed',
        ring: 'Closed',
        pinky: 'Closed',
      }, 25);
      return Math.min(0.96, base);
    },
  },
  {
    id: 7,
    pdfNumber: 7,
    emoji: '🙏',
    category: 'universal_greetings',
    categoryName: 'Universal & Greetings',
    sign: 'Praying Hands / Namaste',
    outputText: 'NAMASTE',
    poseDescription: 'Two flat open palms pressed flush together, fingertips touching pointing upward at chest (Namaste/prayer)',
    isDynamic: false,
    isTwoHand: true,
    fingerStates: { thumb: 'Open', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
    gapDifferentiator: 'Opposing Flat Palms + Tips Touching Upward',
    matchRule: (
      hand: HandData,
      _prev?: HandData[][],
      _face?: FaceData | null,
      _secondHand?: HandData | null,
      twoHandMetrics?: TwoHandMetrics | null
    ) => {
      if (twoHandMetrics && twoHandMetrics.isNamastePose) {
        return twoHandMetrics.confidenceScores['Praying Hands / Namaste'] || 0.98;
      }
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Open',
        middle: 'Open',
        ring: 'Open',
        pinky: 'Open',
      }, 26);
      if (hand.landmarks[8].y < hand.landmarks[0].y && f.isSideways) {
        return Math.min(0.92, base + 0.1);
      }
      return base * 0.8;
    },
  },
  {
    id: 8,
    pdfNumber: 8,
    emoji: '🫡',
    category: 'universal_greetings',
    categoryName: 'Universal & Greetings',
    sign: 'Military Salute',
    outputText: 'SALUTE',
    poseDescription: 'Flat hand with 4 fingers straight and thumb tucked, held at the temple or forehead edge',
    isDynamic: false,
    requiresFace: true,
    fingerStates: { thumb: 'Closed', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
    gapDifferentiator: 'Hand at Temple / Forehead Edge',
    matchRule: (hand: HandData, _prev?: HandData[][], face?: FaceData | null) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.indexExtension < 60 || f.middleExtension < 60) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Closed',
        index: 'Open',
        middle: 'Open',
        ring: 'Open',
        pinky: 'Open',
      }, 28);
      const isTempleAligned = FaceTracker.isNearTemple(hand, face || null);
      if (isTempleAligned) {
        return Math.min(0.98, base + 0.20);
      }
      // If hand is elevated near top of frame
      if (hand.landmarks[8].y < 0.40) {
        return Math.min(0.90, base + 0.08);
      }
      return base * 0.5; // low score if not near head
    },
  },
  {
    id: 9,
    pdfNumber: 9,
    emoji: '🤙',
    category: 'universal_greetings',
    categoryName: 'Universal & Greetings',
    sign: 'Shaka / Hang Loose',
    outputText: 'CHILL',
    poseDescription: 'Thumb and pinky extended out (100%), index, middle, and ring curled flat (0%) (surf culture/chill)',
    isDynamic: false,
    fingerStates: { thumb: 'Open', index: 'Closed', middle: 'Closed', ring: 'Closed', pinky: 'Open' },
    gapDifferentiator: 'Thumb + Pinky Out, 3 Inner Digits Curled',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.middleExtension > 40 || f.ringExtension > 40 || f.indexExtension > 40) return 0;
      if (f.pinkyExtension < 60 || f.thumbExtension < 60) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Closed',
        middle: 'Closed',
        ring: 'Closed',
        pinky: 'Open',
      }, 26);
      return Math.min(0.97, base + 0.12);
    },
  },
  {
    id: 10,
    pdfNumber: 10,
    emoji: '🫀',
    category: 'universal_greetings',
    categoryName: 'Universal & Greetings',
    sign: 'Hand on Heart',
    outputText: 'HONOR',
    poseDescription: 'Open flat hand placed gently over the heart/chest below neck (loyalty/pledge of allegiance)',
    isDynamic: false,
    requiresFace: true,
    fingerStates: { thumb: 'Open', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
    gapDifferentiator: 'Flat Palm on Upper Chest Below Neck',
    matchRule: (hand: HandData, _prev?: HandData[][], face?: FaceData | null) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Open',
        middle: 'Open',
        ring: 'Open',
        pinky: 'Open',
      }, 30);
      const isChestAligned = FaceTracker.isNearChest(hand, face || null);
      if (isChestAligned) {
        return Math.min(0.97, base + 0.18);
      }
      return hand.landmarks[0].y > 0.55 ? Math.min(0.90, base + 0.08) : base * 0.7;
    },
  },

  // ==========================================
  // PAGE 2: EXPRESSIVE & CONVERSATIONAL (#11 - #20)
  // ==========================================
  {
    id: 11,
    pdfNumber: 11,
    emoji: '👉',
    category: 'conversational_expressive',
    categoryName: 'Conversational & Expressive',
    sign: 'Pointing Index Finger',
    outputText: 'LOOK',
    poseDescription: 'Index finger fully extended straight (100%), other four fingers curled into fist (directing attention)',
    isDynamic: false,
    fingerStates: { thumb: 'Closed', index: 'Open', middle: 'Closed', ring: 'Closed', pinky: 'Closed' },
    gapDifferentiator: 'Index Isolated Extended, Others Curled',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.indexExtension < 65 || f.middleExtension > 35 || f.ringExtension > 35 || f.pinkyExtension > 35) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Closed',
        index: 'Open',
        middle: 'Closed',
        ring: 'Closed',
        pinky: 'Closed',
      }, 26);
      return Math.min(0.97, base + 0.12);
    },
  },
  {
    id: 12,
    pdfNumber: 12,
    emoji: '👌',
    category: 'conversational_expressive',
    categoryName: 'Conversational & Expressive',
    sign: 'OK Sign',
    outputText: 'OK',
    poseDescription: 'Thumb and index tips touch (50% bent) in circle; middle, ring, pinky straight up (100% open) (okay/perfection)',
    isDynamic: false,
    fingerStates: { thumb: 'Bent', index: 'Bent', middle: 'Open', ring: 'Open', pinky: 'Open' },
    gapDifferentiator: 'Thumb-Index Tip Pinch + 3 Open Digits',
    matchRule: (
      hand: HandData,
      _prev?: HandData[][],
      _face?: FaceData | null,
      _second?: HandData | null,
      _two?: TwoHandMetrics | null,
      gapMetrics?: FingerGapMetrics | null
    ) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      // MUST have middle, ring, pinky extended!
      if (f.middleExtension < 50 || f.ringExtension < 45 || f.pinkyExtension < 45) return 0;
      if (gapMetrics && gapMetrics.isOkPinch) {
        return 0.97;
      }
      if (f.thumbIndexDist < 0.35) {
        return 0.94;
      }
      return 0.65;
    },
  },
  {
    id: 13,
    pdfNumber: 13,
    emoji: '✌️',
    category: 'conversational_expressive',
    categoryName: 'Conversational & Expressive',
    sign: 'Peace Sign / V-Sign',
    outputText: 'PEACE',
    poseDescription: 'Index and middle fingers extended straight in V-shape with distinct gap; thumb curls over ring and pinky (peace/victory)',
    isDynamic: false,
    fingerStates: { thumb: 'Closed', index: 'Open', middle: 'Open', ring: 'Closed', pinky: 'Closed' },
    gapDifferentiator: 'Index-Middle V-Gap > 32%, Ring & Pinky Curled',
    matchRule: (
      hand: HandData,
      _prev?: HandData[][],
      _face?: FaceData | null,
      _second?: HandData | null,
      _two?: TwoHandMetrics | null,
      gapMetrics?: FingerGapMetrics | null
    ) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.indexExtension < 65 || f.middleExtension < 65 || f.ringExtension > 35 || f.pinkyExtension > 35) return 0;
      // If fingers are crossed, this is CROSSED FINGERS (#14), NOT Peace Sign!
      if (gapMetrics && gapMetrics.isCrossedFingers) return 0;
      if (gapMetrics && gapMetrics.isPeaceSplit) return 0.97;
      if (f.indexMiddleDist > 0.30) {
        return 0.95;
      }
      return 0.80;
    },
  },
  {
    id: 14,
    pdfNumber: 14,
    emoji: '🤞',
    category: 'conversational_expressive',
    categoryName: 'Conversational & Expressive',
    sign: 'Crossed Fingers',
    outputText: 'HOPE',
    poseDescription: 'Index and middle fingers extended with middle finger crossed over index finger (wishing for good luck/hope)',
    isDynamic: false,
    fingerStates: { thumb: 'Closed', index: 'Open', middle: 'Open', ring: 'Closed', pinky: 'Closed' },
    gapDifferentiator: 'Index & Middle Overlapping/Crossed',
    matchRule: (
      hand: HandData,
      _prev?: HandData[][],
      _face?: FaceData | null,
      _second?: HandData | null,
      _two?: TwoHandMetrics | null,
      gapMetrics?: FingerGapMetrics | null
    ) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.indexExtension < 60 || f.middleExtension < 60 || f.ringExtension > 35 || f.pinkyExtension > 35) return 0;
      if (gapMetrics && gapMetrics.isCrossedFingers) {
        return 0.97;
      }
      // Tight tip proximity with extended joints
      if (f.indexMiddleDist < 0.20) {
        return 0.92;
      }
      return 0;
    },
  },
  {
    id: 15,
    pdfNumber: 15,
    emoji: '✌️',
    category: 'conversational_expressive',
    categoryName: 'Conversational & Expressive',
    sign: 'Air Quotes',
    outputText: 'IRONY',
    poseDescription: 'Index and middle fingers bent twice (50% bent) simulating quotation marks (irony/sarcasm)',
    isDynamic: true,
    fingerStates: { thumb: 'Closed', index: 'Bent', middle: 'Bent', ring: 'Closed', pinky: 'Closed' },
    gapDifferentiator: 'Index & Middle Half-Bent Together',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.ringExtension > 35 || f.pinkyExtension > 35) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Closed',
        index: 'Bent',
        middle: 'Bent',
        ring: 'Closed',
        pinky: 'Closed',
      }, 28);
      return Math.min(0.96, base);
    },
  },
  {
    id: 16,
    pdfNumber: 16,
    emoji: '🤷',
    category: 'conversational_expressive',
    categoryName: 'Conversational & Expressive',
    sign: 'Shrugging Hands',
    outputText: 'UNSURE',
    poseDescription: 'Both palms open facing upward with elbows at ribs, questioning shrug (uncertainty/don’t know)',
    isDynamic: false,
    fingerStates: { thumb: 'Open', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
    gapDifferentiator: 'Palms Upward at Waist Level',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Open',
        middle: 'Open',
        ring: 'Open',
        pinky: 'Open',
      }, 30);
      if (hand.landmarks[0].y > 0.55 && hand.landmarks[8].y > 0.45) {
        return Math.min(0.95, base + 0.12);
      }
      return base * 0.8;
    },
  },
  {
    id: 17,
    pdfNumber: 17,
    emoji: '🤦',
    category: 'conversational_expressive',
    categoryName: 'Conversational & Expressive',
    sign: 'Facepalm (Cupped)',
    outputText: 'DISMAY',
    poseDescription: 'Curved hand (80% curved) placed over forehead and eyes (frustration/exasperation)',
    isDynamic: false,
    requiresFace: true,
    fingerStates: { thumb: 'Curved', index: 'Curved', middle: 'Curved', ring: 'Curved', pinky: 'Curved' },
    gapDifferentiator: 'Cupped Hand Over Eyes/Face',
    matchRule: (hand: HandData, _prev?: HandData[][], face?: FaceData | null) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Curved',
        index: 'Curved',
        middle: 'Curved',
        ring: 'Curved',
        pinky: 'Curved',
      }, 30);
      const isCovering = FaceTracker.isCoveringFace(hand, face || null);
      if (isCovering) {
        return Math.min(0.98, base + 0.20);
      }
      return hand.landmarks[9].y < 0.40 ? Math.min(0.90, base + 0.08) : base * 0.6;
    },
  },
  {
    id: 18,
    pdfNumber: 18,
    emoji: '🫰',
    category: 'conversational_expressive',
    categoryName: 'Conversational & Expressive',
    sign: 'Finger Heart (Crossed)',
    outputText: 'LOVE',
    poseDescription: 'Thumb and index fingers crossed at tips forming a miniature heart (K-pop heart/affection)',
    isDynamic: false,
    fingerStates: { thumb: 'Curved', index: 'Curved', middle: 'Closed', ring: 'Closed', pinky: 'Closed' },
    gapDifferentiator: 'Thumb & Index Crossed Tips',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.middleExtension > 35 || f.ringExtension > 35 || f.pinkyExtension > 35) return 0;
      if (f.thumbIndexDist < 0.28) {
        return 0.96;
      }
      return 0.6;
    },
  },
  {
    id: 19,
    pdfNumber: 19,
    emoji: '🫶',
    category: 'conversational_expressive',
    categoryName: 'Conversational & Expressive',
    sign: 'Two-Handed Heart',
    outputText: 'HEART',
    poseDescription: 'Two hands curved (50% bent) with index fingers meeting at top and thumbs meeting at bottom forming a complete heart silhouette',
    isDynamic: false,
    isTwoHand: true,
    fingerStates: { thumb: 'Bent', index: 'Bent', middle: 'Bent', ring: 'Bent', pinky: 'Bent' },
    gapDifferentiator: 'Thumb Tips Meet Bottom, Index Tips Meet Top',
    matchRule: (
      hand: HandData,
      _prev?: HandData[][],
      _face?: FaceData | null,
      _secondHand?: HandData | null,
      twoHandMetrics?: TwoHandMetrics | null
    ) => {
      if (twoHandMetrics && twoHandMetrics.isTwoHandedHeartPose) {
        return twoHandMetrics.confidenceScores['Two-Handed Heart'] || 0.98;
      }
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Bent',
        index: 'Bent',
        middle: 'Bent',
        ring: 'Bent',
        pinky: 'Bent',
      }, 30);
      return Math.min(0.90, base);
    },
  },
  {
    id: 20,
    pdfNumber: 20,
    emoji: '👍',
    category: 'conversational_expressive',
    categoryName: 'Conversational & Expressive',
    sign: 'Hitchhiking Thumb',
    outputText: 'RIDE',
    poseDescription: 'Fist with thumb extended horizontally pointing outward to side of road (requesting a ride)',
    isDynamic: false,
    fingerStates: { thumb: 'Open', index: 'Closed', middle: 'Closed', ring: 'Closed', pinky: 'Closed' },
    gapDifferentiator: 'Thumb Outstretched Sideways',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.indexExtension >= 45 || f.middleExtension >= 45 || f.ringExtension >= 40 || f.pinkyExtension >= 40) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Closed',
        middle: 'Closed',
        ring: 'Closed',
        pinky: 'Closed',
      }, 28);
      const isThumbSideways = Math.abs(hand.landmarks[4].x - hand.landmarks[2].x) > 0.10;
      return isThumbSideways ? Math.min(0.97, base + 0.14) : base * 0.7;
    },
  },

  // ==========================================
  // PAGE 3: AUDIBLE & RHYTHMIC (#21 - #25)
  // ==========================================
  {
    id: 21,
    pdfNumber: 21,
    emoji: '👏',
    category: 'audible_rhythmic',
    categoryName: 'Audible & Rhythmic',
    sign: 'Clapping',
    outputText: 'APPLAUSE',
    poseDescription: 'Both palms flat and open (100% open) clapping together in rhythmic collision (applause/cheering)',
    isDynamic: true,
    isTwoHand: true,
    fingerStates: { thumb: 'Open', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
    gapDifferentiator: 'Two Open Palms Contact',
    matchRule: (
      hand: HandData,
      _prev?: HandData[][],
      _face?: FaceData | null,
      _secondHand?: HandData | null,
      twoHandMetrics?: TwoHandMetrics | null
    ) => {
      if (twoHandMetrics && twoHandMetrics.isClapPose) {
        return twoHandMetrics.confidenceScores['Clapping'] || 0.98;
      }
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Open',
        middle: 'Open',
        ring: 'Open',
        pinky: 'Open',
      }, 26);
      return Math.min(0.90, base);
    },
  },
  {
    id: 22,
    pdfNumber: 22,
    emoji: '👏',
    category: 'audible_rhythmic',
    categoryName: 'Audible & Rhythmic',
    sign: 'Slow Clap',
    outputText: 'SARCASM',
    poseDescription: 'Deliberate, slow clapping of flat open palms (sarcastic appreciation/mockery)',
    isDynamic: true,
    isTwoHand: true,
    fingerStates: { thumb: 'Open', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
    gapDifferentiator: 'Two Open Palms Slow Contact',
    matchRule: (
      hand: HandData,
      _prev?: HandData[][],
      _face?: FaceData | null,
      _secondHand?: HandData | null,
      twoHandMetrics?: TwoHandMetrics | null
    ) => {
      if (twoHandMetrics && twoHandMetrics.isClapPose) {
        return Math.min(0.96, (twoHandMetrics.confidenceScores['Clapping'] || 0.95) - 0.02);
      }
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      return scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Open',
        middle: 'Open',
        ring: 'Open',
        pinky: 'Open',
      }, 28);
    },
  },
  {
    id: 23,
    pdfNumber: 23,
    emoji: '🫰',
    category: 'audible_rhythmic',
    categoryName: 'Audible & Rhythmic',
    sign: 'Snapping (Pre-snap tension)',
    outputText: 'RHYTHM',
    poseDescription: 'Thumb pressed with tension against middle finger pad, index curled (anticipation of finger snap)',
    isDynamic: false,
    fingerStates: { thumb: 'Bent', index: 'Closed', middle: 'Bent', ring: 'Closed', pinky: 'Closed' },
    gapDifferentiator: 'Thumb & Middle Pad Contact',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.thumbMiddleDist < 0.28 && f.ringExtension < 35 && f.pinkyExtension < 35) {
        return 0.95;
      }
      return 0.65;
    },
  },
  {
    id: 24,
    pdfNumber: 24,
    emoji: '🙏',
    category: 'audible_rhythmic',
    categoryName: 'Audible & Rhythmic',
    sign: 'Rubbing Palms Together',
    outputText: 'EAGER',
    poseDescription: 'Two flat open palms pressed together and sliding back and forth in rapid friction (eagerness/anticipation)',
    isDynamic: true,
    isTwoHand: true,
    fingerStates: { thumb: 'Open', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
    gapDifferentiator: 'Two Open Palms Sliding Friction',
    matchRule: (
      hand: HandData,
      _prev?: HandData[][],
      _face?: FaceData | null,
      _secondHand?: HandData | null,
      twoHandMetrics?: TwoHandMetrics | null
    ) => {
      if (twoHandMetrics && twoHandMetrics.isRubbingPalmsPose) {
        return twoHandMetrics.confidenceScores['Rubbing Palms Together'] || 0.97;
      }
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Open',
        middle: 'Open',
        ring: 'Open',
        pinky: 'Open',
      }, 28);
      return Math.min(0.90, base);
    },
  },
  {
    id: 25,
    pdfNumber: 25,
    emoji: '👇',
    category: 'audible_rhythmic',
    categoryName: 'Audible & Rhythmic',
    sign: 'Tapping Fingers (Drumming)',
    outputText: 'IMPATIENT',
    poseDescription: 'Four fingers bent sequentially drumming down on surface, thumb tucked (impatience/waiting)',
    isDynamic: true,
    fingerStates: { thumb: 'Closed', index: 'Bent', middle: 'Bent', ring: 'Bent', pinky: 'Bent' },
    gapDifferentiator: 'Bent Digits Facing Downward Tabletop',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Closed',
        index: 'Bent',
        middle: 'Bent',
        ring: 'Bent',
        pinky: 'Bent',
      }, 30);
      return f.isDownward ? Math.min(0.96, base + 0.12) : base;
    },
  },

  // ==========================================
  // PAGE 4: COMMANDS & DIRECTIONS (#26 - #35)
  // ==========================================
  {
    id: 26,
    pdfNumber: 26,
    emoji: '✋',
    category: 'commands_directions',
    categoryName: 'Commands & Directions',
    sign: 'Stop / Halt',
    outputText: 'STOP',
    poseDescription: 'Open palm facing directly forward toward viewer, fingers straight and vertical (stop/pause UI)',
    isDynamic: false,
    uiAction: 'stop',
    fingerStates: { thumb: 'Open', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
    gapDifferentiator: 'Forward Flat Palm, UI Stop Trigger',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Open',
        middle: 'Open',
        ring: 'Open',
        pinky: 'Open',
      }, 24);
      if (f.palmFacingCamera && !f.isDownward && hand.landmarks[8].y < hand.landmarks[0].y - 0.2) {
        return Math.min(0.98, base + 0.14);
      }
      return base;
    },
  },
  {
    id: 27,
    pdfNumber: 27,
    emoji: '🫴',
    category: 'commands_directions',
    categoryName: 'Commands & Directions',
    sign: 'Beckoning (Index only)',
    outputText: 'COME',
    poseDescription: 'Index finger curling in repeated hooking motion with palm upward, other fingers closed (come here)',
    isDynamic: true,
    fingerStates: { thumb: 'Closed', index: 'Bent', middle: 'Closed', ring: 'Closed', pinky: 'Closed' },
    gapDifferentiator: 'Index Hooking Motion, Others Curled',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.middleExtension > 35 || f.ringExtension > 35 || f.pinkyExtension > 35) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Closed',
        index: 'Bent',
        middle: 'Closed',
        ring: 'Closed',
        pinky: 'Closed',
      }, 26);
      return Math.min(0.96, base + 0.1);
    },
  },
  {
    id: 28,
    pdfNumber: 28,
    emoji: '🫱',
    category: 'commands_directions',
    categoryName: 'Commands & Directions',
    sign: 'Shoo / Go Away (Flicking)',
    outputText: 'LEAVE',
    poseDescription: 'Back of hand facing viewer, fingers flicking repeatedly outward away from body (go away/shoo)',
    isDynamic: true,
    fingerStates: { thumb: 'Open', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
    gapDifferentiator: 'Dorsal Hand Flicking Away',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Open',
        middle: 'Open',
        ring: 'Open',
        pinky: 'Open',
      }, 28);
      return !f.palmFacingCamera ? Math.min(0.96, base + 0.12) : base * 0.8;
    },
  },
  {
    id: 29,
    pdfNumber: 29,
    emoji: '🤫',
    category: 'commands_directions',
    categoryName: 'Commands & Directions',
    sign: 'Shush',
    outputText: 'QUIET',
    poseDescription: 'Vertical index finger held directly touching or in front of lips, other fingers curled into palm (be quiet/silence)',
    isDynamic: false,
    requiresFace: true,
    fingerStates: { thumb: 'Closed', index: 'Open', middle: 'Closed', ring: 'Closed', pinky: 'Closed' },
    gapDifferentiator: 'Vertical Index at Lips/Mouth',
    matchRule: (hand: HandData, _prev?: HandData[][], face?: FaceData | null) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.indexExtension < 65 || f.middleExtension > 35 || f.ringExtension > 35 || f.pinkyExtension > 35) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Closed',
        index: 'Open',
        middle: 'Closed',
        ring: 'Closed',
        pinky: 'Closed',
      }, 26);
      const isMouthAligned = FaceTracker.isNearMouth(hand, face || null);
      if (isMouthAligned) {
        return Math.min(0.98, base + 0.20);
      }
      return hand.landmarks[8].y < 0.50 ? Math.min(0.88, base + 0.06) : base * 0.6;
    },
  },
  {
    id: 30,
    pdfNumber: 30,
    emoji: '⏸️',
    category: 'commands_directions',
    categoryName: 'Commands & Directions',
    sign: 'Time Out',
    outputText: 'PAUSE',
    poseDescription: 'One hand flat horizontal, second hand flat vertical meeting perpendicular in a T-shape (time out)',
    isDynamic: false,
    uiAction: 'repeat',
    fingerStates: { thumb: 'Open', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
    gapDifferentiator: 'Perpendicular T-Shape Hands',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Open',
        middle: 'Open',
        ring: 'Open',
        pinky: 'Open',
      }, 28);
      return f.isSideways ? Math.min(0.95, base + 0.1) : base;
    },
  },
  {
    id: 31,
    pdfNumber: 31,
    emoji: '🙋',
    category: 'commands_directions',
    categoryName: 'Commands & Directions',
    sign: 'Raised Hand',
    outputText: 'ATTENTION',
    poseDescription: 'Arm extended high above head with flat open palm facing front (asking question/volunteering)',
    isDynamic: false,
    fingerStates: { thumb: 'Open', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
    gapDifferentiator: 'Arm Extended High Above Head',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Open',
        middle: 'Open',
        ring: 'Open',
        pinky: 'Open',
      }, 24);
      if (hand.landmarks[0].y < 0.30) {
        return Math.min(0.98, base + 0.18);
      }
      return base * 0.7;
    },
  },
  {
    id: 32,
    pdfNumber: 32,
    emoji: '🫳',
    category: 'commands_directions',
    categoryName: 'Commands & Directions',
    sign: 'Calm Down',
    outputText: 'RELAX',
    poseDescription: 'Both flat open palms facing downward gently pressing down toward floor (soothing/calming)',
    isDynamic: true,
    uiAction: 'slow',
    fingerStates: { thumb: 'Open', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
    gapDifferentiator: 'Flat Palms Pushing Downward',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Open',
        middle: 'Open',
        ring: 'Open',
        pinky: 'Open',
      }, 28);
      return f.isDownward ? Math.min(0.97, base + 0.15) : base * 0.75;
    },
  },
  {
    id: 33,
    pdfNumber: 33,
    emoji: '🧍',
    category: 'commands_directions',
    categoryName: 'Commands & Directions',
    sign: 'Stand Up',
    outputText: 'STAND',
    poseDescription: 'Open flat palms facing upward sweeping upward toward ceiling (asking group to rise)',
    isDynamic: true,
    fingerStates: { thumb: 'Open', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
    gapDifferentiator: 'Open Palms Sweeping Upward',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Open',
        middle: 'Open',
        ring: 'Open',
        pinky: 'Open',
      }, 28);
      if (hand.landmarks[8].y < hand.landmarks[0].y && !f.isDownward) {
        return Math.min(0.96, base + 0.1);
      }
      return base;
    },
  },
  {
    id: 34,
    pdfNumber: 34,
    emoji: '🪑',
    category: 'commands_directions',
    categoryName: 'Commands & Directions',
    sign: 'Sit Down',
    outputText: 'SIT',
    poseDescription: 'Open flat palms facing downward pressing down to seat level (asking group to be seated)',
    isDynamic: true,
    fingerStates: { thumb: 'Open', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
    gapDifferentiator: 'Open Palms Lowering to Seat Level',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Open',
        middle: 'Open',
        ring: 'Open',
        pinky: 'Open',
      }, 28);
      return f.isDownward && hand.landmarks[0].y > 0.45 ? Math.min(0.97, base + 0.14) : base * 0.75;
    },
  },
  {
    id: 35,
    pdfNumber: 35,
    emoji: '🫱',
    category: 'commands_directions',
    categoryName: 'Commands & Directions',
    sign: 'Follow Me (Sweeping palm)',
    outputText: 'FOLLOW',
    poseDescription: 'Open palm sweeping backward toward own chest or shoulder (beckoning group to follow)',
    isDynamic: true,
    fingerStates: { thumb: 'Open', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
    gapDifferentiator: 'Sweeping Motion Toward Shoulder',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Open',
        middle: 'Open',
        ring: 'Open',
        pinky: 'Open',
      }, 30);
      return f.isSideways ? Math.min(0.95, base + 0.1) : base;
    },
  },

  // ==========================================
  // PAGE 5: WARNINGS & NEGATIVE GESTURES (#36 - #45)
  // ==========================================
  {
    id: 36,
    pdfNumber: 36,
    emoji: '🛑',
    category: 'warnings_negative',
    categoryName: 'Warnings & Negative',
    sign: 'Talk to the Hand',
    outputText: 'DISMISS',
    poseDescription: 'Flat palm thrust aggressively forward toward person with head turned away (dismissal/refusal to listen)',
    isDynamic: false,
    fingerStates: { thumb: 'Open', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
    gapDifferentiator: 'Thrust Forward Flat Palm',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Open',
        middle: 'Open',
        ring: 'Open',
        pinky: 'Open',
      }, 24);
      if (f.palmFacingCamera && hand.landmarks[0].y < 0.50) {
        return Math.min(0.97, base + 0.12);
      }
      return base;
    },
  },
  {
    id: 37,
    pdfNumber: 37,
    emoji: '🖕',
    category: 'warnings_negative',
    categoryName: 'Warnings & Negative',
    sign: 'Middle Finger',
    outputText: 'INSULT',
    poseDescription: 'Middle finger extended fully straight (100%), index, ring, pinky, and thumb curled into fist (offensive insult)',
    isDynamic: false,
    fingerStates: { thumb: 'Closed', index: 'Closed', middle: 'Open', ring: 'Closed', pinky: 'Closed' },
    gapDifferentiator: 'Middle Digit Isolated Extended, Ring & Index Curled',
    matchRule: (
      hand: HandData,
      _prev?: HandData[][],
      _face?: FaceData | null,
      _second?: HandData | null,
      _two?: TwoHandMetrics | null,
      gapMetrics?: FingerGapMetrics | null
    ) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      // Index, Ring, Pinky MUST be closed!
      if (f.indexExtension > 35 || f.ringExtension > 35 || f.pinkyExtension > 35) return 0;
      // Middle finger MUST be extended!
      if (f.middleExtension < 65) return 0;
      if (gapMetrics && (gapMetrics.isOkPinch || gapMetrics.isVulcanSplit || gapMetrics.isPeaceSplit)) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Closed',
        index: 'Closed',
        middle: 'Open',
        ring: 'Closed',
        pinky: 'Closed',
      }, 24);
      return Math.min(0.98, base + 0.18);
    },
  },
  {
    id: 38,
    pdfNumber: 38,
    emoji: '🔪',
    category: 'warnings_negative',
    categoryName: 'Warnings & Negative',
    sign: 'Throat Slit (Index)',
    outputText: 'TERMINATE',
    poseDescription: 'Index finger extended slicing horizontally across the throat/neck below chin (stop now/threat/cut)',
    isDynamic: true,
    requiresFace: true,
    fingerStates: { thumb: 'Closed', index: 'Open', middle: 'Closed', ring: 'Closed', pinky: 'Closed' },
    gapDifferentiator: 'Horizontal Index Swiping Neck Below Chin',
    matchRule: (hand: HandData, _prev?: HandData[][], face?: FaceData | null) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.indexExtension < 60 || f.middleExtension > 35 || f.ringExtension > 35 || f.pinkyExtension > 35) return 0;
      const isNeckAligned = FaceTracker.isNearThroat(hand, face || null);
      if (isNeckAligned && f.isSideways) {
        return 0.98;
      }
      return f.isSideways ? 0.82 : 0.5;
    },
  },
  {
    id: 39,
    pdfNumber: 39,
    emoji: '🇱',
    category: 'warnings_negative',
    categoryName: 'Warnings & Negative',
    sign: 'Loser Sign',
    outputText: 'LOSER',
    poseDescription: 'Index finger straight up and thumb perpendicular horizontal forming an L shape placed directly against forehead (loser)',
    isDynamic: false,
    requiresFace: true,
    fingerStates: { thumb: 'Open', index: 'Open', middle: 'Closed', ring: 'Closed', pinky: 'Closed' },
    gapDifferentiator: 'L-Shape Held at Forehead',
    matchRule: (hand: HandData, _prev?: HandData[][], face?: FaceData | null) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.indexExtension < 65 || f.thumbExtension < 60 || f.middleExtension > 35 || f.ringExtension > 35 || f.pinkyExtension > 35) return 0;
      const isForeheadAligned = FaceTracker.isNearForehead(hand, face || null);
      if (isForeheadAligned) {
        return 0.98;
      }
      return hand.landmarks[0].y < 0.42 ? 0.88 : 0.6;
    },
  },
  {
    id: 40,
    pdfNumber: 40,
    emoji: '☝️',
    category: 'warnings_negative',
    categoryName: 'Warnings & Negative',
    sign: 'Finger Wag',
    outputText: 'WARN',
    poseDescription: 'Extended index finger pointing upright wagging left and right repeatedly (scolding/warning/no)',
    isDynamic: true,
    fingerStates: { thumb: 'Closed', index: 'Open', middle: 'Closed', ring: 'Closed', pinky: 'Closed' },
    gapDifferentiator: 'Upright Index Wagging Side-to-Side',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.indexExtension < 65 || f.middleExtension > 35 || f.ringExtension > 35 || f.pinkyExtension > 35) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Closed',
        index: 'Open',
        middle: 'Closed',
        ring: 'Closed',
        pinky: 'Closed',
      }, 26);
      return Math.min(0.97, base + 0.12);
    },
  },
  {
    id: 41,
    pdfNumber: 41,
    emoji: '✊',
    category: 'warnings_negative',
    categoryName: 'Warnings & Negative',
    sign: 'Fist Shake',
    outputText: 'ANGER',
    poseDescription: 'Closed fist raised in air shaking with anger/menace (fury/threat)',
    isDynamic: true,
    fingerStates: { thumb: 'Closed', index: 'Closed', middle: 'Closed', ring: 'Closed', pinky: 'Closed' },
    gapDifferentiator: 'Closed Fist Shaking Menacingly',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.indexExtension > 35 || f.middleExtension > 35 || f.ringExtension > 35 || f.pinkyExtension > 35) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Closed',
        index: 'Closed',
        middle: 'Closed',
        ring: 'Closed',
        pinky: 'Closed',
      }, 25);
      return hand.landmarks[0].y < 0.45 ? Math.min(0.97, base + 0.12) : base;
    },
  },
  {
    id: 42,
    pdfNumber: 42,
    emoji: '🫢',
    category: 'warnings_negative',
    categoryName: 'Warnings & Negative',
    sign: 'Hand Over Mouth (Cupped)',
    outputText: 'SHOCK',
    poseDescription: 'Cupped hand (80% curved) placed directly over lips and mouth in surprise or horror (shock/gasps)',
    isDynamic: false,
    requiresFace: true,
    fingerStates: { thumb: 'Curved', index: 'Curved', middle: 'Curved', ring: 'Curved', pinky: 'Curved' },
    gapDifferentiator: 'Cupped Hand Directly Over Lips/Mouth',
    matchRule: (hand: HandData, _prev?: HandData[][], face?: FaceData | null) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Curved',
        index: 'Curved',
        middle: 'Curved',
        ring: 'Curved',
        pinky: 'Curved',
      }, 30);
      const isMouthAligned = FaceTracker.isNearMouth(hand, face || null);
      if (isMouthAligned) {
        return Math.min(0.98, base + 0.20);
      }
      return hand.landmarks[8].y < 0.50 ? Math.min(0.88, base + 0.08) : base * 0.6;
    },
  },
  {
    id: 43,
    pdfNumber: 43,
    emoji: '👉',
    category: 'warnings_negative',
    categoryName: 'Warnings & Negative',
    sign: 'Finger Gun',
    outputText: 'AIM',
    poseDescription: 'Index extended forward horizontal as barrel, thumb vertical as hammer, other fingers curled (finger pistol)',
    isDynamic: false,
    fingerStates: { thumb: 'Open', index: 'Open', middle: 'Closed', ring: 'Closed', pinky: 'Closed' },
    gapDifferentiator: 'Thumb Upright (Hammer) + Index Forward',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.indexExtension < 65 || f.thumbExtension < 60 || f.middleExtension > 35 || f.ringExtension > 35 || f.pinkyExtension > 35) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Open',
        middle: 'Closed',
        ring: 'Closed',
        pinky: 'Closed',
      }, 26);
      return f.isSideways ? Math.min(0.98, base + 0.16) : base;
    },
  },
  {
    id: 44,
    pdfNumber: 44,
    emoji: '🤐',
    category: 'warnings_negative',
    categoryName: 'Warnings & Negative',
    sign: 'Zipping Lips (Pinching)',
    outputText: 'SECRET',
    poseDescription: 'Thumb and index pinching (50% bent) moving horizontally across lips like pulling a zipper (promise of secrecy)',
    isDynamic: true,
    requiresFace: true,
    fingerStates: { thumb: 'Bent', index: 'Bent', middle: 'Closed', ring: 'Closed', pinky: 'Closed' },
    gapDifferentiator: 'Pinched Fingers Across Lips/Mouth',
    matchRule: (hand: HandData, _prev?: HandData[][], face?: FaceData | null) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.middleExtension > 35 || f.ringExtension > 35 || f.pinkyExtension > 35) return 0;
      const isMouthAligned = FaceTracker.isNearMouth(hand, face || null);
      if (isMouthAligned && f.thumbIndexDist < 0.32) {
        return 0.98;
      }
      return f.thumbIndexDist < 0.32 ? 0.85 : 0.5;
    },
  },
  {
    id: 45,
    pdfNumber: 45,
    emoji: '🙅',
    category: 'warnings_negative',
    categoryName: 'Warnings & Negative',
    sign: 'Crossed Wrists (Fists)',
    outputText: 'DENIED',
    poseDescription: 'Two wrists crossed over each other with closed fists forming an X in front of chest (defiance/denial/forbidden)',
    isDynamic: false,
    isTwoHand: true,
    fingerStates: { thumb: 'Closed', index: 'Closed', middle: 'Closed', ring: 'Closed', pinky: 'Closed' },
    gapDifferentiator: 'Two Crossed Wrists with Fists',
    matchRule: (
      hand: HandData,
      _prev?: HandData[][],
      _face?: FaceData | null,
      _secondHand?: HandData | null,
      twoHandMetrics?: TwoHandMetrics | null
    ) => {
      if (twoHandMetrics && twoHandMetrics.isCrossedWristsPose) {
        return twoHandMetrics.confidenceScores['Crossed Wrists (Fists)'] || 0.98;
      }
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.indexExtension > 35 || f.middleExtension > 35 || f.ringExtension > 35 || f.pinkyExtension > 35) return 0;
      return scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Closed',
        index: 'Closed',
        middle: 'Closed',
        ring: 'Closed',
        pinky: 'Closed',
      }, 25);
    },
  },

  // ==========================================
  // PAGE 6: TACTICAL & SYMBOLIC (#46 - #50)
  // ==========================================
  {
    id: 46,
    pdfNumber: 46,
    emoji: '🖖',
    category: 'tactical_symbolic',
    categoryName: 'Tactical & Symbolic',
    sign: 'Vulcan Salute',
    outputText: 'PROSPER',
    poseDescription: 'Index & middle paired together, ring & pinky paired together, with wide split between middle and ring fingers (live long and prosper)',
    isDynamic: false,
    fingerStates: { thumb: 'Open', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
    gapDifferentiator: 'Vulcan Split: Middle-Ring Gap > 40%',
    matchRule: (
      hand: HandData,
      _prev?: HandData[][],
      _face?: FaceData | null,
      _second?: HandData | null,
      _two?: TwoHandMetrics | null,
      gapMetrics?: FingerGapMetrics | null
    ) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.indexExtension < 60 || f.middleExtension < 60 || f.ringExtension < 60 || f.pinkyExtension < 60) return 0;
      if (gapMetrics && gapMetrics.isVulcanSplit) {
        return 0.98;
      }
      if (f.middleRingDist > 0.35 && f.indexMiddleDist < 0.25 && f.ringPinkyDist < 0.25) {
        return 0.96;
      }
      return 0.70;
    },
  },
  {
    id: 47,
    pdfNumber: 47,
    emoji: '🤘',
    category: 'tactical_symbolic',
    categoryName: 'Tactical & Symbolic',
    sign: 'Rock On / Horns',
    outputText: 'ROCK',
    poseDescription: 'Index and pinky fingers straight upright (100% open); middle and ring fingers curled under thumb (rock music/heavy metal horns)',
    isDynamic: false,
    fingerStates: { thumb: 'Closed', index: 'Open', middle: 'Closed', ring: 'Closed', pinky: 'Open' },
    gapDifferentiator: 'Index & Pinky Spread, Middle & Ring Curled',
    matchRule: (
      hand: HandData,
      _prev?: HandData[][],
      _face?: FaceData | null,
      _second?: HandData | null,
      _two?: TwoHandMetrics | null,
      gapMetrics?: FingerGapMetrics | null
    ) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.indexExtension < 65 || f.pinkyExtension < 65 || f.middleExtension > 35 || f.ringExtension > 35) return 0;
      if (gapMetrics && gapMetrics.isHornsSplit) {
        return 0.98;
      }
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Closed',
        index: 'Open',
        middle: 'Closed',
        ring: 'Closed',
        pinky: 'Open',
      }, 26);
      return Math.min(0.97, base + 0.15);
    },
  },
  {
    id: 48,
    pdfNumber: 48,
    emoji: '🤏',
    category: 'tactical_symbolic',
    categoryName: 'Tactical & Symbolic',
    sign: 'Pinching',
    outputText: 'LITTLE',
    poseDescription: 'Thumb and index finger bent close together (50% bent) with small gap, other fingers curled into palm (small amount/tiny bit)',
    isDynamic: false,
    fingerStates: { thumb: 'Bent', index: 'Bent', middle: 'Closed', ring: 'Closed', pinky: 'Closed' },
    gapDifferentiator: 'Thumb-Index Tip Pinch < 28%',
    matchRule: (
      hand: HandData,
      _prev?: HandData[][],
      _face?: FaceData | null,
      _second?: HandData | null,
      _two?: TwoHandMetrics | null,
      gapMetrics?: FingerGapMetrics | null
    ) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.middleExtension > 35 || f.ringExtension > 35 || f.pinkyExtension > 35) return 0;
      if (gapMetrics && gapMetrics.isPinching) {
        return 0.97;
      }
      if (f.thumbIndexDist < 0.28) {
        return 0.94;
      }
      return 0.65;
    },
  },
  {
    id: 49,
    pdfNumber: 49,
    emoji: '🫰',
    category: 'tactical_symbolic',
    categoryName: 'Tactical & Symbolic',
    sign: 'Money Rub',
    outputText: 'MONEY',
    poseDescription: 'Thumb rubbing across pads of index and middle fingers in repeated friction (money/wealth/cost)',
    isDynamic: true,
    fingerStates: { thumb: 'Bent', index: 'Bent', middle: 'Bent', ring: 'Closed', pinky: 'Closed' },
    gapDifferentiator: 'Thumb-Index-Middle Rubbing Cluster',
    matchRule: (
      hand: HandData,
      _prev?: HandData[][],
      _face?: FaceData | null,
      _second?: HandData | null,
      _two?: TwoHandMetrics | null,
      gapMetrics?: FingerGapMetrics | null
    ) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      if (f.ringExtension > 35 || f.pinkyExtension > 35) return 0;
      if (gapMetrics && gapMetrics.isMoneyRub) {
        return 0.97;
      }
      if (f.thumbIndexDist < 0.32 && f.thumbMiddleDist < 0.32) {
        return 0.94;
      }
      return 0.65;
    },
  },
  {
    id: 50,
    pdfNumber: 50,
    emoji: '🎤',
    category: 'tactical_symbolic',
    categoryName: 'Tactical & Symbolic',
    sign: 'Mic Drop (Releasing)',
    outputText: 'DONE',
    poseDescription: 'Hand held elevated with all five fingers suddenly releasing and flaring open downward as if dropping microphone (triumph/complete)',
    isDynamic: true,
    fingerStates: { thumb: 'Open', index: 'Open', middle: 'Open', ring: 'Open', pinky: 'Open' },
    gapDifferentiator: 'Hand Elevated, Digits Flaring Downward',
    matchRule: (hand: HandData) => {
      const f = extractHandFeatures(hand.landmarks);
      if (!f) return 0;
      const base = scorePhysicalStatePose(f.biomechanics, {
        thumb: 'Open',
        index: 'Open',
        middle: 'Open',
        ring: 'Open',
        pinky: 'Open',
      }, 28);
      return f.isDownward && hand.landmarks[0].y < 0.45 ? Math.min(0.97, base + 0.15) : base;
    },
  },
];
